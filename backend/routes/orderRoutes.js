const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const authenticateToken = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

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
const Employee = require('../models/Employee');

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

// DEPRECATED: This route is now handled by /api/employees/my-orders using Mappings schema
// Get assigned orders formatted for Dashboard (Employee View) - Fetching from Employee table
/* 
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    // JWT payload has userId, not id
    const currentUserId = req.user.userId || req.user.id;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * limit;

    const { status, priority, range } = req.query;

    // Find employee record
    const employee = await Employee.findOne({ userId: currentUserId });
    
    if (!employee || !employee.ordersAssigned || employee.ordersAssigned.length === 0) {
      return res.json({
        total: 0,
        page,
        per_page: limit,
        orders: []
      });
    }

    // Get order IDs from employee's ordersAssigned
    const orderIds = employee.ordersAssigned.map(o => o.orderId);

    // Base filter: Find orders from employee's assignments
    const filter = {
      _id: { $in: orderIds },
      status: { $ne: 'Deleted' }
    };

    if (status) filter.status = status;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Range Filter Logic
    if (range) {
      if (range === 'today') {
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        filter.estimatedDeliveryDate = { $gte: startOfDay, $lt: endOfDay };
      } else if (range === 'week') {
        const nextWeek = new Date(startOfDay);
        nextWeek.setDate(nextWeek.getDate() + 7);
        filter.estimatedDeliveryDate = { $gte: startOfDay, $lte: nextWeek };
      } else if (range === 'last30') {
        const thirtyDaysAgo = new Date(startOfDay);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.poDate = { $gte: thirtyDaysAgo };
      }
    }

    // Fetch orders from employee's assigned orders
    const allMatches = await Order.find(filter)
      .populate('party', 'name')
      .populate({
        path: 'items.item',
        select: 'name code type category processes hsn salePrice openingQty unit',
        model: 'Item'
      })
      .populate('items.assignedTo', 'name employeeId')
      .populate('assignedAccountEmployee', 'name employeeId');

    const priorityWeight = { 'High': 3, 'Urgent': 3, 'Normal': 2, 'Low': 1 };

    const mappedOrders = allMatches.map(o => {
      const deadline = o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate) : null;
      const startDate = o.poDate ? new Date(o.poDate) : null;
      const isOverdue = deadline && deadline < now && o.status !== 'Completed';

      // Get items assigned to this employee from employee tracking
      const employeeOrder = employee.ordersAssigned.find(eo => eo.orderId.toString() === o._id.toString());
      const assignedItemIds = employeeOrder ? employeeOrder.items.map(i => i.itemId.toString()) : [];

      // Filter items to only show those in employee's tracking
      const userItems = o.items.filter(item => {
        const itemId = item.item._id ? item.item._id.toString() : item.item.toString();
        return assignedItemIds.includes(itemId);
      });

      // Apply priority filter if specified
      if (priority) {
        const filteredByPriority = userItems.filter(item => item.priority === priority);
        if (filteredByPriority.length === 0) return null; // Exclude this order
      }

      // Calculate total for user's items only
      const userTotal = userItems.reduce((sum, item) => sum + (item.amount || 0), 0);

      // Derive order-level priority from items
      const derivedPriority = userItems.some(it => (it.priority || '').toLowerCase() === 'high') ? 'High' : (o.priority || 'Normal');

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
    }).filter(o => o !== null); // Remove orders filtered out by priority

    // Filter out orders with no items
    const ordersWithItems = mappedOrders.filter(o => o.items.length > 0);

    // Sort: Overdue (desc) -> Priority (desc) -> Deadline (asc)
    ordersWithItems.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a._priorityVal !== b._priorityVal) return b._priorityVal - a._priorityVal;
      return a._rawDeadline - b._rawDeadline;
    });

    // Paginate
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
*/

