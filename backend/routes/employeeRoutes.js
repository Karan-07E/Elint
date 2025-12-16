const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const Order = require('../models/Order');
const Item = require('../models/Item');
const Mapping = require('../models/Mapping');
const authenticateToken = require('../middleware/auth');

// Get employee profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    let employee = await Employee.findOne({ userId: currentUserId })
      .populate('userId', 'name email employeeId role');

    if (!employee) {
      // Create employee record if doesn't exist
      const user = await User.findById(currentUserId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      employee = new Employee({
        userId: currentUserId,
        name: user.name,
        empId: user.employeeId || `EMP${Date.now()}`,
        assignedItems: []
      });
      await employee.save();
    }

    res.json({ employee });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get employee statistics (active work from Mappings + completed from Employee)
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    // Get active work stats from Mappings
    const mappings = await Mapping.find({ assignedEmployeeId: currentUserId });
    
    const activeStats = {
      totalItemsAssigned: mappings.length,
      totalItemsPending: mappings.filter(m => m.status === 'pending').length,
      totalItemsInProgress: mappings.filter(m => m.status === 'in-progress').length,
      totalItemsCompleted: mappings.filter(m => m.status === 'completed').length
    };

    // Get historical completed items from Employee
    const employee = await Employee.findOne({ userId: currentUserId });
    const historicalCompleted = employee ? employee.assignedItems.filter(i => i.status === 'completed').length : 0;

    const totalCompleted = activeStats.totalItemsCompleted + historicalCompleted;
    const completionRate = activeStats.totalItemsAssigned > 0 
      ? Math.round((activeStats.totalItemsCompleted / activeStats.totalItemsAssigned) * 100) 
      : 0;

    res.json({
      totalItemsAssigned: activeStats.totalItemsAssigned,
      totalItemsCompleted: activeStats.totalItemsCompleted,
      totalItemsInProgress: activeStats.totalItemsInProgress,
      totalItemsPending: activeStats.totalItemsPending,
      historicalCompleted: historicalCompleted,
      totalLifetimeCompleted: totalCompleted,
      completionRate: completionRate,
      lastActiveAt: employee?.lastActiveAt
    });
  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get employee work history for charts and progress tracking
router.get('/work-history', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    const { period = 'month' } = req.query; // week, month, year
    
    const employee = await Employee.findOne({ userId: currentUserId })
      .populate('assignedItems.orderId', 'poNumber jobNumber')
      .populate('assignedItems.itemId', 'name code');

    if (!employee) {
      return res.json({ 
        history: [],
        chartData: [],
        totalCompleted: 0,
        averageCompletionTime: 0
      });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Filter completed items in the date range
    const completedItems = employee.assignedItems.filter(item => 
      item.status === 'completed' && 
      item.manufactureCompletedAt &&
      new Date(item.manufactureCompletedAt) >= startDate
    );

    // Group by date for chart
    const chartDataMap = {};
    completedItems.forEach(item => {
      const date = new Date(item.manufactureCompletedAt).toISOString().split('T')[0];
      chartDataMap[date] = (chartDataMap[date] || 0) + 1;
    });

    const chartData = Object.keys(chartDataMap)
      .sort()
      .map(date => ({
        date,
        count: chartDataMap[date]
      }));

    // Calculate average completion time
    const completionTimes = completedItems
      .filter(item => item.startedAt && item.manufactureCompletedAt)
      .map(item => {
        const start = new Date(item.startedAt);
        const end = new Date(item.manufactureCompletedAt);
        return (end - start) / (1000 * 60 * 60); // hours
      });

    const averageCompletionTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;

    res.json({
      history: completedItems.map(item => ({
        itemId: item.itemId?._id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        orderId: item.orderId?._id,
        poNumber: item.orderId?.poNumber,
        jobNumber: item.jobNumber,
        assignedAt: item.assignedAt,
        startedAt: item.startedAt,
        completedAt: item.manufactureCompletedAt,
        progressPercentage: item.progressPercentage
      })),
      chartData,
      totalCompleted: completedItems.length,
      totalLifetimeCompleted: employee.assignedItems.filter(i => i.status === 'completed').length,
      averageCompletionTime: averageCompletionTime,
      period
    });
  } catch (error) {
    console.error('Error fetching work history:', error);
    res.status(500).json({ message: error.message });
  }
});

