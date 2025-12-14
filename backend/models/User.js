const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'accounts team', 'employee', 'product team'], 
    default: 'user' 
  },
  employeeId: { 
    type: String, 
    unique: true, 
    sparse: true // Allows null values, only enforces uniqueness when present
  },
  teamLeaderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null // null means this user is not under any team lead
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  permissions: {
    // Items Management
    viewItems: { type: Boolean, default: true },
    createItems: { type: Boolean, default: false },
    editItems: { type: Boolean, default: false },
    deleteItems: { type: Boolean, default: false },
    
    // Parties Management
    viewParties: { type: Boolean, default: true },
    createParties: { type: Boolean, default: false },
    editParties: { type: Boolean, default: false },
    deleteParties: { type: Boolean, default: false },
    
    // Sales Management
    viewSales: { type: Boolean, default: true },
    createSales: { type: Boolean, default: false },
    editSales: { type: Boolean, default: false },
    deleteSales: { type: Boolean, default: false },
    
    // Purchase Management
    viewPurchases: { type: Boolean, default: true },
    createPurchases: { type: Boolean, default: false },
    editPurchases: { type: Boolean, default: false },
    deletePurchases: { type: Boolean, default: false },
    
    // Order Management
    viewOrders: { type: Boolean, default: true },
    createOrders: { type: Boolean, default: false },
    editOrders: { type: Boolean, default: false },
    deleteOrders: { type: Boolean, default: false },
    
    // Reports
    viewReports: { type: Boolean, default: true },
    exportReports: { type: Boolean, default: false },
    
    // Settings
    viewSettings: { type: Boolean, default: true },
    editSettings: { type: Boolean, default: false },
    
    // User Management (Admin only)
    manageUsers: { type: Boolean, default: false },
  },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
