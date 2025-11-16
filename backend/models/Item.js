const mongoose = require('mongoose');

const processStepSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  stepName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  details: {
    type: String,
    trim: true
  },
  stepType: {
    type: String,
    enum: ['execution', 'testing'],
    default: 'execution'
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, { _id: false });

const itemSchema = new mongoose.Schema({
  // Basic Information
  type: {
    type: String,
    enum: ['product', 'service'],
    default: 'product'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  hsn: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    type: String // image
  },

  // Pricing Section
  salePrice: {
    type: String,
    default: ''
  },
  salePriceTaxType: {
    type: String,
    enum: ['without', 'with'],
    default: 'without'
  },
  saleDiscountType: {
    type: String,
    enum: ['percentage', 'flat'],
    default: 'percentage'
  },
  purchasePrice: {
    type: String,
    default: ''
  },
  purchasePriceTaxType: {
    type: String,
    enum: ['without', 'with'],
    default: 'without'
  },
  taxRate: {
    type: String,
    default: 'None'
  },

  // Stock Section
  openingQty: {
    type: String,
    default: ''
  },
  atPrice: {
    type: String,
    default: ''
  },
  asOfDate: {
    type: Date
  },
  minStock: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    trim: true
  },

  // Processes Section - Manufacturing steps
  processes: [processStepSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Item', itemSchema);