// ADMIN: Clean up invalid mappings (mappings with null references)
router.delete('/cleanup-invalid-mappings', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or accounts
    if (req.user.role !== 'admin' && req.user.role !== 'accounts team') {
      return res.status(403).json({ message: 'Access denied. Admin or accounts team only.' });
    }

    const allMappings = await Mapping.find({})
      .populate('orderId')
      .populate('itemId');
    
    const invalidMappings = allMappings.filter(m => !m.orderId || !m.itemId);
    
    console.log('Found', invalidMappings.length, 'invalid mappings to delete');
    
    // Delete invalid mappings
    const deletePromises = invalidMappings.map(m => Mapping.findByIdAndDelete(m._id));
    await Promise.all(deletePromises);
    
    res.json({
      message: 'Invalid mappings cleaned up',
      deletedCount: invalidMappings.length,
      deletedIds: invalidMappings.map(m => m._id)
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get detailed work history
// Get employee's assigned items with order details (from Mappings - active work)
router.get('/my-items', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    // Fetch active assignments from Mappings
    const mappings = await Mapping.find({ assignedEmployeeId: currentUserId })
      .populate('orderId', 'poNumber status estimatedDeliveryDate party')
      .populate('itemId', 'name code type category unit processes openingQty currentStock');
    
    // Calculate stats
    const stats = {
      total: mappings.length,
      pending: mappings.filter(m => m.status === 'pending').length,
      inProgress: mappings.filter(m => m.status === 'in-progress').length,
      completed: mappings.filter(m => m.status === 'completed').length
    };

    // Format items - filter out mappings with invalid references
    const items = mappings
      .filter(mapping => {
        if (!mapping.orderId) {
          console.warn('Mapping has null orderId:', mapping._id);
          return false;
        }
        if (!mapping.itemId) {
          console.warn('Mapping has null itemId:', mapping._id);
          return false;
        }
        return true;
      })
      .map(mapping => ({
        _id: mapping._id,
        orderId: mapping.orderId._id,
        poNumber: mapping.orderId.poNumber,
        itemId: mapping.itemId._id,
        itemCode: mapping.itemId.code,
        itemName: mapping.itemId.name,
        itemType: mapping.itemId.type,
        itemCategory: mapping.itemId.category,
        unit: mapping.itemId.unit,
        jobNumber: mapping.jobNumber,
        status: mapping.status,
        progressPercentage: mapping.progressPercentage,
        startedAt: mapping.startedAt,
        completedAt: mapping.completedAt,
        notes: mapping.notes,
        assignedAt: mapping.createdAt,
        item: {
          _id: mapping.itemId._id,
          code: mapping.itemId.code,
          name: mapping.itemId.name,
          type: mapping.itemId.type,
          category: mapping.itemId.category,
          unit: mapping.itemId.unit,
          processes: mapping.itemId.processes || [],
          openingQty: mapping.itemId.openingQty,
          currentStock: mapping.itemId.currentStock
        }
      }));

    res.json({ 
      items,
      stats 
    });

  } catch (error) {
    console.error('Error fetching employee items:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get grouped items by order (from Mappings - active work + Employee - completed work)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    // Fetch active assignments from Mappings
    const mappings = await Mapping.find({ assignedEmployeeId: currentUserId })
      .populate({
        path: 'orderId',
        populate: { path: 'party', select: 'name' }
      })
      .populate('itemId', 'name code type category unit processes');

    // Group items by order
    const orderMap = new Map();
    
    mappings.forEach(mapping => {
      if (!mapping.orderId || !mapping.itemId) {
        return;
      }
      
      const orderId = mapping.orderId._id.toString();
      
      if (!orderMap.has(orderId)) {
        orderMap.set(orderId, {
          id: mapping.orderId._id.toString(),
          orderId: mapping.orderId._id,
          po_number: mapping.orderId.poNumber || 'N/A',
          poNumber: mapping.orderId.poNumber,
          customer_name: mapping.orderId.party?.name || 'Unknown',
          customerName: mapping.orderId.party?.name || 'Unknown',
          status: mapping.orderId.status || 'New',
          orderStatus: mapping.orderId.status || 'New',
          priority: mapping.orderId.priority || 'Normal',
          poDate: mapping.orderId.poDate,
          startDate: mapping.orderId.poDate,
          deadline: mapping.orderId.estimatedDeliveryDate,
          estimatedDeliveryDate: mapping.orderId.estimatedDeliveryDate,
          overdue: mapping.orderId.estimatedDeliveryDate ? new Date(mapping.orderId.estimatedDeliveryDate) < new Date() : false,
          items: []
        });
      }
      
      orderMap.get(orderId).items.push({
        mappingId: mapping._id,
        itemId: mapping.itemId._id,
        itemCode: mapping.itemId.code,
        itemName: mapping.itemId.name,
        unit: mapping.itemId.unit,
        jobNumber: mapping.jobNumber,
        status: mapping.status,
        completed: mapping.status === 'completed',
        progressPercentage: mapping.progressPercentage,
        assignedAt: mapping.createdAt,
        startedAt: mapping.startedAt,
        completedAt: mapping.completedAt,
        notes: mapping.notes
      });
    });

    // Also fetch completed orders from Employee schema
    const employee = await Employee.findOne({ userId: currentUserId })
      .populate({
        path: 'assignedItems.orderId',
        populate: { path: 'party', select: 'name' }
      });
    
    if (employee && employee.assignedItems && employee.assignedItems.length > 0) {
      // Group completed items by order
      employee.assignedItems.forEach(item => {
        if (!item.orderId) {
          return;
        }
        
        const orderId = item.orderId._id.toString();
        
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            id: item.orderId._id.toString(),
            orderId: item.orderId._id,
            po_number: item.orderId.poNumber || 'N/A',
            poNumber: item.orderId.poNumber,
            customer_name: item.orderId.party?.name || 'Unknown',
            customerName: item.orderId.party?.name || 'Unknown',
            status: item.orderId.status || 'Completed',
            orderStatus: item.orderId.status || 'Completed',
            priority: item.orderId.priority || 'Normal',
            poDate: item.orderId.poDate,
            startDate: item.orderId.poDate,
            deadline: item.orderId.estimatedDeliveryDate,
            estimatedDeliveryDate: item.orderId.estimatedDeliveryDate,
            overdue: false, // Completed orders can't be overdue
            items: []
          });
        }
        
        // Add completed item to the order
        orderMap.get(orderId).items.push({
          mappingId: null, // No mapping for completed items
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unit: item.unit,
          jobNumber: item.jobNumber,
          status: 'completed',
          completed: true,
          progressPercentage: 100,
          assignedAt: item.assignedDate,
          startedAt: item.startedDate,
          completedAt: item.completedDate,
          notes: ''
        });
      });
    }

    const orders = Array.from(orderMap.values());

    res.json({ orders });

  } catch (error) {
    console.error('Error fetching employee orders:', error);
    res.status(500).json({ message: error.message });
  }
});

