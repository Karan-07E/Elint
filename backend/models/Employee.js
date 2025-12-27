const mongoose = require('mongoose');

// Assigned item schema - tracks each item assigned to the employee
const assignedItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
    index: true
  },
  itemCode: {
    type: String,
    required: true,
    trim: true
  },
  itemName: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    trim: true
  },
  // Job number from Mapping schema (Format: EJB-00001)
  jobNumber: {
    type: String,
    trim: true
  },
  // Manufacturing status
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  // When item was assigned to this employee
  assignedAt: {
    type: Date,
    default: Date.now
  },
  // When manufacturing was started
  startedAt: {
    type: Date,
    default: null
  },
  // When item manufacturing was completed
  manufactureCompletedAt: {
    type: Date,
    default: null
  },
  // Priority from order
  priority: {
    type: String,
    enum: ['Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  // Delivery date from order
  deliveryDate: {
    type: Date
  },
  // Track manufacturing progress (percentage)
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Notes or remarks for this item
  notes: {
    type: String,
    trim: true
  }
}, { _id: false, timestamps: true });

// Main Employee schema
const employeeSchema = new mongoose.Schema({
  // Reference to User model
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  // Employee name (synced with User model)
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Employee ID (synced with User model)
  empId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  // Array of assigned items
  assignedItems: [assignedItemSchema],
  
  // Statistics
  totalItemsAssigned: {
    type: Number,
    default: 0
  },
  totalItemsCompleted: {
    type: Number,
    default: 0
  },
  totalItemsInProgress: {
    type: Number,
    default: 0
  },
  totalItemsPending: {
    type: Number,
    default: 0
  },
  
  // Activity tracking
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

// Compound indexes for efficient querying
employeeSchema.index({ userId: 1 });
employeeSchema.index({ empId: 1 });
employeeSchema.index({ 'assignedItems.orderId': 1 });
employeeSchema.index({ 'assignedItems.itemId': 1 });
employeeSchema.index({ 'assignedItems.status': 1 });

// Method to update last active timestamp
employeeSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to get items by status
employeeSchema.methods.getItemsByStatus = function(status) {
  return this.assignedItems.filter(item => item.status === status);
};

// Method to get items for a specific order
employeeSchema.methods.getItemsByOrder = function(orderId) {
  return this.assignedItems.filter(item => item.orderId.toString() === orderId.toString());
};

// Method to calculate and update statistics
employeeSchema.methods.calculateStats = function() {
  this.totalItemsAssigned = this.assignedItems.length;
  this.totalItemsCompleted = this.assignedItems.filter(item => item.status === 'completed').length;
  this.totalItemsInProgress = this.assignedItems.filter(item => item.status === 'in-progress').length;
  this.totalItemsPending = this.assignedItems.filter(item => item.status === 'pending').length;
};

// Method to mark item as started
employeeSchema.methods.startItem = function(itemId) {
  const item = this.assignedItems.find(i => i.itemId.toString() === itemId.toString());
  if (item && item.status === 'pending') {
    item.status = 'in-progress';
    item.startedAt = new Date();
    this.calculateStats();
  }
  return item;
};

// Method to mark item as completed
employeeSchema.methods.completeItem = function(itemId) {
  const item = this.assignedItems.find(i => i.itemId.toString() === itemId.toString());
  if (item && item.status !== 'completed') {
    item.status = 'completed';
    item.manufactureCompletedAt = new Date();
    item.progressPercentage = 100;
    this.calculateStats();
  }
  return item;
};

// Method to update item progress
employeeSchema.methods.updateItemProgress = function(itemId, percentage) {
  const item = this.assignedItems.find(i => i.itemId.toString() === itemId.toString());
  if (item) {
    item.progressPercentage = Math.min(Math.max(percentage, 0), 100);
    if (percentage > 0 && item.status === 'pending') {
      item.status = 'in-progress';
      item.startedAt = item.startedAt || new Date();
    }
    if (percentage === 100 && item.status !== 'completed') {
      item.status = 'completed';
      item.manufactureCompletedAt = new Date();
    }
    this.calculateStats();
  }
  return item;
};

module.exports = mongoose.model('Employee', employeeSchema);