// DEPRECATED: Employee routes moved to /api/employees/* using Mappings schema
/*
// Get employee progress - ALL orders (including completed)
router.get('/employee/progress', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    // Fetch ALL orders where employee has items assigned (including completed orders)
    const allOrders = await Order.find({
      status: { $ne: 'Deleted' },
      'items.assignedTo': currentUserId
    })
      .populate('party', 'name')
      .populate('items.item', 'name code')
      .populate('items.assignedTo', 'name employeeId')
      .populate('assignedAccountEmployee', 'name employeeId')
      .sort({ poDate: -1 });

    // Map orders with only user's items
    const mappedOrders = allOrders.map(o => {
      const userItems = o.items.filter(item => {
        if (!item.assignedTo) return false;
        const assignedToId = item.assignedTo._id ? item.assignedTo._id.toString() : item.assignedTo.toString();
        return assignedToId === currentUserId;
      });

      const deadline = o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate) : null;
      const userTotal = userItems.reduce((sum, item) => sum + (item.amount || 0), 0);

      return {
        id: o._id,
        po_number: o.poNumber,
        customer_name: o.party?.name || 'Unknown',
        deadline: deadline,
        amount: userTotal,
        items: userItems,
        status: o.status,
        assignedTo: o.assignedAccountEmployee
      };
    }).filter(o => o.items.length > 0);

    res.json({
      total: mappedOrders.length,
      orders: mappedOrders
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
*/

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
        // FIXED: Use orderItem.item (actual Item reference) not orderItem._id (subdocument ID)
        await Mapping.findOneAndUpdate(
          { orderId: order._id, itemId: orderItem.item }, // Use actual Item ObjectId reference
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

// DEPRECATED: Employee tracking routes moved to /api/employees/* using Mappings schema
/*
// Update substep completion status in employee tracking
router.patch('/employee/substep-completion', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    const { orderId, itemId, stepId, subStepId } = req.body;

    if (!orderId || !itemId || stepId === undefined || subStepId === undefined) {
      return res.status(400).json({ message: 'orderId, itemId, stepId, and subStepId are required' });
    }

    // Find or create employee record
    let employee = await Employee.findOne({ userId: currentUserId });
    
    if (!employee) {
      // Get user details to create employee record
      const User = require('../models/User');
      const user = await User.findById(currentUserId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      employee = new Employee({
        userId: currentUserId,
        name: user.name,
        empId: user.employeeId || `EMP${Date.now()}`,
        ordersAssigned: []
      });
    }

    // Find or create order tracking
    let orderTracking = employee.ordersAssigned.find(o => o.orderId.toString() === orderId);
    
    if (!orderTracking) {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      orderTracking = {
        orderId: orderId,
        poNumber: order.poNumber,
        status: 'in-progress',
        assignedAt: new Date(),
        items: []
      };
      employee.ordersAssigned.push(orderTracking);
    } else {
      if (orderTracking.status === 'assigned') {
        orderTracking.status = 'in-progress';
      }
    }

    // Find or create item tracking
    let itemTracking = orderTracking.items.find(i => i.itemId.toString() === itemId);
    
    if (!itemTracking) {
      const item = await Item.findById(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      // Initialize item with all steps and substeps from the item schema
      itemTracking = {
        itemId: itemId,
        itemName: item.name,
        status: 'in-progress',
        steps: item.processes.map(process => ({
          stepId: process.id,
          stepName: process.stepName,
          status: 'pending',
          subSteps: process.subSteps.map(sub => ({
            subStepId: sub.id,
            name: sub.name,
            status: 'pending',
            completedAt: null
          }))
        }))
      };
      orderTracking.items.push(itemTracking);
    }

    // Find the specific step and substep
    const step = itemTracking.steps.find(s => s.stepId === stepId);
    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }

    const subStep = step.subSteps.find(ss => ss.subStepId === subStepId);
    if (!subStep) {
      return res.status(404).json({ message: 'SubStep not found' });
    }

    // Update substep completion
    subStep.status = 'completed';
    subStep.completedAt = new Date();

    // Check if all substeps in this step are completed
    const allSubStepsCompleted = step.subSteps.every(ss => ss.status === 'completed');
    if (allSubStepsCompleted) {
      step.status = 'completed';
      step.completedAt = new Date();
    }

    // Check if all steps in this item are completed
    const allStepsCompleted = itemTracking.steps.every(s => s.status === 'completed');
    if (allStepsCompleted) {
      itemTracking.status = 'completed';
      itemTracking.completedAt = new Date();
      
      // Also update the Order model's item completion status
      const order = await Order.findById(orderId);
      if (order) {
        const orderItem = order.items.find(item => 
          item.item && item.item.toString() === itemId
        );
        if (orderItem) {
          orderItem.completed = true;
          await order.save();
        }
      }
    }

    // Check if all items in this order are completed
    const allItemsCompleted = orderTracking.items.every(i => i.status === 'completed');
    if (allItemsCompleted) {
      orderTracking.status = 'completed';
      orderTracking.completedAt = new Date();
      
      // Also update the Order model status to 'Completed'
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'Completed';
        await order.save();
      }
    }

    // Update statistics and save
    employee.calculateStats();
    employee.lastActiveAt = new Date();
    await employee.save();

    res.json({ 
      message: 'SubStep completed successfully',
      employee: employee,
      cascadeInfo: {
        subStepCompleted: true,
        stepCompleted: allSubStepsCompleted,
        itemCompleted: allStepsCompleted,
        orderCompleted: allItemsCompleted
      }
    });

  } catch (error) {
    console.error('Error updating substep completion:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get employee tracking data
router.get('/employee/tracking', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    let employee = await Employee.findOne({ userId: currentUserId })
      .populate('ordersAssigned.orderId', 'poNumber status estimatedDeliveryDate')
      .populate('ordersAssigned.items.itemId', 'name code');

    if (!employee) {
      // Create empty employee record if doesn't exist
      const User = require('../models/User');
      const user = await User.findById(currentUserId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      employee = new Employee({
        userId: currentUserId,
        name: user.name,
        empId: user.employeeId || `EMP${Date.now()}`,
        ordersAssigned: []
      });
      await employee.save();
    }

    res.json({ employee });

  } catch (error) {
    console.error('Error fetching employee tracking:', error);
    res.status(500).json({ message: error.message });
  }
});

// Initialize employee tracking for a new order assignment
router.post('/employee/initialize-order', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    // Find or create employee record
    let employee = await Employee.findOne({ userId: currentUserId });
    
    if (!employee) {
      const User = require('../models/User');
      const user = await User.findById(currentUserId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      employee = new Employee({
        userId: currentUserId,
        name: user.name,
        empId: user.employeeId || `EMP${Date.now()}`,
        ordersAssigned: []
      });
    }

    // Check if order already tracked
    const existingOrder = employee.ordersAssigned.find(o => o.orderId.toString() === orderId);
    if (existingOrder) {
      return res.json({ message: 'Order already initialized', employee });
    }

    // Fetch order details
    const order = await Order.findById(orderId)
      .populate({
        path: 'items.item',
        select: 'name code processes',
        model: 'Item'
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get only items assigned to this employee
    const assignedItems = order.items.filter(item => {
      if (!item.assignedTo) return false;
      const assignedToId = item.assignedTo.toString();
      return assignedToId === currentUserId;
    });

    if (assignedItems.length === 0) {
      return res.status(400).json({ message: 'No items assigned to you in this order' });
    }

    // Create order tracking with all items, steps, and substeps
    const orderTracking = {
      orderId: orderId,
      poNumber: order.poNumber,
      status: 'assigned',
      assignedAt: new Date(),
      items: assignedItems.map(orderItem => {
        const item = orderItem.item;
        return {
          itemId: item._id,
          itemName: item.name,
          quantity: orderItem.quantity,
          unit: orderItem.unit,
          status: 'pending',
          steps: (item.processes || []).map(process => ({
            stepId: process.id,
            stepName: process.stepName,
            status: 'pending',
            subSteps: (process.subSteps || []).map(sub => ({
              subStepId: sub.id,
              name: sub.name,
              status: 'pending',
              completedAt: null
            }))
          }))
        };
      })
    };

    employee.ordersAssigned.push(orderTracking);
    employee.lastActiveAt = new Date();
    await employee.save();

    res.json({ 
      message: 'Order initialized successfully',
      employee: employee
    });

  } catch (error) {
    console.error('Error initializing order:', error);
    res.status(500).json({ message: error.message });
  }
});
*/

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

// Assign items to employee
router.post('/:orderId/assign-items', authenticateToken, checkPermission('Order Management'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { employeeId, items } = req.body; // items: [{ itemId, quantity, priority, deliveryDate }]

    if (!employeeId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Employee ID and items are required' });
    }

    // Find order and employee
    const order = await Order.findById(orderId).populate('items.item');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const Employee = require('../models/Employee');
    const Mapping = require('../models/Mapping');
    const Item = require('../models/Item');
    
    let employee = await Employee.findOne({ userId: employeeId });
    if (!employee) {
      const User = require('../models/User');
      const user = await User.findById(employeeId);
      if (!user || user.role !== 'employee') {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Create employee record if it doesn't exist
      employee = new Employee({
        userId: employeeId,
        name: user.name,
        empId: user.employeeId || `EMP${Date.now()}`,
        assignedItems: []
      });
    }

    // Process each item assignment
    for (const itemAssignment of items) {
      const { itemId, quantity, priority, deliveryDate } = itemAssignment;
      
      // Check if item exists in order - handle both populated and unpopulated cases
      const orderItem = order.items.find(i => {
        const orderItemId = i.item._id ? i.item._id.toString() : i.item.toString();
        return orderItemId === itemId.toString();
      });
      
      if (!orderItem) {
        continue; // Skip invalid items
      }

      // Validate ObjectIds BEFORE querying
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        console.error('Invalid orderId:', orderId);
        continue;
      }
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        console.error('Invalid itemId:', itemId);
        continue;
      }
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        console.error('Invalid employeeId:', employeeId);
        continue;
      }

      const item = await Item.findById(itemId);
      if (!item) {
        console.error('WARNING: itemId does not exist in Items collection!');
        continue;
      }

      // Generate job number
      const jobCount = await Mapping.countDocuments();
      const jobNumber = `EJB-${String(jobCount + 1).padStart(5, '0')}`;

      // Check if already assigned
      const existingAssignment = employee.assignedItems.find(
        ai => ai.orderId.toString() === orderId && ai.itemId.toString() === itemId
      );

      if (!existingAssignment) {
        // Add to employee's assigned items
        employee.assignedItems.push({
          orderId: orderId,
          itemId: itemId,
          itemCode: item.code,
          itemName: item.name,
          quantity: quantity || orderItem.quantity,
          unit: item.unit || 'units',
          jobNumber: jobNumber,
          status: 'pending',
          priority: priority || 'medium',
          deliveryDate: deliveryDate || order.estimatedDeliveryDate
        });

        // Create mapping entry
        const newMapping = await Mapping.create({
          orderId: orderId,
          itemId: itemId,
          assignedEmployeeId: employeeId,
          jobNumber: jobNumber
        });

        // Update order item's assignedTo field
        orderItem.assignedTo = employeeId;
      }
    }

    await employee.save();
    await order.save();

    res.json({ 
      message: 'Items assigned successfully',
      assignedCount: items.length,
      employee: {
        id: employee._id,
        name: employee.name,
        empId: employee.empId
      }
    });

  } catch (error) {
    console.error('Error assigning items to employee:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;