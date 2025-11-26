const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Party = require('../models/Party');
const Item = require('../models/Item');

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

// Get all orders (with optional status, party, and search filters)
router.get('/', async (req, res) => {
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

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('party')
      .populate('items.item');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
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
    
    // Validate status against enum
    const validStatuses = [
      'New', 'Verified', 'Manufacturing', 'Quality_Check', 
      'Documentation', 'Dispatch', 'Completed', 'Deleted'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { 
        status: status,
        $push: {
          statusHistory: {
            status: status,
            note: note || 'Status changed',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    ).populate('party', 'name phone')
     .populate('items.item', 'name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

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