// src/pages/Purchase.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate }  from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getAllItems, getItemTransactions, deleteItem } from '../services/api'; // We will add getItemTransactions to api.js
import { FaFilter, FaSearch, FaEllipsisV } from 'react-icons/fa';

const Purchase = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoadingItems(true);
      const res = await getAllItems();
      setItems(res.data || []);
      // Select the first item by default
      if (res.data && res.data.length > 0) {
        handleSelectItem(res.data[0]);
      }
      setLoadingItems(false);
    } catch (err) {
      setError('Failed to load items.');
      setLoadingItems(false);
    }
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    setLoadingTransactions(true);
    try {
      const res = await getItemTransactions(item._id);
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  const getStockColor = (stock) => {
    if (stock > 0) return 'text-green-600';
    if (stock < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* 1. Items & Product Pane (Left Center) */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">PRODUCTS</h2>
                  <div className="flex gap-4 text-gray-600">
                    <FaSearch />
                    <FaFilter />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate('/items?mode=add')} // Link to your existing item form
                    className="w-full bg-orange-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-orange-600"
                  >
                    + Add Item
                  </button>
                  <button className="p-2 border rounded-md">
                    <FaEllipsisV />
                  </button>
                </div>
              </div>
              
              {/* Item List */}
              <div className="overflow-y-auto h-[calc(100vh-220px)]">
                {loadingItems ? (
                  <p className="p-4 text-gray-500">Loading...</p>
                ) : (
                  items.map(item => (
                    <div
                      key={item._id}
                      onClick={() => handleSelectItem(item)}
                      className={`flex justify-between items-center p-4 border-b border-gray-100 cursor-pointer ${
                        selectedItem?._id === item._id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">HSN: {item.hsn || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${getStockColor(item.currentStock)}`}>
                          {item.currentStock} <span className="text-xs text-gray-500">{item.unit}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 2. Item Details (Right Center) */}
          <div className="col-span-8">
            {selectedItem ? (
              <div className="bg-white rounded-lg shadow-sm">
                {/* Item Card */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800">{selectedItem.name}</h3>
                      <span className="text-sm text-slate-500">CODE: {selectedItem.code || 'N/A'}</span>
                    </div>
                    <button className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700">
                      Adjust Item
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">SALE PRICE</p>
                      <p className="font-medium">₹{selectedItem.salePrice || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">PURCHASE PRICE</p>
                      <p className="font-medium">₹{selectedItem.purchasePrice || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">STOCK QUANTITY</p>
                      <p className={`font-medium ${getStockColor(selectedItem.currentStock)}`}>
                        {selectedItem.currentStock} {selectedItem.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">STOCK VALUE</p>
                      <p className="font-medium">
                        ₹{(parseFloat(selectedItem.purchasePrice || 0) * selectedItem.currentStock).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Transactions Table */}
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-slate-800 mb-4">TRANSACTIONS</h4>
                  <div className="overflow-y-auto h-[calc(100vh-380px)]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 text-xs text-slate-600 uppercase">
                        <tr>
                          <th className="p-3 text-left">Type</th>
                          <th className="p-3 text-left">Invoice/Ref#</th>
                          <th className="p-3 text-left">Name</th>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Quantity</th>
                          <th className="p-3 text-left">Price/Unit</th>
                          <th className="p-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loadingTransactions ? (
                          <tr><td colSpan="7" className="p-4 text-center text-gray-500">Loading...</td></tr>
                        ) : (
                          transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="p-3">
                                <span className={`font-medium ${
                                  tx.type === 'Purchase' ? 'text-green-600' : 
                                  tx.type === 'Sale' ? 'text-red-600' : 'text-blue-600'
                                }`}>{tx.type}</span>
                              </td>
                              <td className="p-3 text-slate-500">{tx.ref}</td>
                              <td className="p-3 font-medium text-slate-800">{tx.partyName}</td>
                              <td className="p-3 text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                              <td className={`p-3 font-medium ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                              </td>
                              <td className="p-3 text-slate-500">₹{tx.rate.toFixed(2)}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-100px)] bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">Select an item to see details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Purchase;