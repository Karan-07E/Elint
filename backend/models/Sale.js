// models/Sale.js
const mongoose = require('mongoose');

// Sub-schema for items in the invoice
const saleItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  description: { type: String, trim: true }, // For "Colour"
  quantity: { type: Number, required: true },
  unit: { type: String },
  rate: { type: Number, required: true }, // Base Price/Unit
  
  // Discount fields
  discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
  discountValue: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  
  taxableAmount: { type: Number, required: true }, // (rate * qty) - discountAmount
  
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true } // taxableAmount + taxAmount
}, { _id: false });

// Sub-schema for payments made at the time of sale
const paymentDetailSchema = new mongoose.Schema({
  paymentMode: { 
    type: String, 
    enum: ['cash', 'bank', 'cheque', 'upi', 'card', 'other'], 
    default: 'cash' 
  },
  amount: { type: Number, required: true },
  referenceNumber: { type: String, trim: true }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  stateOfSupply: { type: String, trim: true }, // For GST
  
  items: [saleItemSchema], // Use the new sub-schema
  
  subtotal: { type: Number, required: true }, // Sum of all 'taxableAmount'
  taxAmount: { type: Number, default: 0 },  // Sum of all 'taxAmount'
  roundOff: { type: Number, default: 0 },   // 'Round Off' value
  totalAmount: { type: Number, required: true }, // Final rounded amount
  
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  
  paymentDetails: [paymentDetailSchema], // Array of payments
  
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  
  notes: { type: String, trim: true }, // For "ADD DESCRIPTION"
  image: { type: String } // For "ADD IMAGE"
}, {
  timestamps: true
});

module.exports = mongoose.model('Sale', saleSchema);