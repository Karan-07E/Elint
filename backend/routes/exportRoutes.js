const express = require('express');
const router = express.Router();

const Party = require('../models/Party');
const Order = require('../models/Order');

// Export all parties and their orders as CSV
router.get('/parties-orders', async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('party')
      .populate('items.item');

    const header = [
      'partyName',
      'partyType',
      'phone',
      'email',
      'gstin',
      'billingStreet',
      'billingCity',
      'billingState',
      'billingPincode',
      'openingBalance',
      'balanceType',
      'orderNumber',
      'orderDate',
      'priority',
      'status',
      'itemName',
      'itemQuantity',
      'itemRate',
      'itemAmount',
      'totalAmount',
    ];

    const rows = [header.join(',')];

    orders.forEach((order) => {
      const party = order.party || {};
      const baseCols = [
        party.name || '',
        party.type || '',
        party.phone || '',
        party.email || '',
        party.gstin || '',
        (party.billingAddress && party.billingAddress.street) || '',
        (party.billingAddress && party.billingAddress.city) || '',
        (party.billingAddress && party.billingAddress.state) || '',
        (party.billingAddress && party.billingAddress.pincode) || '',
        party.openingBalance != null ? party.openingBalance : '',
        party.balanceType || '',
        order.orderNumber || '',
        order.orderDate ? order.orderDate.toISOString().split('T')[0] : '',
        order.priority || '',
        order.status || '',
      ];

      if (order.items && order.items.length > 0) {
        order.items.forEach((itemLine) => {
          const item = itemLine.item || {};
          const row = baseCols.concat([
            item.name || '',
            itemLine.quantity != null ? itemLine.quantity : '',
            itemLine.rate != null ? itemLine.rate : '',
            itemLine.amount != null ? itemLine.amount : '',
            order.totalAmount != null ? order.totalAmount : '',
          ]);
          rows.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
        });
      } else {
        const row = baseCols.concat(['', '', '', '', order.totalAmount != null ? order.totalAmount : '']);
        rows.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
      }
    });

    const csv = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="parties_orders_export.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export data' });
  }
});

module.exports = router;
