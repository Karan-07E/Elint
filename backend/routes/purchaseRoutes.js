// routes/purchaseRoutes.js (Combined)
const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Party = require('../models/Party');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Counter = require('../models/Counter');
const PDFDocument = require('pdfkit');
const authenticateToken = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all purchases
router.get('/', checkPermission('viewPurchases'), async (req, res) => {
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

// Get next bill number (for frontend convenience)
router.get('/next-bill', checkPermission('createPurchases'), async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate({ name: 'purchaseBill' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const seq = String(counter.seq).padStart(5, '0');
    const bill = `BILL-${new Date().getFullYear()}-${seq}`;
    res.json({ bill });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate PDF report for a purchase
router.get('/:id/report/pdf', checkPermission('viewPurchases'), async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('party')
      .populate('items.item');
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="purchase-${purchase.billNumber || purchase._id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('Elints ERP', { align: 'left' });
    doc.fontSize(10).text('Business Address Line 1', { align: 'left' });
    doc.moveUp();
    doc.fontSize(10).text(`Bill: ${purchase.billNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(purchase.billDate).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(1.2);

    // Supplier details
    doc.fontSize(12).text('Supplier:', { underline: true });
    const supplier = purchase.party || {};
    doc.fontSize(10).text(`${supplier.name || ''}`);
    if (supplier.billingAddress) {
      doc.text(`${supplier.billingAddress.street || ''}`);
    }
    if (supplier.phone) doc.text(`Phone: ${supplier.phone}`);

    doc.moveDown(0.8);

    // Table header
    const tableTop = doc.y + 10;
    const colNo = 40;
    const colDesc = 80;
    const colQty = 350;
    const colRate = 400;
    const colTax = 460;
    const colAmount = 520;

    doc.fontSize(10).text('No', colNo, tableTop, { width: 30 });
    doc.text('Description', colDesc, tableTop, { width: 260 });
    doc.text('Qty', colQty, tableTop, { width: 40, align: 'right' });
    doc.text('Rate', colRate, tableTop, { width: 50, align: 'right' });
    doc.text('Tax', colTax, tableTop, { width: 50, align: 'right' });
    doc.text('Amount', colAmount, tableTop, { width: 60, align: 'right' });

    let y = tableTop + 20;
    purchase.items.forEach((row, idx) => {
      const name = (row.item && row.item.name) || '—';
      const qty = row.quantity || 0;
      const rate = Number(row.rate || 0).toFixed(2);
      const tax = Number(row.taxAmount || 0).toFixed(2);
      const amount = Number(row.amount || 0).toFixed(2);

      doc.text(String(idx + 1), colNo, y);
      doc.text(name, colDesc, y, { width: 260 });
      doc.text(String(qty), colQty, y, { width: 40, align: 'right' });
      doc.text(`₹${rate}`, colRate, y, { width: 50, align: 'right' });
      doc.text(`₹${tax}`, colTax, y, { width: 50, align: 'right' });
      doc.text(`₹${amount}`, colAmount, y, { width: 60, align: 'right' });

      y += 20;
      if (y > 720) {
        doc.addPage();
        y = 40;
      }
    });

    // Totals
    doc.moveTo(40, y + 6).lineTo(560, y + 6).stroke();
    doc.fontSize(10).text(`Subtotal: ₹${Number(purchase.subtotal || 0).toFixed(2)}`, 400, y + 12, { align: 'right' });
    doc.text(`Tax: ₹${Number(purchase.taxAmount || 0).toFixed(2)}`, 400, y + 28, { align: 'right' });
    doc.fontSize(12).text(`Total: ₹${Number(purchase.totalAmount || 0).toFixed(2)}`, 400, y + 44, { align: 'right' });

    doc.moveDown(4);
    doc.text('For Elints ERP', 400);
    doc.moveDown(2);
    doc.text('Authorised Signatory', 400);

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get single purchase
router.get('/:id', checkPermission('viewPurchases'), async (req, res) => {
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
router.post('/', checkPermission('createPurchases'), async (req, res) => {
  try {
    // Ensure billNumber exists - if not, generate one
    if (!req.body.billNumber) {
      const counter = await Counter.findOneAndUpdate({ name: 'purchaseBill' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
      const seq = String(counter.seq).padStart(5, '0');
      req.body.billNumber = `BILL-${new Date().getFullYear()}-${seq}`;
    }

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
router.put('/:id', checkPermission('editPurchases'), async (req, res) => {
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
router.delete('/:id', checkPermission('deletePurchases'), async (req, res) => {
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