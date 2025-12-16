const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const authenticateToken = require('../middleware/auth');

// Middleware to allow admin or accounts team (copied from userRoutes)
const allowAccountsOrAdmin = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'accounts team') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Accounts team or admin only.' });
};
const Party = require('../models/Party');
const Item = require('../models/Item');
const Mapping = require('../models/Mapping');
const Counter = require('../models/Counter');

// Middleware to allow admin or accounts team (copied from userRoutes)
// Ensuring it's available for use in routes
const secureAdminOrAccounts = [authenticateToken, allowAccountsOrAdmin];


// Get order statistics for flow dashboard
router.get('/stats/flow', async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { status: { $ne: 'Deleted' } } }, // Exclude deleted orders
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Ensure all stages return 0 if no orders exist
    const stages = ['New', 'Verified', 'Manufacturing', 'Quality_Check', 'Documentation', 'Dispatch', 'Completed'];
    const result = {};
    stages.forEach(stage => result[stage] = 0);

    stats.forEach(stat => {
      if (result.hasOwnProperty(stat._id)) {
        result[stat._id] = stat.count;
      }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order statistics summary
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const summary = {
      queue: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };

    stats.forEach(stat => {
      summary[stat._id] = stat.count;
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Order Tree (Grouped by Customer -> PO -> Items)
router.get('/tree', async (req, res) => {
  try {
    const { customerName, search } = req.query;
    const searchTerm = customerName || search; // Support both parameters

    // Build match query - exclude deleted orders from tree
    let matchStage = { status: { $ne: 'Deleted' } };

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'parties',
          localField: 'party',
          foreignField: '_id',
          as: 'partyDetails'
        }
      },
      { $unwind: '$partyDetails' },
      // Filter by customer name if provided
      ...(searchTerm ? [{ $match: { 'partyDetails.name': { $regex: searchTerm, $options: 'i' } } }] : []),
      {
        $group: {
          _id: '$partyDetails._id',
          customerName: { $first: '$partyDetails.name' },
          orders: {
            $push: {
              _id: '$_id',
              poNumber: '$poNumber',
              poDate: '$poDate',
              status: '$status',
              totalAmount: '$totalAmount',
              items: '$items',
              statusHistory: '$statusHistory'
            }
          }
        }
      },
      { $sort: { customerName: 1 } }
    ];

    const treeData = await Order.aggregate(pipeline);
    res.json(treeData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders (Admin / Accounts only)
router.get('/', authenticateToken, allowAccountsOrAdmin, async (req, res) => {
  try {
    const { status, partyId, search } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (partyId) {
      filter.party = partyId;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ orderNumber: regex }, { poNumber: regex }];
    }

    const orders = await Order.find(filter)
      .populate('party', 'name phone')
      .populate('items.item', 'name')
      .sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get assigned orders formatted for Dashboard (Employee View)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * limit;

    const { status, priority, range } = req.query;

    // Base filter: Find all non-deleted orders
    const filter = {
      status: { $ne: 'Deleted' }
    };

    if (status) filter.status = status;
    // Priority now applies to items. Support filtering orders that contain
    // items with a given priority value.
    if (priority) filter['items.priority'] = priority;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Range Filter Logic
    if (range) {
      if (range === 'today') {
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        filter.deadline = { $gte: startOfDay, $lt: endOfDay };
      } else if (range === 'week') {
        const nextWeek = new Date(startOfDay);
        nextWeek.setDate(nextWeek.getDate() + 7);
        filter.deadline = { $gte: startOfDay, $lte: nextWeek };
      } else if (range === 'last30') {
        // "Last 30 days" usually implies looking back at created orders
        const thirtyDaysAgo = new Date(startOfDay);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.orderDate = { $gte: thirtyDaysAgo };
      }
    }

    // 1. Fetch matching orders
    const allMatches = await Order.find(filter)
      .populate('party', 'name')
      .populate('items.item', 'name')
      .populate('items.assignedTo', 'name employeeId')
      .populate('assignedAccountEmployee', 'name employeeId')
      .limit(500);

    // 2. Compute Overdue & Map
    const priorityWeight = { 'High': 3, 'Urgent': 3, 'Normal': 2, 'Low': 1 };

    const mappedOrders = allMatches.map(o => {
      const deadline = o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate) : null;
      const startDate = o.poDate ? new Date(o.poDate) : null;
      const isOverdue = deadline && deadline < now && o.status !== 'Completed';

      // Filter items to only show those assigned to current employee
      const userItems = o.items.filter(item => {
        if (!item.assignedTo) return false;
        const assignedToId = item.assignedTo._id ? item.assignedTo._id.toString() : item.assignedTo.toString();
        return assignedToId === req.user.id;
      });

      // Calculate total for user's items only
      const userTotal = userItems.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Derive order-level priority from items (High if any item is High)
      const derivedPriority = (userItems || []).some(it => (it.priority || '').toLowerCase() === 'high') ? 'High' : (o.priority || 'Normal');

      return {
        id: o._id,
        po_number: o.poNumber,
        customer_name: o.party?.name || 'Unknown',
        startDate: startDate,
        deadline: deadline,
        priority: derivedPriority,
        amount: userTotal,
        totalAmount: o.totalAmount,
        items: userItems,
        status: o.status,
        overdue: isOverdue,
        assignedTo: o.assignedAccountEmployee,
        _rawDeadline: deadline ? deadline.getTime() : Number.MAX_SAFE_INTEGER,
        _priorityVal: priorityWeight[derivedPriority] || 0
      };
    });

    // Filter out orders with no items assigned to this employee
    const ordersWithItems = mappedOrders.filter(o => o.items.length > 0);

    // 3. Sort: Overdue (desc) -> Priority (desc) -> Deadline (asc)
    ordersWithItems.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a._priorityVal !== b._priorityVal) return b._priorityVal - a._priorityVal;
      return a._rawDeadline - b._rawDeadline;
    });

    // 4. Paginate
    const total = ordersWithItems.length;
    const paginatedOrders = ordersWithItems.slice(skip, skip + limit);

    // Clean internal sort keys
    const finalOrders = paginatedOrders.map(({ _rawDeadline, _priorityVal, ...rest }) => rest);

    res.json({
      total,
      page,
      per_page: limit,
      orders: finalOrders
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order - Secured
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('party')
      .populate('items.item');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Security Check: Access Control
    const isOwner =
      (order.assignedAccountEmployee && order.assignedAccountEmployee.toString() === req.user.id) ||
      (order.accountsEmployee && order.accountsEmployee.toString() === req.user.id);

    const isAdminOrAccounts = ['admin', 'accounts team'].includes(req.user.role);

    if (!isOwner && !isAdminOrAccounts) {
      return res.status(403).json({ message: 'Access denied. You do not have permission to view this order.' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    // Add initial status history entry
    const orderData = {
      ...req.body,
      statusHistory: [{
        status: req.body.status || 'New',
        note: 'Order Created',
        timestamp: new Date()
      }]
    };

    // Ensure each item has a priority field (default to Normal) for backward compatibility
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items = orderData.items.map(i => ({ ...i, priority: i.priority || 'Normal' }));
    }

    const order = new Order(orderData);
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Track status changes in history
    if (req.body.status && req.body.status !== order.status) {
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: req.body.status,
        note: req.body.statusNote || 'Status updated',
        timestamp: new Date()
      });
    }

    // Update status dates (for backward compatibility)
    if (req.body.status === 'in_progress' && order.status !== 'in_progress') {
      req.body.startedDate = new Date();
    }
    if (req.body.status === 'completed' && order.status !== 'completed') {
      req.body.completedDate = new Date();
    }

    Object.assign(order, req.body);
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order status (PATCH) - With status history tracking
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;

    // Enforce single-step transitions: only allow moving to the immediate next stage
    const validStatuses = [
      'New', 'Verified', 'Manufacturing', 'Quality_Check',
      'Documentation', 'Dispatch', 'Completed', 'Deleted'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const idx = validStatuses.indexOf(order.status);
    const nextIdx = idx >= 0 && idx < validStatuses.length - 2 ? idx + 1 : null; // -2 to ignore Completed/Deleted as next
    const allowedNext = nextIdx !== null ? validStatuses[nextIdx] : null;

    if (!allowedNext) {
      return res.status(400).json({ message: `Order in '${order.status}' cannot be advanced further` });
    }

    if (status !== allowedNext) {
      return res.status(400).json({ message: `Invalid transition. Next allowed status is '${allowedNext}'` });
    }

    order.status = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status, note: note || `Moved to ${status}`, timestamp: new Date() });

    await order.save();
    const populated = await Order.findById(order._id).populate('party', 'name phone').populate('items.item', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign order to employee (accounts team or admin)
// Assign order to employee with item-level job numbers
router.patch('/:id/assign', authenticateToken, allowAccountsOrAdmin, async (req, res) => {
  try {
    const { employeeId, items } = req.body; // items: [{ itemId, jobNumber }]
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items with job numbers are required' });
    }

    // Uniqueness Check First
    const jobNumbers = items.map(i => i.jobNumber);
    const existingMappings = await Mapping.find({ jobNumber: { $in: jobNumbers } });
    if (existingMappings.length > 0) {
      const duplicates = existingMappings.map(m => m.jobNumber).join(', ');
      return res.status(409).json({ message: `Duplicate Job Numbers found: ${duplicates}. Please regenerate.` });
    }

    // Find the order
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Update order-level assignment
    order.assignedAccountEmployee = employeeId;

    // Process Item Assignments
    for (const assignment of items) {
      const { itemId, jobNumber } = assignment;

      // Find item in order (using _id comparison)
      const orderItem = order.items.find(i => i._id.toString() === itemId || i.item.toString() === itemId);

      if (orderItem) {
        orderItem.assignedTo = employeeId;

        // Upsert Mapping (or create new)
        // We check for existing mapping for this specific item assignment to avoid duplicates if re-assigned
        // CRITICAL FIX: Use orderItem._id (Subdocument ID) instead of orderItem.item (Product ID)
        // to support distinct job numbers for multiple lines of the same product.
        await Mapping.findOneAndUpdate(
          { orderId: order._id, itemId: orderItem._id }, // Search by unique line item ID
          {
            assignedEmployeeId: employeeId,
            jobNumber: jobNumber
          },
          { upsert: true, new: true }
        );
      }
    }

    await order.save();

    // Populate and return
    const updatedOrder = await Order.findById(req.params.id)
      .populate('party', 'name phone')
      .populate('items.item', 'name')
      .populate('items.assignedTo', 'name employeeId')
      .populate('assignedAccountEmployee', 'name employeeId');

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assign items to employees (accounts team or admin)
router.patch('/:id/assign-items', authenticateToken, allowAccountsOrAdmin, async (req, res) => {
  try {
    const { itemAssignments } = req.body; // Array of { itemIndex, employeeId }
    if (!itemAssignments || !Array.isArray(itemAssignments)) {
      return res.status(400).json({ message: 'itemAssignments array required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Update each item's assignedTo field and create Mapping
    for (const assignment of itemAssignments) {
      const { itemIndex, employeeId } = assignment;

      if (itemIndex >= 0 && itemIndex < order.items.length) {
        order.items[itemIndex].assignedTo = employeeId || null;

        // Only create mapping if assigning to an employee (not unassigning)
        if (employeeId) {
          // Generate Job Number
          const counter = await Counter.findOneAndUpdate(
            { name: 'jobNumber' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
          );
          const jobNumber = `EJB-${String(counter.seq).padStart(5, '0')}`;

          await Mapping.create({
            orderId: order._id,
            itemId: order.items[itemIndex].item,
            assignedEmployeeId: employeeId,
            jobNumber: jobNumber
          });
        }
      }
    }

    await order.save();

    const updatedOrder = await Order.findById(req.params.id)
      .populate('party', 'name phone')
      .populate('items.item', 'name')
      .populate('items.assignedTo', 'name employeeId');

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update item completion status
router.patch('/:id/item-completion', authenticateToken, async (req, res) => {
  try {
    const { itemIndex, completed } = req.body;
    if (itemIndex === undefined || completed === undefined) {
      return res.status(400).json({ message: 'itemIndex and completed required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (itemIndex < 0 || itemIndex >= order.items.length) {
      return res.status(400).json({ message: 'Invalid item index' });
    }

    order.items[itemIndex].completed = completed;
    await order.save();

    res.json({ message: 'Item completion status updated', item: order.items[itemIndex] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    await order.deleteOne();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;