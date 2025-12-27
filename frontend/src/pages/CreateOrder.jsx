import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getAllParties, getAllItems, createOrder } from '../services/api';
import { BiGridVertical } from 'react-icons/bi';
import { FaTrashAlt, FaSave, FaArrowLeft } from 'react-icons/fa';

// Helper to get today's date string YYYY-MM-DD
const getTodayString = () => new Date().toISOString().slice(0, 10);

const createNewItemRow = () => ({
  id: Date.now(),
  item: null,
  itemName: '',
  quantity: 1,
  unit: 'NONE',
  rate: 0,
  amount: 0,
  deliveryDate: '', // ✅ NEW: Item specific delivery date
  priority: 'Normal'
});

const CreateOrder = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyInput, setPartyInput] = useState('');
  
  // Form State
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(getTodayString());
  const [estDate, setEstDate] = useState(''); // Overall Delivery Date
  // Order-level priority removed; item-level priority will be used
  const [itemRows, setItemRows] = useState([createNewItemRow()]);
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partiesRes, itemsRes] = await Promise.all([
          getAllParties('customer'),
          getAllItems()
        ]);
        setParties(partiesRes.data || []);
        setItems(itemsRes.data || []);
      } catch (err) {
        setError('Failed to load required data.');
      }
    };
    fetchData();
  }, []);

  const handleItemRowChange = (index, field, value) => {
    const newRows = [...itemRows];
    const row = newRows[index];
    
    row[field] = value;

    if (field === 'item') {
      // value can be an item id or an item name (from datalist). Try to match by id first, then by name.
      let selectedItem = items.find(i => i._id === value);
      if (!selectedItem) {
        selectedItem = items.find(i => i.name.toLowerCase() === String(value).toLowerCase());
      }
      if (selectedItem) {
        row.item = selectedItem._id;
        row.itemName = selectedItem.name;
        row.unit = selectedItem.unit || 'NONE';
        row.rate = parseFloat(selectedItem.salePrice) || 0;
      } else {
        // If user typed a free-text item name, store it as itemName and clear item id
        row.item = null;
        row.itemName = value;
      }
    }
    
    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate' || field === 'item') {
      row.amount = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0);
    }

    setItemRows(newRows);
  };

  // Helper to set all item dates to the overall date
  const applyOverallDateToItems = () => {
    if (!estDate) return;
    const newRows = itemRows.map(row => ({
      ...row,
      deliveryDate: estDate
    }));
    setItemRows(newRows);
  };

  const addNewRow = () => setItemRows([...itemRows, createNewItemRow()]);
  const removeRow = (index) => itemRows.length > 1 && setItemRows(itemRows.filter((_, i) => i !== index));

  const totalAmount = useMemo(() => {
    return itemRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0).toFixed(2);
  }, [itemRows]);

  const handleSubmit = async () => {
    if (!selectedParty) {
      alert('Please select a Customer');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        party: selectedParty,
        poNumber,
        poDate,
        estimatedDeliveryDate: estDate, // Overall Date
        status: 'New',
        items: itemRows.map(r => ({
          item: r.item,
          itemName: r.itemName,
          quantity: r.quantity,
          unit: r.unit,
          rate: r.rate,
          amount: r.amount,
          deliveryDate: r.deliveryDate, // Item Date
          priority: r.priority || 'Normal'
        })),
        totalAmount: parseFloat(totalAmount),
        notes
      };
      await createOrder(orderData);
      navigate('/orders');
    } catch (err) {
      console.error('Create order error:', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to create order';
      setError(msg);
      alert(`Failed to create order: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/orders')} className="text-slate-500 hover:text-slate-800">
            <FaArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Create New Order</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded">{error}</div>
          )}
          
          {/* Form Header Grid */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">CUSTOMER NAME *</label>
              <input
                list="parties-list"
                className="w-full border border-gray-300 rounded p-2 text-sm bg-white"
                value={partyInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setPartyInput(val);
                  const match = parties.find(p => p.name.toLowerCase() === val.toLowerCase());
                  setSelectedParty(match ? match._id : null);
                }}
                placeholder="Type or select customer..."
              />
              <datalist id="parties-list">
                {parties.map(p => <option key={p._id} value={p.name} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">PO NUMBER</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded p-2 text-sm"
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                placeholder="Enter PO No. (optional)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">PO DATE</label>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded p-2 text-sm"
                value={poDate}
                onChange={e => setPoDate(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600">OVERALL DELIVERY DATE</label>
                <button 
                  onClick={applyOverallDateToItems}
                  className="text-xs text-blue-600 hover:underline"
                  title="Copy this date to all items below"
                >
                  Apply to all items
                </button>
              </div>
              <input 
                type="date" 
                className="w-full border border-gray-300 rounded p-2 text-sm"
                value={estDate}
                onChange={e => setEstDate(e.target.value)}
              />
            </div>

            {/* Order-level priority removed. Use per-item priority controls below. */}
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-xs text-slate-600 uppercase border-b">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3 w-10">#</th>
                  <th className="p-3 text-left">Item Name</th>
                  <th className="p-3 text-left w-24">Delivery Date</th> {/* ✅ NEW COLUMN */}
                  <th className="p-3 text-left w-24">Qty</th>
                  <th className="p-3 text-left w-20">Unit</th>
                  <th className="p-3 text-left w-20">Priority</th>
                  <th className="p-3 text-left w-28">Rate</th>
                  <th className="p-3 text-right w-32">Amount</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {itemRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-400 cursor-grab"><BiGridVertical /></td>
                    <td className="p-3 text-slate-500">{index + 1}</td>
                    <td className="p-3">
                      <input
                        list="items-list"
                        className="w-full border border-gray-300 rounded p-1.5"
                        value={row.itemName || ''}
                        onChange={(e) => handleItemRowChange(index, 'item', e.target.value)}
                        placeholder="Type or select item..."
                      />
                      <datalist id="items-list">
                        {items.map(i => <option key={i._id} value={i.name} />)}
                      </datalist>
                    </td>
                    {/* ✅ Item Delivery Date Input */}
                    <td className="p-3">
                      <input 
                        type="date" 
                        className="w-full border border-gray-300 rounded p-1.5 text-xs"
                        value={row.deliveryDate}
                        onChange={(e) => handleItemRowChange(index, 'deliveryDate', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="number" 
                        className="w-full border border-gray-300 rounded p-1.5"
                        value={row.quantity}
                        onChange={(e) => handleItemRowChange(index, 'quantity', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        className="w-full border border-gray-300 rounded p-1.5 bg-gray-50"
                        value={row.unit}
                        readOnly
                      />
                    </td>
                    <td className="p-3">
                      <select className="w-full border border-gray-300 rounded p-1.5 text-sm" value={row.priority || 'Normal'} onChange={(e) => handleItemRowChange(index, 'priority', e.target.value)}>
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input 
                        type="number" 
                        className="w-full border border-gray-300 rounded p-1.5"
                        value={row.rate}
                        onChange={(e) => handleItemRowChange(index, 'rate', e.target.value)}
                      />
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700">
                      {row.amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => removeRow(index)} className="text-red-400 hover:text-red-600"><FaTrashAlt /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addNewRow} className="w-full py-2 text-blue-600 font-medium hover:bg-blue-50 text-sm border-t">
              + Add Another Line
            </button>
          </div>

          {/* Footer Summary */}
          <div className="flex justify-between items-start">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-slate-600 mb-1">REMARKS / NOTES</label>
              <textarea 
                className="w-full border border-gray-300 rounded p-2 text-sm" 
                rows="3"
                placeholder="Any special instructions for manufacturing..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              ></textarea>
            </div>
            <div className="w-1/3 bg-slate-50 p-4 rounded border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600 font-medium">Total Qty</span>
                <span className="font-bold">{itemRows.reduce((acc, r) => acc + (parseFloat(r.quantity)||0), 0)}</span>
              </div>
              <div className="flex justify-between items-center text-lg border-t border-slate-200 pt-2">
                <span className="text-slate-800 font-bold">Total Amount</span>
                <span className="text-blue-600 font-bold">₹ {totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button 
              onClick={() => navigate('/orders')}
              className="px-6 py-2 border border-gray-300 rounded text-slate-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              <FaSave /> {loading ? 'Saving...' : 'Save Order'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateOrder;