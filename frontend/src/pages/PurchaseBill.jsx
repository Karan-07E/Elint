// src/pages/PurchaseBill.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getAllParties, getAllItems, createPurchase } from '../services/api'; // Use createPurchase
import { BiGridVertical } from 'react-icons/bi';
import { FaTrashAlt } from 'react-icons/fa';

// Helper function to get a new blank item row
const createNewItemRow = () => ({
  id: Date.now(),
  item: null,
  description: '', // Colour
  quantity: 1,
  unit: 'NONE',
  rate: 0,
  rateIncludesTax: false,
  discountType: 'percentage',
  discountValue: 0,
  taxRate: 0,
});

const PurchaseBill = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  
  // Form State
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [stateOfSupply, setStateOfSupply] = useState('');
  const [itemRows, setItemRows] = useState([createNewItemRow()]);
  const [paymentType, setPaymentType] = useState('Cash');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  
  // Summary State
  const [roundOff, setRoundOff] = useState(true);
  const [paidAmount, setPaidAmount] = useState(0); // Renamed from receivedAmount
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch suppliers or 'both'
        const partiesRes = await getAllParties('supplier');
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

    // When an item is selected
    if (field === 'item') {
      const selectedItem = items.find(i => i._id === value);
      if (selectedItem) {
        row.item = selectedItem;
        row.unit = selectedItem.unit || 'NONE';
        row.taxRate = parseFloat(selectedItem.taxRate.replace(/[^0-9.]/g, '')) || 0;
        
        // Use PURCHASE price
        let rate = parseFloat(selectedItem.purchasePrice) || 0;
        if (selectedItem.purchasePriceTaxType === 'with') {
          row.rateIncludesTax = true;
          row.rate = rate / (1 + (row.taxRate / 100));
        } else {
          row.rateIncludesTax = false;
          row.rate = rate;
        }
      } else {
        row.item = null;
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

  // --- Calculations (Same as SaleInvoice) ---
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;

    const calculatedRows = itemRows.map(row => {
      const qty = parseFloat(row.quantity) || 0;
      const rate = parseFloat(row.rate) || 0;
      const taxRate = parseFloat(row.taxRate) || 0;

      const lineTotal = qty * rate;
      
      let discountAmount = 0;
      const discountValue = parseFloat(row.discountValue) || 0;
      if (row.discountType === 'percentage') {
        discountAmount = (lineTotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }

      const taxableAmount = lineTotal - discountAmount;
      const taxAmount = (taxableAmount * taxRate) / 100;
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
    
    const finalPaid = parseFloat(paidAmount) || 0;
    const balance = finalTotal - finalPaid;

    return {
      calculatedRows,
      subtotal: subtotal.toFixed(2),
      totalTax: totalTax.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      roundOffValue,
      finalTotal,
      balance: balance.toFixed(2),
      finalPaid,
    };
  }, [itemRows, roundOff, paidAmount]);

  // Handle Save
  const handleSubmit = async () => {
    if (!selectedParty) {
      setError('Please select a party.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const purchaseData = {
        party: selectedParty._id,
        billNumber,
        billDate,
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
        paidAmount: calculations.finalPaid,
        balanceAmount: calculations.balance,
        paymentStatus: calculations.balance == 0 ? 'paid' : (calculations.finalPaid > 0 ? 'partial' : 'unpaid'),
        notes: description,
        image: image || null,
        paymentDetails: [{
          paymentMode: paymentType.toLowerCase(),
          amount: calculations.finalPaid,
        }]
      };
      
      // Use createPurchase from api.js
      await createPurchase(purchaseData);
      setMessage('Purchase created successfully!');
      navigate('/purchase'); // Navigate to the new purchase dashboard
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create purchase.');
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
          <h1 className="text-2xl font-semibold text-slate-800">Create Purchase Bill</h1>
        </div>

        {/* Main Invoice Form */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Top Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              {/* Party */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Party *</label>
                <select
                  value={selectedParty?._id || ''}
                  onChange={(e) => handlePartyChange(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                >
                  <option value="" disabled>Select Party/Supplier</option>
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

              {/* Bill # */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bill Number</label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={e => setBillNumber(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                />
              </div>

              {/* Billing Address (Not in screenshot, but good to have) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Billing Address</label>
                <textarea
                  value={selectedParty?.billingAddress?.street || ''}
                  readOnly
                  rows="1"
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm bg-gray-100"
                />
              </div>

              {/* Bill Date */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bill Date</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={e => setBillDate(e.target.value)}
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
                </select>
              </div>
            </div>
          </div>

          {/* Items Table (Identical to SaleInvoice) */}
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
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => handleItemRowChange(index, 'description', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={e => handleItemRowChange(index, 'quantity', e.target.value)}
                        className="w-20 border-gray-300 rounded-md shadow-sm text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <div className="px-2 py-1.5 border rounded-md bg-gray-100 text-xs">
                        {row.unit}
                      </div>
                    </td>
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
                    <td className="p-3 font-medium text-slate-800">
                      {row.amount}
                    </td>
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
              {/* ... (Subtotal, Tax, Round Off are identical to SaleInvoice) ... */}
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
                <label htmlFor="paid" className="text-sm text-slate-600">Paid</label>
                <input
                  type="number"
                  id="paid"
                  value={calculations.finalPaid}
                  onChange={e => setPaidAmount(e.target.value)}
                  className="w-32 border-gray-300 rounded-md shadow-sm text-sm text-right font-medium"
                />
              </div>

              <div className="bg-red-100 p-3 rounded-md flex justify-between items-center">
                <span className="text-sm font-medium text-red-800">Balance</span>
                <span className="text-sm font-medium text-red-800">₹{calculations.balance}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex justify-end items-center mt-6">
          <div className="flex gap-3">
            <button className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50">
              Share
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

export default PurchaseBill;