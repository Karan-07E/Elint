import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getSaleById } from '../services/api';

const SaleReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const res = await getSaleById(id);
        setSale(res.data);
      } catch (err) {
        setError('Unable to load sale report.');
      } finally {
        setLoading(false);
      }
    };
    fetchSale();
  }, [id]);

  if (loading) return <div className="min-h-screen ml-64 p-6">Loading...</div>;
  if (error) return <div className="min-h-screen ml-64 p-6">{error}</div>;
  if (!sale) return <div className="min-h-screen ml-64 p-6">No sale found.</div>;

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Sales Report</h2>
            <div className="text-sm text-slate-600">Invoice: {sale.invoiceNumber}</div>
            <div className="text-sm text-slate-600">Date: {new Date(sale.invoiceDate).toLocaleDateString()}</div>
          </div>
          <div className="space-x-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md">Print</button>
            <button onClick={() => navigate(-1)} className="px-4 py-2 border rounded-md">Back</button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`/api/sales/${sale._id}/report/pdf`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                  });
                  if (!res.ok) throw new Error('Failed to download');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sale-${sale.invoiceNumber || sale._id}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error(err);
                  alert('Failed to download PDF');
                }
              }}
              className="px-4 py-2 border rounded-md"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold">Bill To</h3>
              <div className="text-sm">{sale.party?.name}</div>
              <div className="text-sm">{sale.party?.phone}</div>
              <div className="text-sm">{sale.party?.billingAddress?.street}</div>
            </div>
            <div className="text-right">
              <h3 className="font-semibold">Summary</h3>
              <div className="text-sm">Subtotal: ₹{sale.subtotal}</div>
              <div className="text-sm">Tax: ₹{sale.taxAmount}</div>
              <div className="text-sm">Total: ₹{sale.totalAmount}</div>
              <div className="text-sm">Paid: ₹{sale.paidAmount}</div>
              <div className="text-sm">Balance: ₹{sale.balanceAmount}</div>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">#</th>
                <th className="py-2">Item</th>
                <th className="py-2">Description</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Rate</th>
                <th className="py-2">Tax</th>
                <th className="py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((row, idx) => (
                <tr key={row._id || idx} className="border-b">
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2">{row.item?.name}</td>
                  <td className="py-2">{row.description}</td>
                  <td className="py-2">{row.quantity}</td>
                  <td className="py-2">₹{row.rate}</td>
                  <td className="py-2">₹{row.taxAmount}</td>
                  <td className="py-2">₹{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 text-right text-sm">
            <div>For Company</div>
            <div className="mt-12">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleReport;
