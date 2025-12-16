const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
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
        ordersAssigned: []
      });
      await employee.save();
    }

    res.json({ employee });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get employee statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    const employee = await Employee.findOne({ userId: currentUserId });

    if (!employee) {
      return res.json({
        totalOrdersAssigned: 0,
        totalOrdersCompleted: 0,
        totalItemsCompleted: 0,
        totalStepsCompleted: 0,
        totalSubStepsCompleted: 0,
        completionRate: 0
      });
    }

    // Calculate statistics
    let totalOrders = employee.ordersAssigned.length;
    let completedOrders = employee.ordersAssigned.filter(o => o.status === 'completed').length;
    let totalItems = 0;
    let completedItems = 0;
    let totalSteps = 0;
    let completedSteps = 0;
    let totalSubSteps = 0;
    let completedSubSteps = 0;

    employee.ordersAssigned.forEach(order => {
      order.items.forEach(item => {
        totalItems++;
        if (item.status === 'completed') completedItems++;
        
        item.steps.forEach(step => {
          totalSteps++;
          if (step.status === 'completed') completedSteps++;
          
          step.subSteps.forEach(subStep => {
            totalSubSteps++;
            if (subStep.status === 'completed') completedSubSteps++;
          });
        });
      });
    });

    const completionRate = totalSubSteps > 0 
      ? Math.round((completedSubSteps / totalSubSteps) * 100) 
      : 0;

    res.json({
      totalOrdersAssigned: totalOrders,
      totalOrdersCompleted: completedOrders,
      totalItemsAssigned: totalItems,
      totalItemsCompleted: completedItems,
      totalStepsAssigned: totalSteps,
      totalStepsCompleted: completedSteps,
      totalSubStepsAssigned: totalSubSteps,
      totalSubStepsCompleted: completedSubSteps,
      completionRate: completionRate,
      lastActiveAt: employee.lastActiveAt
    });
  } catch (error) {
    console.error('Error fetching employee statistics:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get detailed work history
router.get('/work-history', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId || req.user.id;
    
    const employee = await Employee.findOne({ userId: currentUserId })
      .populate('ordersAssigned.orderId', 'poNumber status estimatedDeliveryDate party')
      .populate('ordersAssigned.items.itemId', 'name code');

    if (!employee) {
      return res.json({ workHistory: [] });
    }

    // Format work history
    const workHistory = employee.ordersAssigned.map(order => ({
      orderId: order.orderId?._id,
      poNumber: order.poNumber,
      status: order.status,
      assignedAt: order.assignedAt,
      completedAt: order.completedAt,
      itemsCount: order.items.length,
      completedItemsCount: order.items.filter(i => i.status === 'completed').length,
      items: order.items.map(item => ({
        itemId: item.itemId?._id,
        itemName: item.itemName,
        itemCode: item.itemId?.code,
        status: item.status,
        completedAt: item.completedAt,
        stepsCount: item.steps.length,
        completedStepsCount: item.steps.filter(s => s.status === 'completed').length
      }))
    }));

    res.json({ workHistory });
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
        totalOrdersAssigned: emp.ordersAssigned.length,
        totalOrdersCompleted: emp.totalOrdersCompleted,
        totalItemsCompleted: emp.totalItemsCompleted,
        totalStepsCompleted: emp.totalStepsCompleted,
        totalSubStepsCompleted: emp.totalSubStepsCompleted,
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
