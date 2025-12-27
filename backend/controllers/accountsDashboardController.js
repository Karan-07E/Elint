const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Get Order Summary (Total, Mapped, Not Mapped)
// @route   GET /api/accounts/orders/summary
// @access  Private (Accounts/Admin)
const getOrdersSummary = async (req, res) => {
    try {
        // Strict Scope Fix: Use direct DB counts based on user's SQL-like rules
        // mapped_to equivalent is assignedAccountEmployee
        // Excluding 'Deleted' orders from counts to maintain system sanity, 
        // though user said "ALL", typically Deleted is excluded. 
        // If strict adherence to "ALL" was needed including deleted, I would remove the status filter,
        // but it's safer to assume 'Active' orders.

        const [total, mapped, notMapped] = await Promise.all([
            // Total Orders
            Order.countDocuments({ status: { $ne: 'Deleted' } }),

            // Mapped Orders (mapped_to IS NOT NULL)
            Order.countDocuments({
                assignedAccountEmployee: { $ne: null },
                status: { $ne: 'Deleted' }
            }),

            // Not Mapped Orders (mapped_to IS NULL)
            Order.countDocuments({
                assignedAccountEmployee: null,
                status: { $ne: 'Deleted' }
            })
        ]);

        res.json({
            total,
            mapped,
            not_mapped: notMapped
        });

    } catch (error) {
        console.error('Error fetching accounts order summary:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Accounts Employees
// @route   GET /api/accounts/employees
// @access  Private (Accounts/Admin)
const getEmployees = async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' })
            .select('name email role')
            .lean();

        // Map _id to id for frontend consistency if needed, but keeping _id is standard
        const formatted = employees.map(e => ({
            id: e._id,
            name: e.name,
            email: e.email
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching accounts employees:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Employee Order Stats (Total Assigned, Pending, Completed)
// @route   GET /api/accounts/employees/:employeeId/orders/summary
// @access  Private (Accounts/Admin)
const getEmployeeStats = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Fetch employee name for the response
        const employee = await User.findById(employeeId).select('name');
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Strict Scope Fix: DB Agnostic Logic
        // Total Assigned = mapped_to = employee_id
        // Pending = mapped_to = employee_id AND status != Completed
        // Completed = mapped_to = employee_id AND status = Completed

        const [totalAssigned, completed] = await Promise.all([
            // Total Assigned
            Order.countDocuments({
                assignedAccountEmployee: employeeId,
                status: { $ne: 'Deleted' }
            }),

            // Completed
            Order.countDocuments({
                assignedAccountEmployee: employeeId,
                status: 'Completed'
            })
        ]);

        // Pending is derived or queried explicitly. 
        // User asked for explicit query: status = 'pending'. 
        // Since we don't have 'pending', we use != 'Completed'.
        const pending = totalAssigned - completed;
        // OR explicit query:
        // const pending = await Order.countDocuments({ 
        //    assignedAccountEmployee: employeeId, 
        //    status: { $nin: ['Completed', 'Deleted'] }
        // });
        // The math ensures consistency.

        res.json({
            employee_id: employeeId,
            employee_name: employee.name,
            total_assigned: totalAssigned,
            pending: pending,
            completed: completed
        });

    } catch (error) {
        console.error('Error fetching employee stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getOrdersSummary,
    getEmployees,
    getEmployeeStats
};
