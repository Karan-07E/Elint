const express = require('express');
const router = express.Router();
const Party = require('../models/Party');
const authenticateToken = require('../middleware/auth');
const PartyFollowUp = require('../models/PartyFollowUp');
const { checkPermission } = require('../middleware/permissions');

// Apply authentication to all routes
router.use(authenticateToken);

// --- Party Follow Ups ---

// Get Follow Ups
router.get('/follow-ups', async (req, res) => {
  try {
    const { partyId } = req.query;
    const filter = partyId ? { partyId } : {};

    const followUps = await PartyFollowUp.find(filter)
      .sort({ meetingDateTime: -1 })
      .populate('createdBy', 'name email');

    res.json(followUps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Follow Up
router.post('/follow-ups', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.partyId || !req.body.meetingDateTime || !req.body.flag) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const followUp = new PartyFollowUp({
      ...req.body,
      createdBy: req.user.userId,
      createdByRole: req.user.role
    });

    const savedFollowUp = await followUp.save();
    res.status(201).json(savedFollowUp);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

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
