const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Party = require('../models/Party');
const Item = require('../models/Item');

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
      filter.$or = [{ orderNumber: regex }];
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
    const order = new Order(req.body);
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

    // Update status dates
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

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const { status } = req.body;
    order.status = status;

    if (status === 'in_progress' && !order.startedDate) {
      order.startedDate = new Date();
    }
    if (status === 'completed' && !order.completedDate) {
      order.completedDate = new Date();
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

// Get order statistics
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

module.exports = router;
