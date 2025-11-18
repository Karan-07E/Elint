const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Party = require('../models/Party');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// Get all sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('party', 'name phone')
      .populate('items.item', 'name')
      .sort({ invoiceDate: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('party')
      .populate('items.item');
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create sale - REVISED LOGIC
router.post('/', async (req, res) => {
  try {
    const sale = new Sale(req.body);
    const newSale = await sale.save();

    // 1. Update party balance
    const party = await Party.findById(req.body.party);
    if (party) {
      party.currentBalance += req.body.balanceAmount;
      // This flip-flopping logic is dangerous, but consistent with your code
      if (party.currentBalance > 0) {
        party.balanceType = 'receivable'; 
      }
      await party.save();
    }

    // 2. Update item stock (FIXED - using atomic $inc)
    for (const saleItem of req.body.items) {
      const item = await Item.findById(saleItem.item);
      if (item && item.type === 'product') {
        // Use $inc for atomic update, subtracting the quantity
        await Item.updateOne(
          { _id: saleItem.item },
          { $inc: { currentStock: -saleItem.quantity } }
        );
      }
    }
    
    // 3. Create linked transaction if payment was made
    if (req.body.paidAmount > 0 && req.body.paymentDetails && req.body.paymentDetails.length > 0) {
      const payment = req.body.paymentDetails[0]; // Assuming one payment for now
      
      const transaction = new Transaction({
        party: req.body.party,
        type: 'payment_in',
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        referenceNumber: payment.referenceNumber,
        transactionDate: req.body.invoiceDate,
        description: `Payment for Invoice ${req.body.invoiceNumber}`,
        linkedDocument: {
          documentType: 'sale',
          documentId: newSale._id
        }
      });
      await transaction.save();
      
      // 4. Update party balance AGAIN to reflect payment
      if (party) {
        party.currentBalance -= payment.amount;
        await party.save();
      }
    }

    res.status(201).json(newSale);
  } catch (error) {
    console.error("Error creating sale:", error);
    res.status(400).json({ message: error.message });
  }
});

// Update sale
router.put('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // TODO: Add logic to revert stock/balance changes before updating
    // This requires storing original values and calculating differences

    Object.assign(sale, req.body);
    const updatedSale = await sale.save();
    res.json(updatedSale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    // TODO: Add logic to revert stock and balance changes
    // Before deleting, you should:
    // 1. Add back the stock quantities
    // 2. Adjust party balance
    // 3. Delete linked transactions

    await sale.deleteOne();
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;