const mongoose = require('mongoose');

// Sub-step tracking schema
const subStepTrackingSchema = new mongoose.Schema({
  subStepId: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

// Step tracking schema
const stepTrackingSchema = new mongoose.Schema({
  stepId: {
    type: Number,
    required: true
  },
  stepName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  subSteps: [subStepTrackingSchema]
}, { _id: false });

// Item tracking schema
const itemTrackingSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  itemName: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number
  },
  unit: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  steps: [stepTrackingSchema]
}, { _id: false });

// Order tracking schema
const orderTrackingSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  poNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['assigned', 'in-progress', 'completed'],
    default: 'assigned'
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  items: [itemTrackingSchema]
}, { _id: false });

// Main Employee schema
const employeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  empId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  ordersAssigned: [orderTrackingSchema],
  
  // Statistics and metadata
  totalOrdersCompleted: {
    type: Number,
    default: 0
  },
  totalItemsCompleted: {
    type: Number,
    default: 0
  },
  totalStepsCompleted: {
    type: Number,
    default: 0
  },
  totalSubStepsCompleted: {
    type: Number,
    default: 0
  },
  
  // Active tracking
  isActive: {
    type: Boolean,
    default: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
employeeSchema.index({ userId: 1 });
employeeSchema.index({ empId: 1 });
employeeSchema.index({ 'ordersAssigned.orderId': 1 });

// Method to update last active timestamp
employeeSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to get active orders (not completed)
employeeSchema.methods.getActiveOrders = function() {
  return this.ordersAssigned.filter(order => order.status !== 'completed');
};

// Method to calculate completion statistics
employeeSchema.methods.calculateStats = function() {
  let completedOrders = 0;
  let completedItems = 0;
  let completedSteps = 0;
  let completedSubSteps = 0;

  this.ordersAssigned.forEach(order => {
    if (order.status === 'completed') completedOrders++;
    
    order.items.forEach(item => {
      if (item.status === 'completed') completedItems++;
      
      item.steps.forEach(step => {
        if (step.status === 'completed') completedSteps++;
        
        step.subSteps.forEach(subStep => {
          if (subStep.status === 'completed') completedSubSteps++;
        });
      });
    });
  });

  this.totalOrdersCompleted = completedOrders;
  this.totalItemsCompleted = completedItems;
  this.totalStepsCompleted = completedSteps;
  this.totalSubStepsCompleted = completedSubSteps;
};

module.exports = mongoose.model('Employee', employeeSchema);
