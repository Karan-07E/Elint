const express = require('express');
const router = express.Router();
const controller = require('../controllers/accountsDashboardController');
const authenticateToken = require('../middleware/auth');

// Validation/Auth Middleware
// Accounts Dashboard accesible to 'admin' and 'accounts team'
const allowAccountsOrAdmin = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'accounts team') {
        return next();
    }
    return res.status(403).json({ message: 'Access denied. Accounts team or admin only.' });
};

// Routes
router.get('/orders/summary', authenticateToken, allowAccountsOrAdmin, controller.getOrdersSummary);
router.get('/employees', authenticateToken, allowAccountsOrAdmin, controller.getEmployees);
router.get('/employees/:employeeId/orders/summary', authenticateToken, allowAccountsOrAdmin, controller.getEmployeeStats);

module.exports = router;
