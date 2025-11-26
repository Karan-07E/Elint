const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const Transaction = require('../models/Transaction');

// Define status groups
const QUEUE_STATUS = ['New'];
const PROGRESS_STATUSES = ['Verified', 'Manufacturing', 'Quality_Check', 'Documentation', 'Dispatch'];
const COMPLETED_STATUS = ['Completed'];

// Get dashboard summary & lists
router.get('/summary', async (req, res) => {
  try {
    // 1. Get Counts
    const stats = await Order.aggregate([
      { $match: { status: { $ne: 'Deleted' } } },
      {
        $group: {
          _id: null,
          inQueue: { 
            $sum: { $cond: [{ $in: ['$status', QUEUE_STATUS] }, 1, 0] } 
          },
          inProgress: { 
            $sum: { $cond: [{ $in: ['$status', PROGRESS_STATUSES] }, 1, 0] } 
          },
          completed: { 
            $sum: { $cond: [{ $in: ['$status', COMPLETED_STATUS] }, 1, 0] } 
          }
        }
      }
    ]);

    const counts = stats[0] || { inQueue: 0, inProgress: 0, completed: 0 };

    // 2. Get "In Queue" List (Name & PO)
    // Populating 'party' to get the Customer Name
    const queueList = await Order.find({ status: { $in: QUEUE_STATUS } })
      .select('poNumber party')
      .populate('party', 'name')
      .sort({ createdAt: -1 })
      .limit(10); // Limit to 10 recent for dropdown

    // 3. Get "In Progress" List (PO & Status)
    const progressList = await Order.find({ status: { $in: PROGRESS_STATUSES } })
      .select('poNumber status')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      counts,
      queueList: queueList.map(o => ({ 
        id: o._id, 
        poNumber: o.poNumber, 
        customerName: o.party?.name || 'Unknown' 
      })),
      progressList: progressList.map(o => ({ 
        id: o._id, 
        poNumber: o.poNumber, 
        status: o.status 
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Chart Data (Unified Endpoint)
router.get('/charts/orders', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    let startDate;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Aggregate data for graph
    const chartData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: 'Deleted' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          inQueue: { 
            $sum: { $cond: [{ $in: ['$status', QUEUE_STATUS] }, 1, 0] } 
          },
          inProgress: { 
            $sum: { $cond: [{ $in: ['$status', PROGRESS_STATUSES] }, 1, 0] } 
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format for Recharts
    const formattedData = chartData.map(item => ({
      date: new Date(item._id).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      inQueue: item.inQueue,
      inProgress: item.inProgress
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sales data for chart (Keep existing logic but updated query)
router.get('/sales-chart', async (req, res) => {
  try {
    // ... (Keep your existing sales chart logic or update if needed)
    // For simplicity, returning empty or basic data to prevent errors if you don't use it yet
    res.json({ totalSale: 0, chartData: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recent transactions
router.get('/recent-transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('party', 'name')
      .sort({ transactionDate: -1 })
      .limit(5);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;