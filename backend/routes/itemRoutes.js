// routes/itemRoutes.js (Combined)
const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all transactions for a specific item
router.get('/:id/transactions', async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let transactions = [];

    // 1. Add Opening Stock as first transaction
    if (item.openingQty && parseFloat(item.openingQty) > 0) {
      transactions.push({
        id: 'opening',
        type: 'Opening Stock',
        ref: 'Opening',
        partyName: 'Opening Stock',
        date: item.asOfDate || item.createdAt,
        quantity: parseFloat(item.openingQty),
        rate: parseFloat(item.atPrice) || 0,
        status: 'Completed',
      });
    }

    // 2. Find Sales
    const sales = await Sale.find({ "items.item": itemId }).populate('party', 'name');
    sales.forEach(sale => {
      const itemInSale = sale.items.find(i => i.item.toString() === itemId);
      if (itemInSale) {
        transactions.push({
          id: `sale-${sale._id}`,
          type: 'Sale',
          ref: sale.invoiceNumber,
          partyName: sale.party?.name || 'N/A',
          date: sale.invoiceDate,
          quantity: -itemInSale.quantity, // Negative for sale
          rate: itemInSale.rate,
          status: sale.paymentStatus,
        });
      }
    });

    // 3. Find Purchases
    const purchases = await Purchase.find({ "items.item": itemId }).populate('party', 'name');
    purchases.forEach(purchase => {
      const itemInPurchase = purchase.items.find(i => i.item.toString() === itemId);
      if (itemInPurchase) {
        transactions.push({
          id: `purchase-${purchase._id}`,
          type: 'Purchase',
          ref: purchase.billNumber,
          partyName: purchase.party?.name || 'N/A',
          date: purchase.billDate,
          quantity: itemInPurchase.quantity, // Positive for purchase
          rate: itemInPurchase.rate,
          status: purchase.paymentStatus,
        });
      }
    });

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching item transactions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create item
router.post('/', async (req, res) => {
  try {
    console.log('Received item data:', JSON.stringify(req.body, null, 2));
    const item = new Item(req.body);
    const newItem = await item.save();
    console.log('Item saved successfully:', newItem._id);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(400).json({ message: error.message, error: error.toString() });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    Object.assign(item, req.body);
    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    await item.deleteOne();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;