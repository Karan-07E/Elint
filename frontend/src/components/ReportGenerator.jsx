import React, { useState, useEffect } from 'react';
import { FaTimes, FaFilePdf, FaSave, FaPrint } from 'react-icons/fa';
import { getNextReportNumber, createReport } from '../services/api';

const ReportGenerator = ({ order, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    reportNumber: '',
    from: '',
    to: '',
    paidAmount: 0
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchNextReportNumber();
  }, []);

  const fetchNextReportNumber = async () => {
    try {
      const response = await getNextReportNumber();
      setReportData(prev => ({ ...prev, reportNumber: response.data.reportNumber }));
    } catch (error) {
      console.error('Error fetching report number:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    order.items.forEach(item => {
      const amount = (item.rate || 0) * (item.quantity || 0);
      const tax = (amount * (item.taxRate || 0)) / 100;
      subtotal += amount;
      taxAmount += tax;
    });

    const totalAmount = subtotal + taxAmount;
    const balanceAmount = totalAmount - (reportData.paidAmount || 0);

    return { subtotal, taxAmount, totalAmount, balanceAmount };
  };

  const handlePreview = () => {
    if (!reportData.from || !reportData.to) {
      alert('Please fill in From and To fields');
      return;
    }
    setShowPreview(true);
  };

  const handleSave = async () => {
    if (!reportData.from || !reportData.to) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await createReport({
        orderId: order._id,
        reportNumber: reportData.reportNumber,
        from: reportData.from,
        to: reportData.to,
        paidAmount: reportData.paidAmount || 0
      });

      alert('Report saved successfully!');
      if (onSave) onSave(response.data.report);
      onClose();
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  const totals = calculateTotals();

  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header Actions */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center print:hidden">
            <h2 className="text-xl font-bold text-gray-800">Report Preview</h2>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaPrint /> Print
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
              >
                <FaSave /> {loading ? 'Saving...' : 'Save Report'}
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FaTimes /> Back
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-8 bg-white" id="report-content">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-300">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Bill: {reportData.reportNumber}</h1>
                <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Supplier and Summary Section */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Supplier Info */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">Supplier</h3>
                <div className="text-sm text-gray-800 whitespace-pre-line">
                  {reportData.from}
                </div>
              </div>

              {/* Summary */}
              <div className="text-right">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-semibold">₹{totals.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-1">
                    <span className="text-gray-800 font-bold">Total:</span>
                    <span className="font-bold">₹{totals.totalAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-semibold">₹{reportData.paidAmount || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-1">
                    <span className="text-gray-800 font-bold">Balance:</span>
                    <span className="font-bold">₹{totals.balanceAmount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-700 mb-2">To</h3>
              <div className="text-sm text-gray-800 whitespace-pre-line">
                {reportData.to}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border border-gray-300 mb-8">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">Rate</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">Tax</th>
                  <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => {
                  const rate = item.rate || 0;
                  const quantity = item.quantity || 0;
                  const taxRate = item.taxRate || 0;
                  const amount = rate * quantity;
                  const tax = (amount * taxRate) / 100;
                  const total = amount + tax;

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 text-sm">{idx + 1}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{item.itemName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">{item.item?.description || '-'}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-center">{quantity}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{rate.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{tax.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">₹{total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer Sections */}
            <div className="grid grid-cols-2 gap-8 mt-12">
              <div>
                <p className="text-sm text-gray-600">For Company</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Generate Report</h2>
              <p className="text-blue-100 text-sm mt-1">Order: {order.poNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {/* Report Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reportData.reportNumber}
              onChange={(e) => handleInputChange('reportNumber', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="BILL-2025-00001"
            />
          </div>

          {/* From */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              From (Supplier Details) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reportData.from}
              onChange={(e) => handleInputChange('from', e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Company Name&#10;Phone Number&#10;Address&#10;..."
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              To (Customer Details) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reportData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Customer Name&#10;Phone Number&#10;Address&#10;..."
            />
          </div>

          {/* Paid Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Paid Amount (₹)
            </label>
            <input
              type="number"
              value={reportData.paidAmount}
              onChange={(e) => handleInputChange('paidAmount', parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0"
              min="0"
            />
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order:</span>
                <span className="font-semibold">{order.poNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-semibold">{order.customerName || order.party?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span className="font-semibold">{order.items.length}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2">
                <span className="text-gray-800 font-bold">Total Amount:</span>
                <span className="font-bold text-lg">₹{totals.totalAmount.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePreview}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FaFilePdf /> Preview Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
