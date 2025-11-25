const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  materialName: {
    type: String,
    trim: true
  },
  quantity: {
    type: String,
    default: ''
  },
  unit: {
    type: String,
    trim: true
  },
  costPerUnit: {
    type: String,
    default: ''
  },
  supplier: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  usedInProcessStep: {
    type: Number,
    default: null
  }
}, { _id: false });

const inspectionCheckSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  checkName: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  checkType: {
    type: String,
    enum: ['visual', 'measurement', 'functional', 'other'],
    default: 'visual'
  },
  acceptanceCriteria: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'passed', 'failed'],
    default: 'pending'
  }
}, { _id: false });

const subStepSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, { _id: false });

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
  subSteps: [subStepSchema],
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
    enum: ['product'],
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
    type: String
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

  // Current Stock - for tracking real-time inventory
  currentStock: {
    type: Number,
    default: 0
  },

  // Processes Section - Manufacturing steps
  processes: [processStepSchema],

  // Raw Materials Section
  rawMaterials: [rawMaterialSchema],

  // Inspection Check Section
  inspectionChecks: [inspectionCheckSchema]
}, {
  timestamps: true
});

// Pre-save hook to initialize currentStock from openingQty for new items
itemSchema.pre('save', function(next) {
  if (this.isNew && this.openingQty) {
    this.currentStock = parseFloat(this.openingQty) || 0;
  }
  next();
});

// Add indexes for frequently queried fields
itemSchema.index({ createdAt: -1 });
itemSchema.index({ name: 1 });
itemSchema.index({ code: 1 });
itemSchema.index({ type: 1 });

module.exports = mongoose.model('Item', itemSchema);