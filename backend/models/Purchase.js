// models/Purchase.js (Updated)
const mongoose = require('mongoose');

// Sub-schema for items in the bill
const purchaseItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  description: { type: String, trim: true }, // For "Colour"
  quantity: { type: Number, required: true },
  unit: { type: String },
  rate: { type: Number, required: true }, // Base Price/Unit
  
  discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
  discountValue: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  
  taxableAmount: { type: Number, required: true },
  
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true }
}, { _id: false });

// Sub-schema for payments made
const paymentDetailSchema = new mongoose.Schema({
  paymentMode: { 
    type: String, 
    enum: ['cash', 'bank', 'cheque', 'upi', 'card', 'other'], 
    default: 'cash' 
  },
  amount: { type: Number, required: true },
  referenceNumber: { type: String, trim: true }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  stateOfSupply: { type: String, trim: true },
  
  items: [purchaseItemSchema],
  
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  
  paymentDetails: [paymentDetailSchema],
  
  billDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  
  notes: { type: String, trim: true },
  image: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Purchase', purchaseSchema);