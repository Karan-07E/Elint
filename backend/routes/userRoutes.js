const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// GET all users (admin only)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('teamLeaderId', 'name email employeeId')
      .sort({ date: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single user by ID (admin only)
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate employee ID
const generateEmployeeId = async (role, teamLeaderId) => {
  if (role === 'accounts team') {
    // Find highest ACC number
    const lastTeam = await User.findOne({ role: 'accounts team', employeeId: { $regex: /^ACC\d+$/ } })
      .sort({ employeeId: -1 });
    const lastNum = lastTeam ? parseInt(lastTeam.employeeId.substring(3)) : 0;
    return `ACC${String(lastNum + 1).padStart(2, '0')}`;
  } else if (role === 'product team') {
    // Find highest PROD number
    const lastTeam = await User.findOne({ role: 'product team', employeeId: { $regex: /^PROD\d+$/ } })
      .sort({ employeeId: -1 });
    const lastNum = lastTeam ? parseInt(lastTeam.employeeId.substring(4)) : 0;
    return `PROD${String(lastNum + 1).padStart(2, '0')}`;
  } else if (role === 'accounts employee' && teamLeaderId) {
    // Get team leader's ID prefix
    const teamLeader = await User.findById(teamLeaderId);
    if (!teamLeader || !teamLeader.employeeId) {
      throw new Error('Invalid team leader');
    }
    // Find highest employee number under this team
    const lastEmp = await User.findOne({ 
      role: 'accounts employee', 
      teamLeaderId: teamLeaderId,
      employeeId: { $regex: new RegExp(`^${teamLeader.employeeId}EMP\\d+$`) }
    }).sort({ employeeId: -1 });
    const lastNum = lastEmp ? parseInt(lastEmp.employeeId.substring(teamLeader.employeeId.length + 3)) : 0;
    return `${teamLeader.employeeId}EMP${String(lastNum + 1).padStart(2, '0')}`;
  } else if (role === 'product employee' && teamLeaderId) {
    // Get team leader's ID prefix
    const teamLeader = await User.findById(teamLeaderId);
    if (!teamLeader || !teamLeader.employeeId) {
      throw new Error('Invalid team leader');
    }
    // Find highest employee number under this team
    const lastEmp = await User.findOne({ 
      role: 'product employee', 
      teamLeaderId: teamLeaderId,
      employeeId: { $regex: new RegExp(`^${teamLeader.employeeId}EMP\\d+$`) }
    }).sort({ employeeId: -1 });
    const lastNum = lastEmp ? parseInt(lastEmp.employeeId.substring(teamLeader.employeeId.length + 3)) : 0;
    return `${teamLeader.employeeId}EMP${String(lastNum + 1).padStart(2, '0')}`;
  }
  return null; // admin and regular users don't get employee IDs
};

// CREATE new user (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, password, role, teamLeaderId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate employee roles require teamLeaderId
    if ((role === 'accounts employee' || role === 'product employee') && !teamLeaderId) {
      return res.status(400).json({ message: 'Team leader is required for employee roles' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate employee ID
    const employeeId = await generateEmployeeId(role, teamLeaderId);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      role,
      employeeId,
      teamLeaderId: teamLeaderId || null
    });
    await newUser.save();

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        employeeId: newUser.employeeId,
        teamLeaderId: newUser.teamLeaderId,
        date: newUser.date
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// UPDATE user (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, role, password, permissions } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (permissions) {
      user.permissions = { ...user.permissions, ...permissions };
    }

    await user.save();

    res.json({ 
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        date: user.date
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE user permissions only (admin only)
router.patch('/:id/permissions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { permissions } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update permissions
    user.permissions = { ...user.permissions.toObject(), ...permissions };
    await user.save();

    res.json({ 
      message: 'Permissions updated successfully',
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE user (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // If deleting a team leader, also delete or reassign their employees
    const employees = await User.find({ teamLeaderId: req.params.id });
    if (employees.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete team leader with ${employees.length} employee(s). Please reassign or delete employees first.`,
        employeeCount: employees.length
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET team leaders only (admin only)
router.get('/teams/leaders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const teamLeaders = await User.find({
      role: { $in: ['accounts team', 'product team'] }
    }).select('-password').sort({ employeeId: 1 });
    res.json(teamLeaders);
  } catch (error) {
    console.error('Get team leaders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET employees under a team leader (admin only)
router.get('/teams/:leaderId/employees', authenticateToken, isAdmin, async (req, res) => {
  try {
    const employees = await User.find({
      teamLeaderId: req.params.leaderId
    }).select('-password').sort({ employeeId: 1 });
    res.json(employees);
  } catch (error) {
    console.error('Get team employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
