import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllItems, updateItem } from '../services/api'; // ✅ API Usage
import {
    LuLoader,
    LuCircleAlert,
    LuCircleCheck,
    LuCircleX,
    LuPlus,
    LuX
} from "react-icons/lu";

const Inventory = () => {
    // 1️⃣ State Management
    const [loading, setLoading] = useState(true);
    const [inventoryData, setInventoryData] = useState([]);
    const [rawItems, setRawItems] = useState([]); // Store full items for dropdowns

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [formError, setFormError] = useState(null);

    const [formData, setFormData] = useState({
        itemId: "",
        isManual: false,
        materialName: "",
        quantity: "",
        unit: "units"
    });

    // Permission Check
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        const checkPermission = () => {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    // Allow if admin or product team (who manage items) or has explicit permission
                    if (user.role === 'admin' || user.role === 'product team' || user.permissions?.editItems) {
                        setCanEdit(true);
                    }
                }
            } catch (e) {
                console.error("Error checking permissions:", e);
            }
        };
        checkPermission();
    }, []);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await getAllItems();
            const items = response?.data || [];

            setRawItems(items); // Store raw data for dropdowns

            const processedData = processInventoryData(items);
            setInventoryData(processedData);
        } catch (error) {
            console.error("Failed to fetch inventory:", error);
            setInventoryData([]);
            setRawItems([]);
        } finally {
            setLoading(false);
        }
    };

    const processInventoryData = (items) => {
        if (!Array.isArray(items)) return [];
        const bomList = [];

        items.forEach(item => {
            if (!item) return;

            // INFERENCE LOGIC: If has raw materials, it's a Finished Good. Else Raw Material.
            const isFinishedGood = item.rawMaterials && Array.isArray(item.rawMaterials) && item.rawMaterials.length > 0;
            const type = isFinishedGood ? 'Finished Good' : 'Raw Material';

            if (isFinishedGood) {
                // Render bill of materials rows for Finished Goods
                item.rawMaterials.forEach(rm => {
                    if (!rm) return;
                    const requiredQty = parseFloat(rm.quantity) || 0;
                    const availableQty = parseFloat(item.openingQty) || 0;
                    const isSufficient = availableQty >= requiredQty;

                    bomList.push({
                        id: `${item._id}-${rm.id || rm._id || Math.random()}`,
                        itemName: item.name || "Unknown Item",
                        type: type, // Added Type
                        rawMaterialName: rm.materialName || "Unknown Material",
                        requiredQty: requiredQty,
                        availableQty: availableQty,
                        unit: rm.unit || item.unit || "N/A",
                        status: isSufficient ? "Sufficient" : "Insufficient"
                    });
                });
            } else {
                // Render single row for Raw Materials / Standalone Items
                bomList.push({
                    id: item._id,
                    itemName: item.name || "Unknown Item",
                    type: type, // Added Type
                    rawMaterialName: "-",
                    requiredQty: "-",
                    availableQty: parseFloat(item.openingQty) || 0,
                    unit: item.unit || "N/A",
                    status: "Stock"
                });
            }
        });
        return bomList;
    };

    // --- Add Raw Material Logic ---

    // Derive unique raw materials for dropdown
    const getAvailableMaterials = () => {
        const materials = new Set();
        rawItems.forEach(item => {
            if (item.rawMaterials) {
                item.rawMaterials.forEach(rm => {
                    if (rm.materialName) materials.add(rm.materialName);
                });
            }
        });
        return Array.from(materials).sort();
    };

    const handleOpenModal = () => {
        setFormData({
            itemId: "",
            isManual: false,
            materialName: "",
            quantity: "",
            unit: "units"
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        // Validation
        if (!formData.itemId) return setFormError("Please select an Item.");
        if (!formData.materialName.trim()) return setFormError("Please enter a Material Name.");
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) return setFormError("Please enter a valid positive Quantity.");

        try {
            setSubmissionLoading(true);

            // 1. Find the target item
            const targetItem = rawItems.find(i => i._id === formData.itemId);
            if (!targetItem) throw new Error("Item not found");

            // 2. Prepare updated Raw Materials array
            const currentMaterials = targetItem.rawMaterials || [];

            // CRITICAL FIX: Schema requires 'id' (Number) and 'quantity' (String)
            const newMaterial = {
                id: Date.now(), // Generate unique numeric ID
                materialName: formData.materialName,
                quantity: formData.quantity.toString(), // Schema defines quantity as String
                unit: formData.unit
            };

            const updatedMaterials = [...currentMaterials, newMaterial];

            // 3. Call Update API
            const payload = {
                ...targetItem,
                rawMaterials: updatedMaterials
            };

            await updateItem(targetItem._id, payload);

            // 4. Success
            setIsModalOpen(false);
            fetchInventory(); // Refresh table
        } catch (err) {
            console.error("Update failed:", err);
            if (err.response && err.response.status === 403) {
                setFormError("You don't have permission to update this item.");
            } else {
                setFormError(err.response?.data?.message || "Failed to update item. Please try again.");
            }
        } finally {
            setSubmissionLoading(false);
        }
    };

    // --- Render ---

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <LuLoader className="w-10 h-10 animate-spin mb-3 text-blue-600" />
                    <p>Loading inventory data...</p>
                </div>
            );
        }

        if (inventoryData.length === 0) {
            return (
                <div className="bg-white rounded-lg shadow-sm w-full h-full flex flex-col items-center justify-center text-center p-8">
                    {/* Empty state content */}
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No inventory data available</h3>
                    <p className="text-gray-500 max-w-sm mb-6">Add raw materials to items to see them here.</p>
                    <button
                        onClick={handleOpenModal}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <LuPlus className="w-4 h-4 mr-2" />
                        Add Raw Materials
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                                <th className="px-6 py-4">Item Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Raw Material</th>
                                <th className="px-6 py-4 text-center">Required Qty</th>
                                <th className="px-6 py-4 text-center">Available Qty</th>
                                <th className="px-6 py-4 text-center">Unit</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {inventoryData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors text-sm">
                                    <td className="px-6 py-4 font-medium text-gray-900">{row.itemName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${row.type === 'Finished Good'
                                                ? 'bg-purple-50 text-purple-600 border-purple-100'
                                                : 'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}>
                                            {row.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{row.rawMaterialName}</td>
                                    <td className="px-6 py-4 text-center text-gray-600">{row.requiredQty}</td>
                                    <td className="px-6 py-4 text-center text-gray-600">{row.availableQty}</td>
                                    <td className="px-6 py-4 text-center text-gray-500">{row.unit}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${row.status === 'Sufficient' || row.status === 'Stock'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                                }`}
                                        >
                                            {(row.status === 'Sufficient' || row.status === 'Stock') ? <LuCircleCheck size={12} /> : <LuCircleX size={12} />}
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
                        <div className="text-sm text-gray-500">Overview of Raw Material Requirements</div>
                    </div>
                    <button
                        onClick={handleOpenModal}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <LuPlus size={16} />
                        Add Raw Materials
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {renderContent()}
                </div>
            </div>

            {/* Modal / Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">Add Raw Material</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <LuX size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Permission Warning */}
                            {!canEdit && (
                                <div className="p-3 bg-amber-50 text-amber-500 text-xs rounded-lg flex items-center gap-2 mb-2">
                                    <LuCircleAlert size={14} /> Raw materials cannot be updated with your current permissions.
                                </div>
                            )}

                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                                    <LuCircleAlert size={14} /> {formError}
                                </div>
                            )}

                            {/* 1. Select Item */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Select Item</label>
                                <select
                                    value={formData.itemId}
                                    onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                                    className="w-full h-10 rounded-lg border border-gray-300 text-sm px-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    disabled={submissionLoading || !canEdit}
                                >
                                    <option value="">-- Choose Item --</option>
                                    {rawItems.map(item => (
                                        <option key={item._id} value={item._id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Select/Enter Raw Material */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-medium text-gray-700">Raw Material</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isManual: !formData.isManual, materialName: "" })}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
                                        disabled={!canEdit}
                                    >
                                        {formData.isManual ? "Select Existing" : "Enter New"}
                                    </button>
                                </div>

                                {formData.isManual ? (
                                    <input
                                        type="text"
                                        placeholder="Enter material name"
                                        value={formData.materialName}
                                        onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                                        className="w-full h-10 rounded-lg border border-gray-300 text-sm px-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={!canEdit}
                                    />
                                ) : (
                                    <select
                                        value={formData.materialName}
                                        onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                                        className="w-full h-10 rounded-lg border border-gray-300 text-sm px-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={!canEdit}
                                    >
                                        <option value="">-- Choose Material --</option>
                                        {getAvailableMaterials().map(mat => (
                                            <option key={mat} value={mat}>{mat}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* 3. Quantity & Unit */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full h-10 rounded-lg border border-gray-300 text-sm px-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={!canEdit}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. kg, pcs"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full h-10 rounded-lg border border-gray-300 text-sm px-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 h-10 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submissionLoading || !canEdit}
                                    className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submissionLoading && <LuLoader className="animate-spin" size={14} />}
                                    Save Material
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
