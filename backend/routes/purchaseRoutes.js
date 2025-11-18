// routes/purchaseRoutes.js (Combined)
const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Party = require('../models/Party');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('party', 'name phone')
      .populate('items.item', 'name')
      .sort({ billDate: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single purchase
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('party')
      .populate('items.item');
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create purchase - WITH TRANSACTION SUPPORT
router.post('/', async (req, res) => {
  try {
    const purchase = new Purchase(req.body);
    const newPurchase = await purchase.save();

    // 1. Update party balance
    const party = await Party.findById(req.body.party);
    if (party) {
      party.currentBalance += req.body.balanceAmount;
      // Balance type logic
      if (party.currentBalance > 0) {
        party.balanceType = 'payable';
      }
      await party.save();
    }

    // 2. Update item stock (FIXED - using atomic update)
    for (const purchaseItem of req.body.items) {
      const item = await Item.findById(purchaseItem.item);
      if (item && item.type === 'product') {
        // Use $inc for atomic update, ADDING the quantity
        await Item.updateOne(
          { _id: purchaseItem.item },
          { $inc: { currentStock: purchaseItem.quantity } }
        );
      }
    }
    
    // 3. Create linked transaction if payment was made
    if (req.body.paidAmount > 0 && req.body.paymentDetails && req.body.paymentDetails.length > 0) {
      const payment = req.body.paymentDetails[0];
      
      const transaction = new Transaction({
        party: req.body.party,
        type: 'payment_out',
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        referenceNumber: payment.referenceNumber,
        transactionDate: req.body.billDate,
        description: `Payment for Bill ${req.body.billNumber}`,
        linkedDocument: {
          documentType: 'purchase',
          documentId: newPurchase._id
        }
      });
      await transaction.save();
      
      // 4. Update party balance AGAIN to reflect payment
      if (party) {
        party.currentBalance -= payment.amount; // Subtract payment from balance
        await party.save();
      }
    }

    res.status(201).json(newPurchase);
  } catch (error) {
    console.error("Error creating purchase:", error);
    res.status(400).json({ message: error.message });
  }
});

// Update purchase - WITH STOCK REVERSAL LOGIC
router.put('/:id', async (req, res) => {
  try {
    const oldPurchase = await Purchase.findById(req.params.id);
    if (!oldPurchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // 1. Revert old stock quantities
    for (const oldItem of oldPurchase.items) {
      const item = await Item.findById(oldItem.item);
      if (item && item.type === 'product') {
        await Item.updateOne(
          { _id: oldItem.item },
          { $inc: { currentStock: -oldItem.quantity } }
        );
      }
    }

    // 2. Revert old party balance
    const party = await Party.findById(oldPurchase.party);
    if (party) {
      party.currentBalance -= oldPurchase.balanceAmount;
      await party.save();
    }

    // 3. Update purchase with new data
    Object.assign(oldPurchase, req.body);
    const updatedPurchase = await oldPurchase.save();

    // 4. Apply new stock quantities
    for (const newItem of req.body.items) {
      const item = await Item.findById(newItem.item);
      if (item && item.type === 'product') {
        await Item.updateOne(
          { _id: newItem.item },
          { $inc: { currentStock: newItem.quantity } }
        );
      }
    }

    // 5. Apply new party balance
    if (party) {
      party.currentBalance += req.body.balanceAmount;
      if (party.currentBalance > 0) {
        party.balanceType = 'payable';
      }
      await party.save();
    }

    res.json(updatedPurchase);
  } catch (error) {
    console.error("Error updating purchase:", error);
    res.status(400).json({ message: error.message });
  }
});

// Delete purchase - WITH STOCK AND BALANCE REVERSAL
router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // 1. Revert stock quantities
    for (const purchaseItem of purchase.items) {
      const item = await Item.findById(purchaseItem.item);
      if (item && item.type === 'product') {
        await Item.updateOne(
          { _id: purchaseItem.item },
          { $inc: { currentStock: -purchaseItem.quantity } }
        );
      }
    }

    // 2. Revert party balance
    const party = await Party.findById(purchase.party);
    if (party) {
      party.currentBalance -= purchase.balanceAmount;
      if (party.currentBalance < 0) {
        party.balanceType = 'receivable';
      } else if (party.currentBalance > 0) {
        party.balanceType = 'payable';
      }
      await party.save();
    }

    // 3. Delete linked transaction if exists
    await Transaction.deleteMany({
      'linkedDocument.documentType': 'purchase',
      'linkedDocument.documentId': purchase._id
    });

    // 4. Delete purchase
    await purchase.deleteOne();
    
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;