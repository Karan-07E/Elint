import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getReportById } from '../services/api';
import { FaArrowLeft, FaPrint, FaDownload } from 'react-icons/fa';

const ReportView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await getReportById(id);
      setReport(response.data.report);
    } catch (error) {
      console.error('Error fetching report:', error);
      alert('Failed to load report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Sidebar />
        <div className="ml-64 p-6">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Report Not Found</h3>
            <button
              onClick={() => navigate('/reports')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="ml-64 print:ml-0 p-6 print:p-0">
        {/* Header Actions - Hidden on Print */}
        <div className="mb-6 flex justify-between items-center print:hidden">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-white rounded-lg transition-colors"
          >
            <FaArrowLeft /> Back to Reports
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FaPrint /> Print
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-300">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bill: {report.reportNumber}</h1>
              <p className="text-gray-600">Date: {new Date(report.generatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Supplier and Summary Section */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Supplier Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Supplier</h3>
              <div className="text-sm text-gray-800 whitespace-pre-line">
                {report.from}
              </div>
            </div>

            {/* Summary */}
            <div className="text-right">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">₹{report.subtotal?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-semibold">₹{report.taxAmount?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-1">
                  <span className="text-gray-800 font-bold">Total:</span>
                  <span className="font-bold">₹{report.totalAmount?.toFixed(0) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-semibold">₹{report.paidAmount || 0}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-1">
                  <span className="text-gray-800 font-bold">Balance:</span>
                  <span className="font-bold">₹{report.balanceAmount?.toFixed(0) || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-700 mb-2">To</h3>
            <div className="text-sm text-gray-800 whitespace-pre-line">
              {report.to}
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
              {report.items && report.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 text-sm">{idx + 1}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm">{item.itemName}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">{item.description || '-'}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{item.rate?.toFixed(2) || 0}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-right">₹{item.tax?.toFixed(2) || 0}</td>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-right font-semibold">₹{item.amount?.toFixed(2) || 0}</td>
                </tr>
              ))}
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

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500 print:hidden">
            <div className="flex justify-between">
              <span>Generated by: {report.generatedBy?.username || 'System'}</span>
              <span>Order PO: {report.orderId?.poNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
