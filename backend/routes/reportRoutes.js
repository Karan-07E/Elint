const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Order = require('../models/Order');
const authenticateToken = require('../middleware/auth');

// Generate next report number
router.get('/next-number', authenticateToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const lastReport = await Report.findOne({
      reportNumber: new RegExp(`^BILL-${currentYear}-`)
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastReport) {
      const lastNum = parseInt(lastReport.reportNumber.split('-')[2]);
      nextNumber = lastNum + 1;
    }

    const reportNumber = `BILL-${currentYear}-${String(nextNumber).padStart(5, '0')}`;
    res.json({ reportNumber });
  } catch (error) {
    console.error('Error generating report number:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new report
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { orderId, reportNumber, from, to, paidAmount } = req.body;
    const currentUserId = req.user.userId || req.user.id;

    // Fetch order details
    const order = await Order.findById(orderId).populate('party').populate('items.item');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Calculate items with tax
    const items = order.items.map(item => {
      const rate = item.rate || 0;
      const quantity = item.quantity || 0;
      const taxRate = item.taxRate || 0;
      const amount = rate * quantity;
      const tax = (amount * taxRate) / 100;

      return {
        itemName: item.item?.name || item.itemName || 'Unknown Item',
        description: item.item?.description || '',
        quantity: quantity,
        unit: item.unit || 'pcs',
        rate: rate,
        tax: tax,
        amount: amount + tax
      };
    });

    const subtotal = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax, 0);
    const totalAmount = subtotal + taxAmount;
    const balanceAmount = totalAmount - (paidAmount || 0);

    const report = new Report({
      reportNumber,
      orderId,
      reportType: 'invoice',
      from,
      to,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: paidAmount || 0,
      balanceAmount,
      generatedBy: currentUserId,
      status: 'finalized'
    });

    await report.save();

    res.status(201).json({ 
      message: 'Report generated successfully',
      report 
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('orderId')
      .populate('generatedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get report by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate({
        path: 'orderId',
        populate: { path: 'party' }
      })
      .populate('generatedBy', 'username');
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get report by order ID
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const reports = await Report.find({ orderId: req.params.orderId })
      .populate('generatedBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete report
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
