const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const authenticateToken = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all parties
router.get('/', checkPermission('viewParties'), async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const parties = await Party.find(filter).sort({ createdAt: -1 });
    res.json(parties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single party
router.get('/:id', checkPermission('viewParties'), async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    res.json(party);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create party
router.post('/', checkPermission('createParties'), async (req, res) => {
  try {
    const party = new Party({
      ...req.body,
      currentBalance: req.body.openingBalance || 0
    });
    const newParty = await party.save();
    res.status(201).json(newParty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update party
router.put('/:id', checkPermission('editParties'), async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }

    Object.assign(party, req.body);
    const updatedParty = await party.save();
    res.json(updatedParty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete party
router.delete('/:id', checkPermission('deleteParties'), async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    await party.deleteOne();
    res.json({ message: 'Party deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
