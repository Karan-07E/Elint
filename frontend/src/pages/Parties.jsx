import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { getAllParties, createParty, getAllItems, createOrder, searchOrders } from '../services/api';

const initialPartyState = {
  name: '',
  phone: '',
  email: '',
  gstin: '',
  street: '',
  city: '',
  state: '',
  pincode: '',
  openingBalance: 0,
  balanceType: 'receivable',
  additionalField1: '',
  additionalField2: '',
  additionalField3: '',
  additionalField4: '',
};

const PartiesPage = () => {
  const [parties, setParties] = useState([]);
  const [filteredParties, setFilteredParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partySearch, setPartySearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newParty, setNewParty] = useState(initialPartyState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('gst');
  const [defaultItem, setDefaultItem] = useState(null);

  useEffect(() => {
    fetchParties();
    fetchDefaultItem();
  }, []);

  useEffect(() => {
    const term = partySearch.toLowerCase();
    const filtered = parties.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(term);
      const phoneMatch = p.phone?.includes(partySearch);
      const emailMatch = p.email?.toLowerCase().includes(term);
      return nameMatch || phoneMatch || emailMatch;
    });
    setFilteredParties(filtered);
  }, [partySearch, parties]);

  useEffect(() => {
    if (selectedParty) {
      fetchOrdersForParty(selectedParty._id, orderSearch);
    } else {
      setOrders([]);
    }
  }, [selectedParty]);

  const fetchParties = async () => {
    try {
      const res = await getAllParties('customer');
      setParties(res.data || []);
      setFilteredParties(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedParty(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const fetchOrdersForParty = async (partyId, search = '') => {
    try {
      const res = await searchOrders({ partyId, search });
      setOrders(res.data || []);
    } catch (error) {
      console.error('Error fetching orders for party:', error);
    }
  };

  const fetchDefaultItem = async () => {
    try {
      const res = await getAllItems();
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDefaultItem(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching default item:', error);
    }
  };

  const handlePartyClick = (party) => {
    setSelectedParty(party);
  };

  const handleNewPartyChange = (e) => {
    const { name, value } = e.target;
    setNewParty((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setNewParty(initialPartyState);
    setIsSubmitting(false);
    setActiveTab('gst');
  };

  const handleCreateParty = async (e) => {
    e.preventDefault();
    if (!newParty.name.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: newParty.name,
        phone: newParty.phone,
        email: newParty.email,
        gstin: newParty.gstin,
        openingBalance: Number(newParty.openingBalance) || 0,
        balanceType: newParty.balanceType,
        billingAddress: {
          street: newParty.street,
          city: newParty.city,
          state: newParty.state,
          pincode: newParty.pincode,
        },
      };

      const res = await createParty(payload);
      const createdParty = res.data;

      // If order details are provided and a default item exists, create a purchase order for this party
      if (createdParty && defaultItem && newParty.orderNumber) {
        const quantity = Number(newParty.orderQuantity) || 1;
        const rate = Number(newParty.orderRate) || 0;
        const amount = quantity * rate;

        const orderPayload = {
          orderNumber: newParty.orderNumber,
          party: createdParty._id,
          items: [
            {
              item: defaultItem._id,
              quantity,
              rate,
              amount,
            },
          ],
          totalAmount: amount,
          status: 'queue',
          priority: 'medium',
          notes: newParty.orderDescription || '',
        };

        try {
          await createOrder(orderPayload);
        } catch (orderError) {
          console.error('Error creating initial purchase order:', orderError);
        }
      }

      setIsModalOpen(false);
      resetForm();
      await fetchParties();
      if (createdParty) {
        setSelectedParty(createdParty);
        await fetchOrdersForParty(createdParty._id, '');
      }
    } catch (error) {
      console.error('Error creating party:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderSearchChange = (e) => {
    const value = e.target.value;
    setOrderSearch(value);
    if (selectedParty) {
      fetchOrdersForParty(selectedParty._id, value);
    }
  };

  const renderAddPartyModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Add Party</h2>
            <button
              className="text-slate-500 hover:text-slate-700"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateParty} className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Party Name *</label>
                <input
                  type="text"
                  name="name"
                  value={newParty.name}
                  onChange={handleNewPartyChange}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter party name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">GSTIN</label>
                <input
                  type="text"
                  name="gstin"
                  value={newParty.gstin}
                  onChange={handleNewPartyChange}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter GSTIN"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={newParty.phone}
                  onChange={handleNewPartyChange}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="flex gap-6 mb-3 text-sm font-medium">
                <button
                  type="button"
                  className={
                    activeTab === 'gst'
                      ? 'border-b-2 border-blue-500 pb-1 text-blue-600'
                      : 'pb-1 text-slate-500 hover:text-slate-700'
                  }
                  onClick={() => setActiveTab('gst')}
                >
                  GST & Address
                </button>
                <button
                  type="button"
                  className={
                    activeTab === 'credit'
                      ? 'border-b-2 border-blue-500 pb-1 text-blue-600'
                      : 'pb-1 text-slate-500 hover:text-slate-700'
                  }
                  onClick={() => setActiveTab('credit')}
                >
                  Credit & Balance
                </button>
                <button
                  type="button"
                  className={
                    activeTab === 'additional'
                      ? 'border-b-2 border-blue-500 pb-1 text-blue-600'
                      : 'pb-1 text-slate-500 hover:text-slate-700'
                  }
                  onClick={() => setActiveTab('additional')}
                >
                  Additional Fields
                </button>
              </div>

              {activeTab === 'gst' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Billing Address</label>
                    <textarea
                      name="street"
                      value={newParty.street}
                      onChange={handleNewPartyChange}
                      rows={3}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Street, locality"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                    <input
                      type="text"
                      name="city"
                      value={newParty.city}
                      onChange={handleNewPartyChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="City"
                    />
                    <label className="block text-xs font-medium text-slate-600 mb-1 mt-3">State</label>
                    <input
                      type="text"
                      name="state"
                      value={newParty.state}
                      onChange={handleNewPartyChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={newParty.pincode}
                      onChange={handleNewPartyChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Pincode"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'credit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Opening Balance</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        name="openingBalance"
                        value={newParty.openingBalance}
                        onChange={handleNewPartyChange}
                        className="w-32 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-4 text-xs">
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="radio"
                            name="balanceType"
                            value="payable"
                            checked={newParty.balanceType === 'payable'}
                            onChange={handleNewPartyChange}
                          />
                          <span>To Pay</span>
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="radio"
                            name="balanceType"
                            value="receivable"
                            checked={newParty.balanceType === 'receivable'}
                            onChange={handleNewPartyChange}
                          />
                          <span>To Receive</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Credit Limit</label>
                    <div className="flex items-center gap-4 text-xs mt-2">
                      <label className="inline-flex items-center gap-1">
                        <input type="radio" name="creditLimitType" value="no_limit" defaultChecked />
                        <span>No Limit</span>
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <input type="radio" name="creditLimitType" value="custom" />
                        <span>Custom Limit</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'credit' && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Initial Purchase Order (optional)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Order Number</label>
                      <input
                        type="text"
                        name="orderNumber"
                        value={newParty.orderNumber || ''}
                        onChange={handleNewPartyChange}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. PO-1003"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Total Items (Qty)</label>
                      <input
                        type="number"
                        name="orderQuantity"
                        value={newParty.orderQuantity || ''}
                        onChange={handleNewPartyChange}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rate per Item</label>
                      <input
                        type="number"
                        name="orderRate"
                        value={newParty.orderRate || ''}
                        onChange={handleNewPartyChange}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 100"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">What they order (description)</label>
                    <textarea
                      name="orderDescription"
                      value={newParty.orderDescription || ''}
                      onChange={handleNewPartyChange}
                      rows={2}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the items or services ordered"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'additional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span>Additional Field 1 Name</span>
                    </label>
                    <input
                      type="text"
                      name="additionalField1"
                      value={newParty.additionalField1}
                      onChange={handleNewPartyChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter value"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                      <input type="checkbox" className="rounded" />
                      <span>Additional Field 2 Name</span>
                    </label>
                    <input
                      type="text"
                      name="additionalField2"
                      value={newParty.additionalField2}
                      onChange={handleNewPartyChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter value"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                      <input type="checkbox" className="rounded" />
                      <span>Additional Field 3 Name</span>
                    </label>
                    <input
                      type="text"
                      name="additionalField3"
                      value={newParty.additionalField3}
                      onChange={handleNewPartyChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter value"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1">
                      <input type="checkbox" className="rounded" />
                      <span>Additional Field 4 Name</span>
                    </label>
                    <input
                      type="date"
                      name="additionalField4"
                      value={newParty.additionalField4}
                      onChange={handleNewPartyChange}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t pt-4 mt-4">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-64 p-5 bg-slate-100 min-h-screen">
        {/* Top bar with search and actions */}
        <header className="bg-white rounded-lg shadow flex items-center justify-between p-4 mb-4">
          <div className="flex-1 flex items-center gap-3">
            <input
              type="text"
              className="w-full max-w-xl border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search Parties"
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-full"
              onClick={() => setIsModalOpen(true)}
            >
              <span className="text-lg">＋</span>
              <span>Add Party</span>
            </button>
          </div>
        </header>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left panel: parties list */}
          <div className="bg-white rounded-lg shadow flex flex-col lg:col-span-1 min-h-[500px]">
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Parties</h3>
              </div>
              <button
                className="text-xs text-blue-500 border border-blue-500 rounded-full px-3 py-1 hover:bg-blue-50"
                onClick={() => setIsModalOpen(true)}
              >
                + Add Party
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-xs text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2">Party</th>
                    <th className="text-right px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-8 text-center text-xs text-slate-400">
                        No parties to show.
                      </td>
                    </tr>
                  )}
                  {filteredParties.map((party) => (
                    <tr
                      key={party._id}
                      className={`cursor-pointer border-b last:border-b-0 hover:bg-slate-50 ${
                        selectedParty && selectedParty._id === party._id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handlePartyClick(party)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-800">{party.name}</span>
                          {party.phone && (
                            <span className="text-xs text-slate-400">{party.phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-emerald-600">
                        {Number(party.currentBalance || party.openingBalance || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel: selected party details and transactions */}
          <div className="bg-white rounded-lg shadow lg:col-span-2 flex flex-col min-h-[500px]">
            {selectedParty ? (
              <>
                <div className="border-b p-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{selectedParty.name}</h3>
                    <div className="mt-1 text-xs text-slate-500 space-y-1">
                      {selectedParty.phone && <div>📞 {selectedParty.phone}</div>}
                      {selectedParty.email && <div>✉️ {selectedParty.email}</div>}
                      {selectedParty.billingAddress && (
                        <div>
                          📍 {selectedParty.billingAddress.street || ''}
                          {selectedParty.billingAddress.city && `, ${selectedParty.billingAddress.city}`}
                          {selectedParty.billingAddress.state && `, ${selectedParty.billingAddress.state}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>Current Balance</div>
                    <div className="text-lg font-semibold text-emerald-600">
                      {Number(selectedParty.currentBalance || selectedParty.openingBalance || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between border-b bg-slate-50">
                  <h4 className="text-sm font-semibold text-slate-700">Transactions</h4>
                  <input
                    type="text"
                    className="border border-slate-300 rounded-full px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search Purchase Order"
                    value={orderSearch}
                    onChange={handleOrderSearchChange}
                  />
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b text-xs text-slate-500">
                      <tr>
                        <th className="text-left px-4 py-2">Type</th>
                        <th className="text-left px-4 py-2">Number</th>
                        <th className="text-left px-4 py-2">Date</th>
                        <th className="text-right px-4 py-2">Total</th>
                        <th className="text-right px-4 py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 && (selectedParty.openingBalance || selectedParty.currentBalance) && (
                        <tr className="border-b last:border-b-0">
                          <td className="px-4 py-2 text-xs text-slate-600">Receivable Opening Balance</td>
                          <td className="px-4 py-2 text-sm text-slate-800"></td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {selectedParty.createdAt ? new Date(selectedParty.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-slate-800">
                            {Number(selectedParty.openingBalance || selectedParty.currentBalance || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-slate-500">
                            {Number(selectedParty.openingBalance || selectedParty.currentBalance || 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {orders.length === 0 && !(selectedParty.openingBalance || selectedParty.currentBalance) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                            No transactions to show.
                          </td>
                        </tr>
                      )}
                      {orders.map((order) => (
                        <tr key={order._id} className="border-b last:border-b-0 hover:bg-slate-50">
                          <td className="px-4 py-2 text-xs text-slate-600">Purchase Order</td>
                          <td className="px-4 py-2 text-sm text-slate-800">{order.orderNumber}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-slate-800">
                            {Number(order.totalAmount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-slate-500">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                Select a party from the list to view details.
              </div>
            )}
          </div>
        </div>

        {renderAddPartyModal()}
      </div>
    </div>
  );
};

export default PartiesPage;
