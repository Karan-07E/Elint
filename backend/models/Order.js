const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Linking to Party (Customer)
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true
  },
  
  // Order Details
  poNumber: { type: String, required: true, trim: true },
  poDate: { type: Date, default: Date.now },
  estimatedDeliveryDate: { type: Date },
  
  // Flow Stages
  status: {
    type: String,
    enum: [
      'New', 
      'Verified', 
      'Manufacturing', 
      'Quality_Check', 
      'Documentation', 
      'Dispatch', 
      'Completed', 
      'Deleted'
    ],
    default: 'New'
  },

  // ✅ NEW: Track history of status changes and notes
  statusHistory: [{
    status: String,
    note: String,
    timestamp: { type: Date, default: Date.now }
  }],

  priority: {
    type: String,
    enum: ['Normal', 'High'],
    default: 'Normal'
  },

  // Items in the order
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    itemName: String, 
    quantity: Number,
    unit: String,
    rate: Number,
    amount: Number,
    deliveryDate: { type: Date }
  }],

  totalAmount: { type: Number, default: 0 },
  notes: { type: String } // General remarks
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);