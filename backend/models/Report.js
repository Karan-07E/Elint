const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  reportType: {
    type: String,
    enum: ['invoice', 'bill', 'delivery_note'],
    default: 'invoice'
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  items: [{
    itemName: String,
    description: String,
    quantity: Number,
    unit: String,
    rate: Number,
    tax: Number,
    amount: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'finalized'],
    default: 'draft'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
