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
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * limit;

    const { status, priority, range } = req.query;

    // Base filter: Assigned to current user
    const filter = {
      $or: [
        { assignedAccountEmployee: req.user.id },
        { accountsEmployee: req.user.id }
      ],
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
      .limit(500);

    // 2. Compute Overdue & Map
    const priorityWeight = { 'High': 3, 'Urgent': 3, 'Normal': 2, 'Low': 1 };

    const mappedOrders = allMatches.map(o => {
      const deadline = o.deadline ? new Date(o.deadline) : null;
      const isOverdue = deadline && deadline < now && o.status !== 'Completed';

      // Derive order-level priority from items (High if any item is High)
      const derivedPriority = (o.items || []).some(it => (it.priority || '').toLowerCase() === 'high') ? 'High' : (o.priority || 'Normal');

      return {
        id: o._id,
        po_number: o.poNumber,
        customer_name: o.party?.name || 'Unknown',
        deadline: o.deadline,
        priority: derivedPriority,
        amount: o.totalAmount,
        items: o.items,
        status: o.status,
        overdue: isOverdue,
        _rawDeadline: deadline ? deadline.getTime() : Number.MAX_SAFE_INTEGER,
        _priorityVal: priorityWeight[derivedPriority] || 0
      };
    });

    // 3. Sort: Overdue (desc) -> Priority (desc) -> Deadline (asc)
    mappedOrders.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a._priorityVal !== b._priorityVal) return b._priorityVal - a._priorityVal;
      return a._rawDeadline - b._rawDeadline;
    });

    // 4. Paginate
    const total = mappedOrders.length;
    const paginatedOrders = mappedOrders.slice(skip, skip + limit);

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
router.patch('/:id/assign', authenticateToken, allowAccountsOrAdmin, async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: 'employeeId required' });
    const order = await Order.findByIdAndUpdate(req.params.id, { assignedAccountEmployee: employeeId }, { new: true })
      .populate('party', 'name phone')
      .populate('items.item', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
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