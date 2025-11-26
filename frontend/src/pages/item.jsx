import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createItem, getItemById, updateItem, getAllItems, deleteItem } from "../services/api";
import Sidebar from "../components/Sidebar";

const defaultForm = () => ({
  type: "product",
  name: "",
  hsn: "",
  unit: "",
  category: "",
  code: "",
  imageBase64: "",

  // Pricing
  salePrice: "",
  salePriceTaxType: "without",
  saleDiscountType: "percentage",
  purchasePrice: "",
  purchasePriceTaxType: "without",
  taxRate: "None",

  // Stock
  openingQty: "",
  atPrice: "",
  asOfDate: new Date().toISOString().slice(0, 10),
  minStock: "",
  location: "",

  // Processes - Manufacturing steps
  processes: [
    {
      id: 1,
      stepName: "",
      description: "",
      subSteps: [],
      stepType: "execution",
      status: "pending",
    },
  ],
});

export default function ItemPage() {
  const [form, setForm] = useState(defaultForm());
  const [activeTab, setActiveTab] = useState("pricing");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  
  // New states for list view
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  
  // New states for view progress
  const [showProgress, setShowProgress] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [progressProcesses, setProgressProcesses] = useState([]);

  const fileInputRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Fetch all items on component mount
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoadingItems(true);
    try {
      const response = await getAllItems();
      setItems(response.data || []);
    } catch (err) {
      console.error("Failed to load items:", err);
      setError("Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  };

  // Check for ?id= query param to support editing
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (id) {
      setShowForm(true);
      setLoading(true);
      getItemById(id)
        .then((res) => {
          const data = res.data || {};
          // Map backend shape to our form where possible
          setForm((f) => ({
            ...f,
            type: data.type || "product",
            name: data.name || "",
            hsn: data.hsn || "",
            unit: data.unit || "",
            category: data.category || "",
            code: data.code || "",
            imageBase64: data.image || "",
            salePrice: data.salePrice || "",
            salePriceTaxType: data.salePriceTaxType || "without",
            saleDiscountType: data.saleDiscountType || "percentage",
            purchasePrice: data.purchasePrice || "",
            purchasePriceTaxType: data.purchasePriceTaxType || "without",
            taxRate: data.taxRate || "None",
            openingQty: data.openingQty || "",
            atPrice: data.atPrice || "",
            asOfDate: data.asOfDate ? data.asOfDate.slice(0, 10) : f.asOfDate,
            minStock: data.minStock || "",
            location: data.location || "",
            processes:
              data.processes && data.processes.length > 0
                ? data.processes
                : f.processes,
          }));
        })
        .catch((err) => {
          console.error("load item error", err);
          setError("Failed to load item for editing");
        })
        .finally(() => setLoading(false));
    }
  }, [location.search]);

  const updateField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleImageSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField("imageBase64", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!form.name || form.name.trim() === "") {
      setError("Item Name is required");
      return false;
    }
    setError(null);
    return true;
  };

  const submit = async (resetAfter = false) => {
    if (!validate()) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const params = new URLSearchParams(location.search);
      const id = params.get("id");

      const payload = {
        type: form.type,
        name: form.name,
        hsn: form.hsn,
        unit: form.unit,
        category: form.category,
        code: form.code,
        image: form.imageBase64,
        salePrice: form.salePrice,
        salePriceTaxType: form.salePriceTaxType,
        saleDiscountType: form.saleDiscountType,
        purchasePrice: form.purchasePrice,
        purchasePriceTaxType: form.purchasePriceTaxType,
        taxRate: form.taxRate,
        openingQty: form.openingQty,
        atPrice: form.atPrice,
        asOfDate: form.asOfDate,
        minStock: form.minStock,
        location: form.location,
        processes: form.processes,
      };

      if (id) {
        await updateItem(id, payload);
        setMessage("Item updated successfully");
      } else {
        await createItem(payload);
        setMessage("Item created successfully");
      }

      // Reload items list
      await loadItems();

      if (resetAfter && !id) {
        setForm(defaultForm());
      } else {
        // Go back to list view after save
        setTimeout(() => {
          setShowForm(false);
          setForm(defaultForm());
          navigate('/items');
        }, 1500);
      }
    } catch (err) {
      console.error("save item error", err);
      setError(err?.response?.data?.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setForm(defaultForm());
    setShowForm(true);
    setMessage(null);
    setError(null);
  };

  const handleEditItem = (item) => {
    navigate(`/items?id=${item._id}`);
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }
    
    try {
      await deleteItem(itemId);
      setMessage("Item deleted successfully");
      await loadItems();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Delete item error:", err);
      setError("Failed to delete item");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleBackToList = () => {
    setShowForm(false);
    setForm(defaultForm());
    navigate('/items');
  };

  const handleViewProgress = (item) => {
    setSelectedItem(item);
    setProgressProcesses(item.processes || []);
    setShowProgress(true);
    setMessage(null);
    setError(null);
  };

  const handleProcessCheckboxChange = (processId) => {
    setProgressProcesses(prevProcesses =>
      prevProcesses.map(process => {
        if (process.id === processId && process.status !== 'completed') {
          return { ...process, status: 'completed' };
        }
        return process;
      })
    );
  };

  const handleSubStepCheckboxChange = (processId, subStepId) => {
    setProgressProcesses(prevProcesses =>
      prevProcesses.map(process => {
        if (process.id === processId) {
          const updatedSubSteps = (process.subSteps || []).map(subStep => {
            if (subStep.id === subStepId && subStep.status !== 'completed') {
              return { ...subStep, status: 'completed' };
            }
            return subStep;
          });
          return { ...process, subSteps: updatedSubSteps };
        }
        return process;
      })
    );
  };

  const handleSaveProgress = async () => {
    if (!selectedItem) return;
    
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        ...selectedItem,
        processes: progressProcesses
      };

      await updateItem(selectedItem._id, payload);
      setMessage("Progress saved successfully");
      await loadItems();
      
      setTimeout(() => {
        setShowProgress(false);
        setSelectedItem(null);
        setProgressProcesses([]);
        setMessage(null);
      }, 1500);
    } catch (err) {
      console.error("Save progress error:", err);
      setError(err?.response?.data?.message || "Failed to save progress");
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromProgress = () => {
    setShowProgress(false);
    setSelectedItem(null);
    setProgressProcesses([]);
  };

  // Get user role to determine which actions to show
  const getUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user?.role || 'user';
    } catch {
      return 'user';
    }
  };

  const userRole = getUserRole();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Top Header Bar */}
      <div className="ml-64 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-500 text-xl font-bold">🔥 Elints</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Customer Support:</span>
          <span className="text-blue-600">
            📞 +91-6364444752, +91-9333911911
          </span>
          <button className="text-white bg-blue-600 p-2 rounded-lg hover:underline">
            🎧 Get Instant Online Support
          </button>
        </div>
      </div>

      <div className="ml-64 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Messages - Show at top level */}
          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {showProgress ? (
            // View Progress View
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">View Progress - {selectedItem?.name}</h2>
                <button
                  onClick={handleBackFromProgress}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {/* Item Details */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Item Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Item Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedItem?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">{selectedItem?.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">{selectedItem?.category || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Code</p>
                      <p className="text-sm font-medium text-gray-900">{selectedItem?.code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">HSN</p>
                      <p className="text-sm font-medium text-gray-900">{selectedItem?.hsn || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unit</p>
                      <p className="text-sm font-medium text-gray-900">{selectedItem?.unit || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sale Price</p>
                      <p className="text-sm font-medium text-gray-900">₹{selectedItem?.salePrice || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Purchase Price</p>
                      <p className="text-sm font-medium text-gray-900">₹{selectedItem?.purchasePrice || '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stock</p>
                      <p className="text-sm font-medium text-gray-900">{selectedItem?.openingQty || '0'} {selectedItem?.unit || ''}</p>
                    </div>
                  </div>
                </div>

                {/* Manufacturing Process Steps */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Manufacturing Process Steps</h3>
                  {progressProcesses.length > 0 ? (
                    <div className="space-y-4">
                      {progressProcesses.map((process, index) => (
                        <div
                          key={process.id}
                          className={`p-4 border rounded-lg ${
                            process.status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              <input
                                type="checkbox"
                                checked={process.status === 'completed'}
                                onChange={() => handleProcessCheckboxChange(process.id)}
                                disabled={process.status === 'completed'}
                                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-base font-semibold text-gray-900">
                                  Step {index + 1}: {process.stepName}
                                </h4>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    process.stepType === 'testing'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {process.stepType === 'testing' ? '🧪 Testing' : '⚙️ Execution'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    process.status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                >
                                  {process.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                                </span>
                              </div>
                              {process.description && (
                                <p className="text-sm text-gray-600 mb-2">{process.description}</p>
                              )}
                              {process.subSteps && process.subSteps.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase">Sub-Steps:</p>
                                  {process.subSteps.map((subStep, idx) => (
                                    <div 
                                      key={subStep.id || idx} 
                                      className={`text-sm p-3 rounded border flex items-start gap-3 ${
                                        subStep.status === 'completed'
                                          ? 'bg-green-50 border-green-200'
                                          : 'bg-white border-gray-200'
                                      }`}
                                    >
                                      {userRole === 'product team' && (
                                        <div className="flex-shrink-0 mt-0.5">
                                          <input
                                            type="checkbox"
                                            checked={subStep.status === 'completed'}
                                            onChange={() => handleSubStepCheckboxChange(process.id, subStep.id)}
                                            disabled={subStep.status === 'completed'}
                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <div className="font-medium text-gray-800">{idx + 1}. {subStep.name}</div>
                                          <span
                                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                                              subStep.status === 'completed'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}
                                          >
                                            {subStep.status === 'completed' ? '✓ Done' : '⏳ Pending'}
                                          </span>
                                        </div>
                                        {subStep.description && (
                                          <div className="text-gray-600 mt-1">{subStep.description}</div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No manufacturing processes defined for this item.</p>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    onClick={handleBackFromProgress}
                    className="text-gray-600 hover:text-gray-800 px-4 py-2.5 rounded text-sm font-medium transition-colors"
                  >
                    ← Back to List
                  </button>
                  <button
                    onClick={handleSaveProgress}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>Save Progress</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : !showForm ? (
            // Items List View
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Items</h2>
                {userRole !== 'product team' && (
                  <button
                    onClick={handleAddItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <span>+</span>
                    <span>ADD ITEM</span>
                  </button>
                )}
              </div>

              <div className="p-6">
                {loadingItems ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading items...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No items found</p>
                    {userRole !== 'product team' && (
                      <button
                        onClick={handleAddItem}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Add Your First Item
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Image</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Code</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sale Price</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stock</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded border border-gray-200"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No img</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              {item.hsn && <div className="text-xs text-gray-500">HSN: {item.hsn}</div>}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{item.code || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                item.type === 'product' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 capitalize">{item.category || '-'}</td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              ₹{item.salePrice || '0'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{item.openingQty || '0'} {item.unit || ''}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {userRole === 'product team' ? (
                                  <button
                                    onClick={() => handleViewProgress(item)}
                                    className="text-white bg-green-500 hover:bg-green-600 text-sm font-medium p-2 rounded-lg"
                                  >
                                    View Progress
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleEditItem(item)}
                                      className="text-white bg-blue-500 hover:bg-blue-600 text-sm font-medium px-3 py-1 rounded-lg"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item._id)}
                                      className="text-white bg-red-500 hover:bg-red-600 text-sm font-medium px-3 py-1 rounded-lg"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Item Form View
            <div className="bg-white rounded-lg shadow-sm">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {location.search.includes('id=') ? 'Edit Item' : 'Add Item'}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center bg-gray-100 rounded-full p-1">
                    <button
                      onClick={() => updateField("type", "product")}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        form.type === "product"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Product
                    </button>
                    <button
                      onClick={() => updateField("type", "service")}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                        form.type === "service"
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Service
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-gray-400 hover:text-gray-600 text-xl"
                  onClick={handleBackToList}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {/* Row 1: Item Name, HSN, Select Unit */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Item Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder=""
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Item HSN
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={form.hsn}
                      onChange={(e) => updateField("hsn", e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder=""
                    />
                    <button className="text-gray-400 hover:text-gray-600">
                      🔍
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Select Unit
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => updateField("unit", e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Select Unit</option>
                    <option value="pieces">Pieces (pcs)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="grams">Grams (g)</option>
                    <option value="liters">Liters (L)</option>
                    <option value="meters">Meters (m)</option>
                    <option value="boxes">Boxes</option>
                    <option value="dozens">Dozens</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Category, Item Code, Image Preview */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="flex items-end">
                  <button
                    className="w-full bg-blue-100 text-blue-600 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    onClick={() =>
                      fileInputRef.current && fileInputRef.current.click()
                    }
                  >
                    <span>+ Add Item Image</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
              </div>

              {/* Row 3: Category, Item Code, Image Preview */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">Select Category</option>
                    <option value="electronics">Electronics</option>
                    <option value="furniture">Furniture</option>
                    <option value="clothing">Clothing</option>
                    <option value="food">Food & Beverage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Item Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={form.code}
                      onChange={(e) => updateField("code", e.target.value)}
                      placeholder="Item Code"
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 rounded text-sm font-medium transition-colors whitespace-nowrap">
                      Assign Code
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  {form.imageBase64 ? (
                    <img
                      src={form.imageBase64}
                      alt="preview"
                      className="w-24 h-24 object-cover rounded border border-gray-300"
                    />
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex gap-8 border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveTab("pricing")}
                    className={`pb-3 text-sm font-medium transition-all ${
                      activeTab === "pricing"
                        ? "border-b-2 border-red-500 text-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Pricing
                  </button>
                  <button
                    onClick={() => setActiveTab("stock")}
                    className={`pb-3 text-sm font-medium transition-all ${
                      activeTab === "stock"
                        ? "border-b-2 border-red-500 text-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Stock
                  </button>
                  <button
                    onClick={() => setActiveTab("processes")}
                    className={`pb-3 text-sm font-medium transition-all ${
                      activeTab === "processes"
                        ? "border-b-2 border-red-500 text-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Processes
                  </button>
                </div>

                {activeTab === "pricing" && (
                  <div>
                    {/* Sale Price Section */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Sale Price
                      </h3>
                      <div className="grid grid-cols-4 gap-3">
                        <input
                          value={form.salePrice}
                          onChange={(e) =>
                            updateField("salePrice", e.target.value)
                          }
                          placeholder="Sale Price"
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <select
                          value={form.salePriceTaxType}
                          onChange={(e) =>
                            updateField("salePriceTaxType", e.target.value)
                          }
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                        >
                          <option value="without">Without Tax</option>
                          <option value="with">With Tax</option>
                        </select>
                        <input
                          placeholder="Disc. On Sale Pric..."
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <select
                          value={form.saleDiscountType}
                          onChange={(e) =>
                            updateField("saleDiscountType", e.target.value)
                          }
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="flat">Flat</option>
                        </select>
                      </div>
                      <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        + Add Wholesale Price
                      </button>
                    </div>

                    {/* Purchase Price and Taxes */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Purchase Price
                        </h4>
                        <div className="space-y-2">
                          <input
                            value={form.purchasePrice}
                            onChange={(e) =>
                              updateField("purchasePrice", e.target.value)
                            }
                            placeholder="Purchase Price"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <select
                            value={form.purchasePriceTaxType}
                            onChange={(e) =>
                              updateField(
                                "purchasePriceTaxType",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                          >
                            <option value="without">Without Tax</option>
                            <option value="with">With Tax</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Taxes
                        </h4>
                        <div className="space-y-2">
                          <select
                            value={form.taxRate}
                            onChange={(e) =>
                              updateField("taxRate", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                          >
                            <option>None</option>
                            <option>GST @ 0%</option>
                            <option>GST @ 5%</option>
                            <option>GST @ 12%</option>
                            <option>GST @ 18%</option>
                            <option>GST @ 28%</option>
                          </select>
                        </div>
                      </div>

                      <div />
                    </div>
                  </div>
                )}

                {activeTab === "stock" && (
                  <div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1.5">
                          Opening Quantity
                        </label>
                        <input
                          value={form.openingQty}
                          onChange={(e) =>
                            updateField("openingQty", e.target.value)
                          }
                          placeholder="Opening Quantity"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1.5">
                          At Price
                        </label>
                        <input
                          value={form.atPrice}
                          onChange={(e) =>
                            updateField("atPrice", e.target.value)
                          }
                          placeholder="At Price"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1.5">
                          As Of Date
                        </label>
                        <input
                          type="date"
                          value={form.asOfDate}
                          onChange={(e) =>
                            updateField("asOfDate", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1.5">
                          Min Stock To Maintain
                        </label>
                        <input
                          value={form.minStock}
                          onChange={(e) =>
                            updateField("minStock", e.target.value)
                          }
                          placeholder="Min Stock To Maintain"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1.5">
                          Location
                        </label>
                        <input
                          value={form.location}
                          onChange={(e) =>
                            updateField("location", e.target.value)
                          }
                          placeholder="Location"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div />
                    </div>
                  </div>
                )}

                {activeTab === "processes" && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Manufacturing Process Steps
                      </h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Define the steps required to manufacture this item.
                        Include details like materials, colors, weights,
                        dimensions, etc.
                      </p>
                    </div>

                    {form.processes.map((process, index) => (
                      <div
                        key={process.id}
                        className="mb-6 pb-6 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <h4 className="text-sm font-medium text-gray-700">
                              Step {index + 1}
                            </h4>

                            {/* Step Type Toggle */}
                            <div className="flex items-center bg-gray-100 rounded-full p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newProcesses = [...form.processes];
                                  newProcesses[index].stepType = "execution";
                                  updateField("processes", newProcesses);
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                  process.stepType === "execution"
                                    ? "bg-blue-500 text-white shadow-sm"
                                    : "text-gray-600 hover:text-gray-800"
                                }`}
                              >
                                Execution
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newProcesses = [...form.processes];
                                  newProcesses[index].stepType = "testing";
                                  updateField("processes", newProcesses);
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                  process.stepType === "testing"
                                    ? "bg-green-500 text-white shadow-sm"
                                    : "text-gray-600 hover:text-gray-800"
                                }`}
                              >
                                Testing
                              </button>
                            </div>

                            {/* Visual Badge */}
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                process.stepType === "testing"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {process.stepType === "testing" 
                                ? "🧪 Testing Step"
                                : "⚙️ Execution Step"}
                            </span>
                          </div>

                          {form.processes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newProcesses = form.processes.filter(
                                  (_, i) => i !== index
                                );
                                updateField("processes", newProcesses);
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove Step
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Step Name *
                            </label>
                            <input
                              value={process.stepName}
                              onChange={(e) => {
                                const newProcesses = [...form.processes];
                                newProcesses[index].stepName = e.target.value;
                                updateField("processes", newProcesses);
                              }}
                              placeholder="e.g., Painting, Cutting, Assembly"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Description
                            </label>
                            <input
                              value={process.description}
                              onChange={(e) => {
                                const newProcesses = [...form.processes];
                                newProcesses[index].description =
                                  e.target.value;
                                updateField("processes", newProcesses);
                              }}
                              placeholder="Brief description of this step"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1.5">
                            Sub-Steps
                          </label>
                          <div className="space-y-2">
                            {(process.subSteps || []).map((subStep, subIndex) => (
                              <div key={subStep.id} className="flex gap-2 items-start bg-gray-50 p-3 rounded border border-gray-200">
                                <div className="flex-1 space-y-2">
                                  <input
                                    value={subStep.name}
                                    onChange={(e) => {
                                      const newProcesses = [...form.processes];
                                      newProcesses[index].subSteps[subIndex].name = e.target.value;
                                      updateField("processes", newProcesses);
                                    }}
                                    placeholder="Sub-step name (e.g., Apply primer, Mix materials)"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <input
                                    value={subStep.description}
                                    onChange={(e) => {
                                      const newProcesses = [...form.processes];
                                      newProcesses[index].subSteps[subIndex].description = e.target.value;
                                      updateField("processes", newProcesses);
                                    }}
                                    placeholder="Details (e.g., Amount: 2L, Color: Red, Temp: 200°C)"
                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newProcesses = [...form.processes];
                                    newProcesses[index].subSteps = newProcesses[index].subSteps.filter((_, i) => i !== subIndex);
                                    updateField("processes", newProcesses);
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Remove sub-step"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newProcesses = [...form.processes];
                                if (!newProcesses[index].subSteps) {
                                  newProcesses[index].subSteps = [];
                                }
                                newProcesses[index].subSteps.push({
                                  id: Date.now(),
                                  name: "",
                                  description: "",
                                  status: "pending"
                                });
                                updateField("processes", newProcesses);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                            >
                              <span>+</span>
                              <span>Add Sub-Step</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const newProcesses = [
                          ...form.processes,
                          {
                            id: Date.now(),
                            stepName: "",
                            description: "",
                            subSteps: [],
                            stepType: "execution",
                            status: "pending",
                          },
                        ];
                        updateField("processes", newProcesses);
                      }}
                      className="mt-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>+</span>
                      <span>Add Another Process Step</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleBackToList}
                  className="text-gray-600 hover:text-gray-800 px-4 py-2.5 rounded text-sm font-medium transition-colors"
                >
                  ← Back to List
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => submit(true)}
                    disabled={loading}
                    className="bg-white border border-gray-300 hover:bg-gray-50 px-6 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Save & New"}
                  </button>
                  <button
                    onClick={() => submit(false)}
                    disabled={loading}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
