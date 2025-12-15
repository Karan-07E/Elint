const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['customer', 'supplier', 'both'],
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  gstin: {
    type: String,
    trim: true
  },
  additionalFields: [{
    label: { type: String, trim: true, required: true },
    value: { type: String, trim: true }
  }],
  billingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  balanceType: {
    type: String,
    enum: ['receivable', 'payable'],
    default: 'receivable'
  },
  currentBalance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Party', partySchema);
