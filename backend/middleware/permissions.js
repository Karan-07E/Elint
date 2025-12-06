const User = require('../models/User');

// Middleware to check if user has specific permission
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Get user from database to get latest permissions
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Check if user has the specific permission
      if (user.permissions && user.permissions[permission] === true) {
        return next();
      }

      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to perform this action.',
        requiredPermission: permission
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// Middleware to check if user has any of the specified permissions
const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Check if user has any of the specified permissions
      const hasPermission = permissions.some(permission => 
        user.permissions && user.permissions[permission] === true
      );

      if (hasPermission) {
        return next();
      }

      return res.status(403).json({ 
        message: 'Access denied. You do not have permission to perform this action.',
        requiredPermissions: permissions
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

// Middleware to check if user has all of the specified permissions
const checkAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Admin has all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Check if user has all of the specified permissions
      const hasAllPermissions = permissions.every(permission => 
        user.permissions && user.permissions[permission] === true
      );

      if (hasAllPermissions) {
        return next();
      }

      return res.status(403).json({ 
        message: 'Access denied. You do not have all required permissions.',
        requiredPermissions: permissions
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Server error during permission check' });
    }
  };
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions
};
