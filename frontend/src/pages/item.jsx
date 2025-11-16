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
      details: "",
      stepType: "execution",
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

          {!showForm ? (
            // Items List View
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Items</h2>
                <button
                  onClick={handleAddItem}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span>+</span>
                  <span>ADD ITEM</span>
                </button>
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
                    <button
                      onClick={handleAddItem}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
                    >
                      Add Your First Item
                    </button>
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
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item._id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Delete
                                </button>
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
                            Process Details
                          </label>
                          <textarea
                            value={process.details}
                            onChange={(e) => {
                              const newProcesses = [...form.processes];
                              newProcesses[index].details = e.target.value;
                              updateField("processes", newProcesses);
                            }}
                            placeholder="Enter detailed specifications:&#10;• Amount of paint: 2 liters&#10;• Color: Red (RAL 3020)&#10;• Weight: 5 kg&#10;• Dimensions: 100x50x30 cm&#10;• Temperature: 200°C&#10;• Duration: 2 hours&#10;• Other specifications..."
                            rows="5"
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                          />
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
                            details: "",
                            stepType: "execution",
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
