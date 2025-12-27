const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Party = require('../models/Party');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Counter = require('../models/Counter');
const PDFDocument = require('pdfkit');
const authenticateToken = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all sales
router.get('/', checkPermission('viewSales'), async (req, res) => {
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

// Get next invoice number (for frontend convenience)
router.get('/next-invoice', checkPermission('createSales'), async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate({ name: 'saleInvoice' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const seq = String(counter.seq).padStart(5, '0');
    const invoice = `INV-${new Date().getFullYear()}-${seq}`;
    res.json({ invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Generate PDF report for a sale
router.get('/:id/report/pdf', checkPermission('viewSales'), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('party')
      .populate('items.item');
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // Create PDF with better layout
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sale-${sale.invoiceNumber || sale._id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.image && doc.moveDown();
    doc.fontSize(18).text('Elints ERP', { align: 'left' });
    doc.fontSize(10).text('Business Address Line 1', { align: 'left' });
    doc.moveUp();
    doc.fontSize(10).text(`Invoice: ${sale.invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(sale.invoiceDate).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(1.2);

    // Party details
    doc.fontSize(12).text('Bill To:', { underline: true });
    const party = sale.party || {};
    doc.fontSize(10).text(`${party.name || ''}`);
    if (party.billingAddress) {
      doc.text(`${party.billingAddress.street || ''}`);
    }
    if (party.phone) doc.text(`Phone: ${party.phone}`);

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
    sale.items.forEach((row, idx) => {
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
    doc.fontSize(10).text(`Subtotal: ₹${Number(sale.subtotal || 0).toFixed(2)}`, 400, y + 12, { align: 'right' });
    doc.text(`Tax: ₹${Number(sale.taxAmount || 0).toFixed(2)}`, 400, y + 28, { align: 'right' });
    doc.fontSize(12).text(`Total: ₹${Number(sale.totalAmount || 0).toFixed(2)}`, 400, y + 44, { align: 'right' });

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

// Get single sale
router.get('/:id', checkPermission('viewSales'), async (req, res) => {
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
router.post('/', checkPermission('createSales'), async (req, res) => {
  try {
    // Ensure invoiceNumber exists - if not, generate one
    if (!req.body.invoiceNumber) {
      const counter = await Counter.findOneAndUpdate({ name: 'saleInvoice' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
      const seq = String(counter.seq).padStart(5, '0');
      req.body.invoiceNumber = `INV-${new Date().getFullYear()}-${seq}`;
    }

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
router.put('/:id', checkPermission('editSales'), async (req, res) => {
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

// Get next invoice number (for frontend convenience)
router.get('/next-invoice', checkPermission('createSales'), async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate({ name: 'saleInvoice' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    const seq = String(counter.seq).padStart(5, '0');
    const invoice = `INV-${new Date().getFullYear()}-${seq}`;
    res.json({ invoice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete sale
router.delete('/:id', checkPermission('deleteSales'), async (req, res) => {
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