// Start working on an item (updates Mapping)
router.patch('/items/:itemId/start', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    const { itemId } = req.params;
    
    // Find mapping for this employee and item
    const mapping = await Mapping.findOne({ 
      assignedEmployeeId: currentUserId,
      itemId: itemId,
      status: 'pending'
    });
    
    if (!mapping) {
      return res.status(404).json({ message: 'Item not found or already started' });
    }

    mapping.status = 'in-progress';
    mapping.startedAt = new Date();
    mapping.progressPercentage = 0;
    await mapping.save();
    
    res.json({ 
      message: 'Item started successfully',
      mapping: {
        id: mapping._id,
        itemId: mapping.itemId,
        status: mapping.status,
        startedAt: mapping.startedAt
      }
    });

  } catch (error) {
    console.error('Error starting item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark item as completed (updates Mapping and moves to Employee history)
router.patch('/items/:itemId/complete', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    const { itemId } = req.params;
    
    // Find mapping for this employee and item
    const mapping = await Mapping.findOne({ 
      assignedEmployeeId: currentUserId,
      itemId: itemId
    }).populate('itemId').populate('orderId');
    
    if (!mapping) {
      return res.status(404).json({ message: 'Item not found in your assignments' });
    }

    // Update mapping to completed
    mapping.status = 'completed';
    mapping.completedAt = new Date();
    mapping.progressPercentage = 100;
    await mapping.save();

    // Update the Order model's item.completed field and get quantity
    const order = await Order.findById(mapping.orderId);
    let itemQuantity = 1; // Default
    let itemUnit = 'units'; // Default
    
    if (order) {
      const orderItem = order.items.find(oi => oi.item.toString() === itemId);
      if (orderItem) {
        orderItem.completed = true;
        itemQuantity = orderItem.quantity || 1;
        itemUnit = orderItem.unit || 'units';
        await order.save();
      }
    }

    // Move to Employee history
    let employee = await Employee.findOne({ userId: currentUserId });
    if (!employee) {
      const user = await User.findById(currentUserId);
      employee = new Employee({
        userId: currentUserId,
        name: user.name,
        empId: user.employeeId || `EMP${Date.now()}`,
        assignedItems: []
      });
    }

    // Add to employee history if not already there
    const existingItem = employee.assignedItems.find(
      item => item.itemId.toString() === itemId && item.orderId.toString() === mapping.orderId._id.toString()
    );

    if (!existingItem) {
      employee.assignedItems.push({
        orderId: mapping.orderId,
        itemId: mapping.itemId,
        itemCode: mapping.itemId.code,
        itemName: mapping.itemId.name,
        quantity: itemQuantity,
        unit: itemUnit,
        jobNumber: mapping.jobNumber,
        status: 'completed',
        assignedAt: mapping.createdAt,
        startedAt: mapping.startedAt,
        manufactureCompletedAt: mapping.completedAt,
        progressPercentage: 100,
        notes: mapping.notes
      });
      await employee.save();
    }

    // Check if ALL items assigned to this employee in this order are now completed
    const allOrderMappings = await Mapping.find({
      orderId: mapping.orderId._id,
      assignedEmployeeId: currentUserId
    });

    const allItemsCompleted = allOrderMappings.every(m => 
      m._id.toString() === mapping._id.toString() || m.status === 'completed'
    );

    let orderCompleted = false;
    if (allItemsCompleted && allOrderMappings.length > 0) {
      // Check if ALL items in the order (across all employees) are completed
      const allOrderItems = await Mapping.find({ orderId: mapping.orderId._id });
      const allOrderItemsCompleted = allOrderItems.every(m => m.status === 'completed');
      
      if (allOrderItemsCompleted) {
        // Mark the order as completed
        order.status = 'Completed';
        order.completedAt = new Date();
        await order.save();
        orderCompleted = true;

        // Delete all completed mappings for this order (moved to Employee history)
        await Mapping.deleteMany({ 
          orderId: mapping.orderId._id,
          status: 'completed'
        });
      }
    }
    
    res.json({ 
      message: orderCompleted 
        ? '🎉 All items completed! Order marked as completed and moved to history.' 
        : 'Item marked as completed and moved to history',
      mapping: {
        id: mapping._id,
        itemId: mapping.itemId._id,
        status: mapping.status,
        completedAt: mapping.completedAt
      },
      orderCompleted
    });

  } catch (error) {
    console.error('Error completing item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update item progress (updates Mapping)
router.patch('/items/:itemId/progress', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    const { itemId } = req.params;
    const { progressPercentage, notes } = req.body;
    
    if (progressPercentage === undefined || progressPercentage < 0 || progressPercentage > 100) {
      return res.status(400).json({ message: 'Invalid progress percentage. Must be between 0 and 100.' });
    }

    // Find mapping for this employee and item
    const mapping = await Mapping.findOne({ 
      assignedEmployeeId: currentUserId,
      itemId: itemId
    });
    
    if (!mapping) {
      return res.status(404).json({ message: 'Item not found in your assignments' });
    }

    // Update progress
    mapping.progressPercentage = progressPercentage;
    if (notes) {
      mapping.notes = notes;
    }

    // Update status based on progress
    if (progressPercentage === 0 && mapping.status === 'pending') {
      // Keep as pending
    } else if (progressPercentage > 0 && progressPercentage < 100) {
      mapping.status = 'in-progress';
      if (!mapping.startedAt) {
        mapping.startedAt = new Date();
      }
    } else if (progressPercentage === 100) {
      mapping.status = 'completed';
      mapping.completedAt = new Date();
    }

    await mapping.save();
    
    res.json({ 
      message: 'Item progress updated',
      mapping: {
        id: mapping._id,
        itemId: mapping.itemId,
        status: mapping.status,
        progressPercentage: mapping.progressPercentage,
        notes: mapping.notes
      }
    });

  } catch (error) {
    console.error('Error updating item progress:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get work history (completed items from Employee schema)
router.get('/work-history', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    const employee = await Employee.findOne({ userId: currentUserId })
      .populate('assignedItems.orderId', 'poNumber party')
      .populate('assignedItems.itemId', 'name code');
    
    if (!employee) {
      return res.json({ history: [] });
    }

    // Only return completed items
    const completedItems = employee.assignedItems
      .filter(item => item.status === 'completed')
      .map(item => ({
        orderId: item.orderId?._id,
        poNumber: item.orderId?.poNumber,
        itemId: item.itemId?._id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        jobNumber: item.jobNumber,
        assignedAt: item.assignedAt,
        startedAt: item.startedAt,
        completedAt: item.manufactureCompletedAt,
        notes: item.notes
      }));

    res.json({ history: completedItems });

  } catch (error) {
    console.error('Error fetching work history:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update employee last active timestamp
router.patch('/update-activity', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    const employee = await Employee.findOne({ userId: currentUserId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    employee.lastActiveAt = new Date();
    await employee.save();

    res.json({ message: 'Activity updated', lastActiveAt: employee.lastActiveAt });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get all employees with statistics
router.get('/all', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or accounts
    if (req.user.role !== 'admin' && req.user.role !== 'accounts team') {
      return res.status(403).json({ message: 'Access denied. Admin or accounts team only.' });
    }

    const employees = await Employee.find()
      .populate('userId', 'name email employeeId role isActive')
      .sort({ name: 1 });

    const employeesWithStats = employees.map(emp => {
      // Calculate stats
      emp.calculateStats();
      
      return {
        _id: emp._id,
        userId: emp.userId?._id,
        name: emp.name,
        empId: emp.empId,
        email: emp.userId?.email,
        role: emp.userId?.role,
        isActive: emp.isActive,
        totalItemsAssigned: emp.totalItemsAssigned,
        totalItemsCompleted: emp.totalItemsCompleted,
        totalItemsInProgress: emp.totalItemsInProgress,
        totalItemsPending: emp.totalItemsPending,
        lastActiveAt: emp.lastActiveAt,
        createdAt: emp.createdAt
      };
    });

    res.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Error fetching all employees:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
