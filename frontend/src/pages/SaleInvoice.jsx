// src/pages/SaleInvoice.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getAllParties, getAllItems, createSale } from '../services/api';
import { BiGridVertical } from 'react-icons/bi';
import { FaTrashAlt } from 'react-icons/fa';

// Helper function to get a new blank item row
const createNewItemRow = () => ({
  id: Date.now(), // Unique key for React
  item: null, // Will store the full item object
  description: '', // For 'Colour' or other notes
  quantity: 1,
  unit: 'NONE',
  rate: 0,
  rateIncludesTax: false,
  discountType: 'percentage', // 'percentage' or 'flat'
  discountValue: 0,
  taxRate: 0,
});

const SaleInvoice = () => {
  const navigate = useNavigate();
  const [saleType, setSaleType] = useState('sale'); // 'sale', 'credit', 'cash'
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  
  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [stateOfSupply, setStateOfSupply] = useState('');
  const [itemRows, setItemRows] = useState([createNewItemRow()]);
  const [paymentType, setPaymentType] = useState('Cash');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(''); // Base64 string
  
  // Summary State
  const [roundOff, setRoundOff] = useState(true);
  const [receivedAmount, setReceivedAmount] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Fetch initial data for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const partiesRes = await getAllParties('customer');
        setParties(partiesRes.data || []);
        
        const itemsRes = await getAllItems();
        setItems(itemsRes.data || []);
      } catch (err) {
        setError('Failed to load parties or items.');
      }
    };
    fetchData();
  }, []);

  // Handle party selection
  const handlePartyChange = (partyId) => {
    const party = parties.find(p => p._id === partyId);
    setSelectedParty(party || null);
  };

  // Handle changes within an item row
  const handleItemRowChange = (index, field, value) => {
    const newRows = [...itemRows];
    const row = newRows[index];
    
    row[field] = value;

    // When an item is selected from the dropdown
    if (field === 'item') {
      const selectedItem = items.find(i => i._id === value);
      if (selectedItem) {
        row.item = selectedItem;
        row.unit = selectedItem.unit || 'NONE';
        row.taxRate = parseFloat(selectedItem.taxRate.replace(/[^0-9.]/g, '')) || 0;
        
        // Apply salePrice and tax type from Item model
        let rate = parseFloat(selectedItem.salePrice) || 0;
        if (selectedItem.salePriceTaxType === 'with') {
          row.rateIncludesTax = true;
          // Reverse calculate base price
          row.rate = rate / (1 + (row.taxRate / 100));
        } else {
          row.rateIncludesTax = false;
          row.rate = rate;
        }
      } else {
        row.item = null;
      }
    }
    
    // When rate-includes-tax toggle is changed
    if (field === 'rateIncludesTax') {
      const rate = parseFloat(row.rate) || 0;
      const taxRate = parseFloat(row.taxRate) || 0;
      
      if (value === true) { // Just changed TO "With Tax"
        // 'rate' field now holds the *base* price, so we must *add* tax to get the display value
        // But the logic is: the *input value* is now "With Tax"
        // This is tricky. Let's assume 'rate' always stores *base* price.
        // And the UI input will just be `rate * (1 + taxRate/100)`
        // This is simpler. We'll adjust the display input value.
      } else { // Just changed TO "Without Tax"
        // `rate` field is already base price.
      }
    }

    setItemRows(newRows);
  };

  const addNewRow = () => {
    setItemRows([...itemRows, createNewItemRow()]);
  };

  const removeRow = (index) => {
    if (itemRows.length > 1) {
      setItemRows(itemRows.filter((_, i) => i !== index));
    }
  };

  // --- Calculations ---
  const calculations = useMemo(() => {
    let subtotal = 0; // After discount, before tax
    let totalTax = 0;
    let grandTotal = 0;

    const calculatedRows = itemRows.map(row => {
      const qty = parseFloat(row.quantity) || 0;
      const rate = parseFloat(row.rate) || 0;
      const taxRate = parseFloat(row.taxRate) || 0;

      const lineTotal = qty * rate;
      
      // Calculate Discount
      let discountAmount = 0;
      const discountValue = parseFloat(row.discountValue) || 0;
      if (row.discountType === 'percentage') {
        discountAmount = (lineTotal * discountValue) / 100;
      } else { // 'flat'
        discountAmount = discountValue;
      }

      // Calculate Taxable Amount
      const taxableAmount = lineTotal - discountAmount;
      
      // Calculate Tax
      const taxAmount = (taxableAmount * taxRate) / 100;
      
      // Calculate Final Amount
      const amount = taxableAmount + taxAmount;
      
      subtotal += taxableAmount;
      totalTax += taxAmount;
      grandTotal += amount;
      
      return {
        ...row,
        discountAmount: discountAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        amount: amount.toFixed(2),
      };
    });

    let finalTotal = grandTotal;
    let roundOffValue = 0;
    if (roundOff) {
      finalTotal = Math.round(grandTotal);
      roundOffValue = (finalTotal - grandTotal).toFixed(2);
    }
    
    // Auto-fill "Received" if cash sale
    let finalReceived = parseFloat(receivedAmount) || 0;
    if (saleType === 'cash') {
      finalReceived = finalTotal;
    }
    
    const balance = finalTotal - finalReceived;

    return {
      calculatedRows,
      subtotal: subtotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      roundOffValue,
      finalTotal,
      balance: balance.toFixed(2),
      finalReceived,
    };
  }, [itemRows, roundOff, receivedAmount, saleType]);

  // Handle Save
  const handleSubmit = async () => {
    if (!selectedParty) {
      setError('Please select a customer.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const saleData = {
        party: selectedParty._id,
        invoiceNumber,
        invoiceDate,
        stateOfSupply,
        items: calculations.calculatedRows.map(row => ({
          item: row.item._id,
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          rate: row.rate,
          discountType: row.discountType,
          discountValue: row.discountValue,
          discountAmount: row.discountAmount,
          taxableAmount: parseFloat(row.amount) - parseFloat(row.taxAmount),
          taxRate: row.taxRate,
          taxAmount: row.taxAmount,
          amount: row.amount,
        })),
        subtotal: calculations.subtotal,
        taxAmount: calculations.totalTax,
        roundOff: calculations.roundOffValue,
        totalAmount: calculations.finalTotal,
        paidAmount: calculations.finalReceived,
        balanceAmount: calculations.balance,
        paymentStatus: calculations.balance == 0 ? 'paid' : (calculations.finalReceived > 0 ? 'partial' : 'unpaid'),
        notes: description,
        image: image || null,
        paymentDetails: [{
          paymentMode: paymentType.toLowerCase(),
          amount: calculations.finalReceived,
        }]
      };

      await createSale(saleData);
      setMessage('Sale created successfully!');
      // Reset form or navigate away
      navigate('/sales'); // Assuming you'll add a sales list page
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        
        {/* Page Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-800">Create Sale</h1>
            <div className="flex items-center bg-gray-200 rounded-full p-1">
              <button
                onClick={() => setSaleType('sale')}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                  saleType === 'sale' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                Sale
              </button>
              <button
                onClick={() => setSaleType('credit')}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                  saleType === 'credit' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                Credit
              </button>
              <button
                onClick={() => setSaleType('cash')}
                className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                  saleType === 'cash' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                Cash
              </button>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Customer Support: 📞 <span className="font-medium">+91 9333 911 911</span>
          </div>
        </div>

        {/* Main Invoice Form */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Top Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              {/* Customer */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Customer *</label>
                <select
                  value={selectedParty?._id || ''}
                  onChange={(e) => handlePartyChange(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                >
                  <option value="" disabled>Select Customer</option>
                  {parties.map(party => (
                    <option key={party._id} value={party._id}>{party.name}</option>
                  ))}
                </select>
                {selectedParty && (
                  <div className="mt-1 text-xs text-slate-500">
                    Bal: {selectedParty.currentBalance} ({selectedParty.balanceType})
                  </div>
                )}
              </div>
              
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone No.</label>
                <input
                  type="text"
                  value={selectedParty?.phone || ''}
                  readOnly
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm bg-gray-100"
                />
              </div>

              {/* Invoice # */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                />
              </div>

              {/* Billing Address */}
              <div className="row-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Billing Address</label>
                <textarea
                  value={selectedParty?.billingAddress?.street || ''}
                  readOnly
                  rows="3"
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm bg-gray-100"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                />
              </div>
              
              {/* State of Supply */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">State of supply</label>
                <select
                  value={stateOfSupply}
                  onChange={e => setStateOfSupply(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                >
                  <option value="">Select State</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  {/* ...add all states */}
                </select>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-xs text-slate-600 uppercase">
                <tr>
                  <th className="p-3 text-left w-6"></th>
                  <th className="p-3 text-left w-8">#</th>
                  <th className="p-3 text-left w-1/4">Item</th>
                  <th className="p-3 text-left w-1/6">Colour</th>
                  <th className="p-3 text-left">Qty</th>
                  <th className="p-3 text-left">Unit</th>
                  <th className="p-3 text-left">Price/Unit</th>
                  <th className="p-3 text-left" colSpan="2">Discount</th>
                  <th className="p-3 text-left" colSpan="2">Tax</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculations.calculatedRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-400 cursor-grab"><BiGridVertical /></td>
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    
                    {/* Item */}
                    <td className="p-3">
                      <select
                        value={row.item?._id || ''}
                        onChange={e => handleItemRowChange(index, 'item', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                      >
                        <option value="" disabled>Select Item</option>
                        {items.map(item => (
                          <option key={item._id} value={item._id}>{item.name}</option>
                        ))}
                      </select>
                    </td>
                    
                    {/* Colour/Description */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => handleItemRowChange(index, 'description', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </td>
                    
                    {/* Qty */}
                    <td className="p-3">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={e => handleItemRowChange(index, 'quantity', e.target.value)}
                        className="w-20 border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </td>
                    
                    {/* Unit */}
                    <td className="p-3">
                      <div className="px-2 py-1.5 border rounded-md bg-gray-100 text-xs">
                        {row.unit}
                      </div>
                    </td>
                    
                    {/* Price/Unit */}
                    <td className="p-3">
                      <div className="flex flex-col">
                        <input
                          type="number"
                          value={row.rate}
                          onChange={e => handleItemRowChange(index, 'rate', e.target.value)}
                          className="w-24 border-gray-300 rounded-md shadow-sm text-sm"
                        />
                        <select 
                          value={row.rateIncludesTax}
                          onChange={e => handleItemRowChange(index, 'rateIncludesTax', e.target.value === 'true')}
                          className="mt-1 w-24 border-0 p-0 pl-1 text-xs"
                        >
                          <option value={false}>Without Tax</option>
                          <option value={true}>With Tax</option>
                        </select>
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="p-3">
                      <input
                        type="number"
                        value={row.discountValue}
                        onChange={e => handleItemRowChange(index, 'discountValue', e.target.value)}
                        className="w-16 border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={row.discountType}
                        onChange={e => handleItemRowChange(index, 'discountType', e.target.value)}
                        className="w-20 border-gray-300 rounded-md shadow-sm text-sm"
                      >
                        <option value="percentage">%</option>
                        <option value="flat">Amt</option>
                      </select>
                      <div className="text-xs text-slate-500">({row.discountAmount})</div>
                    </td>
                    
                    {/* Tax */}
                    <td className="p-3">
                      <select
                        value={row.taxRate}
                        onChange={e => handleItemRowChange(index, 'taxRate', e.target.value)}
                        className="w-24 border-gray-300 rounded-md shadow-sm text-sm"
                      >
                        <option value="0">GST@0%</option>
                        <option value="5">GST@5%</option>
                        <option value="12">GST@12%</option>
                        <option value="18">GST@18%</option>
                        <option value="28">GST@28%</option>
                      </select>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      <div>({row.taxAmount})</div>
                    </td>

                    {/* Amount */}
                    <td className="p-3 font-medium text-slate-800">
                      {row.amount}
                    </td>
                    
                    {/* Delete Row */}
                    <td className="p-3">
                      <button onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600">
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={addNewRow}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-md text-sm font-medium"
            >
              + Add Row
            </button>
          </div>

          {/* Bottom Section: Payment & Summary */}
          <div className="p-6 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-8">
            {/* Left Panel */}
            <div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Type</label>
                <select
                  value={paymentType}
                  onChange={e => setPaymentType(e.target.value)}
                  className="w-1/2 border-gray-300 rounded-md shadow-sm text-sm"
                >
                  <option>Cash</option>
                  <option>Bank</option>
                  <option>Cheque</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </div>
              
              <div className="space-y-3 text-sm">
                <a href="#" className="text-blue-600 font-medium">+ Add Payment type</a>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <textarea
                    rows="2"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                  ></textarea>
                </div>
                <a href="#" className="text-blue-600 font-medium">+ Add Image</a>
              </div>
            </div>

            {/* Right Panel: Summary Box */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Subtotal</span>
                <span className="text-sm font-medium text-slate-800">{calculations.subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Tax</span>
                <span className="text-sm font-medium text-slate-800">{calculations.totalTax}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <input
                    type="checkbox"
                    id="roundOff"
                    checked={roundOff}
                    onChange={e => setRoundOff(e.target.checked)}
                    className="mr-2 rounded text-blue-600"
                  />
                  <label htmlFor="roundOff" className="text-sm text-slate-600">Round Off</label>
                </div>
                <span className="text-sm font-medium text-slate-800">{calculations.roundOffValue}</span>
              </div>
              
              <hr />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-800">Total</span>
                <span className="text-lg font-semibold text-slate-800">₹{calculations.finalTotal}</span>
              </div>

              <div className="flex justify-between items-center">
                <label htmlFor="received" className="text-sm text-slate-600">Received</label>
                <input
                  type="number"
                  id="received"
                  value={calculations.finalReceived}
                  onChange={e => setReceivedAmount(e.target.value)}
                  disabled={saleType === 'cash'}
                  className="w-32 border-gray-300 rounded-md shadow-sm text-sm text-right font-medium"
                />
              </div>

              <div className="bg-blue-100 p-3 rounded-md flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">Balance</span>
                <span className="text-sm font-medium text-blue-800">₹{calculations.balance}</span>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex justify-between items-center mt-6">
          <button className="text-blue-600 font-medium text-sm">
            Generate e-Invoice
          </button>
          
          <div className="flex gap-3">
            <button className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50">
              ...
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SaleInvoice;