import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createItem, getItemById, updateItem, getAllItems, deleteItem, completeItem } from "../services/api";
import Sidebar from "../components/Sidebar";
import { canCreate, canEdit, canDelete, canExportReports } from "../utils/permissions";

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

  // Raw Materials
  rawMaterials: [
    {
      id: 1,
      materialName: "",
      quantity: "",
      unit: "",
      costPerUnit: "",
      supplier: "",
      notes: "",
      usedInProcessStep: null,
    },
  ],

  // Inspection Checks
  inspectionChecks: [
    {
      id: 1,
      checkName: "",
      description: "",
      checkType: "visual",
      acceptanceCriteria: "",
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
  
  // New states for employee view steps
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [employeeTracking, setEmployeeTracking] = useState(null);
  const [itemCompletionStatus, setItemCompletionStatus] = useState({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completingItem, setCompletingItem] = useState(false);

  // States for item name dropdown
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemNameSearch, setItemNameSearch] = useState("");
  
  // States for category dropdown
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  
  // States for unit dropdown
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  // State for drag and drop
  const [draggedSubStep, setDraggedSubStep] = useState(null);
  const [draggedStep, setDraggedStep] = useState(null);

  const fileInputRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Fetch all items on component mount
  useEffect(() => {
    loadItems();
  }, []);

  // Sync itemNameSearch with form.name when editing
  useEffect(() => {
    if (form.name && !itemNameSearch) {
      setItemNameSearch(form.name);
    }
  }, [form.name]);

  // Sync categorySearch and unitSearch with form values
  useEffect(() => {
    if (form.category && !categorySearch) {
      setCategorySearch(form.category);
    }
    if (form.unit && !unitSearch) {
      setUnitSearch(form.unit);
    }
  }, [form.category, form.unit]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showItemDropdown && !event.target.closest('.item-name-dropdown-container')) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showItemDropdown]);

  const loadItems = async () => {
    setLoadingItems(true);
    try {
      const userRole = getUserRole();
      
      if (userRole === 'employee') {
        // For employees, fetch only assigned items from their orders
        const ordersResponse = await fetch('http://localhost:5000/api/employees/my-orders', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const ordersData = await ordersResponse.json();
        
        // Fetch employee tracking data
        const trackingResponse = await fetch('http://localhost:5000/api/employees/my-items', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const trackingData = await trackingResponse.json();
        
        // Build completion status map from Mappings data
        const completionMap = {};
        if (trackingData.items) {
          trackingData.items.forEach(mapping => {
            completionMap[mapping.itemId] = {
              status: mapping.status,
              completedAt: mapping.completedAt,
              startedAt: mapping.startedAt,
              progressPercentage: mapping.progressPercentage,
              notes: mapping.notes
            };
          });
        }
        setItemCompletionStatus(completionMap);
        
        // Extract unique items from all orders
        const assignedItemIds = new Set();
        const assignedItems = [];
        
        // Also fetch full item details from my-items which includes processes
        const itemDetailsMap = {};
        if (trackingData.items) {
          trackingData.items.forEach(mapping => {
            if (mapping.itemId && mapping.item) {
              itemDetailsMap[mapping.itemId] = mapping.item;
            }
          });
        }
        
        (ordersData.orders || []).forEach(order => {
          (order.items || []).forEach(orderItem => {
            const itemId = orderItem.itemId;
            if (itemId && !assignedItemIds.has(itemId)) {
              assignedItemIds.add(itemId);
              // Get full item details from tracking data (includes processes)
              const fullItem = itemDetailsMap[itemId];
              assignedItems.push({
                _id: itemId,
                code: orderItem.itemCode || fullItem?.code,
                name: orderItem.itemName || fullItem?.name,
                unit: orderItem.unit || fullItem?.unit,
                processes: fullItem?.processes || [],
                type: fullItem?.type,
                category: fullItem?.category,
                openingQty: fullItem?.openingQty || 0,
                currentStock: fullItem?.currentStock || fullItem?.openingQty || 0
              });
            }
          });
        });
        
        setItems(assignedItems);
      } else {
        // For other roles, fetch all items
        const response = await getAllItems();
        setItems(response.data || []);
      }
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
            rawMaterials:
              data.rawMaterials && data.rawMaterials.length > 0
                ? data.rawMaterials
                : f.rawMaterials,
            inspectionChecks:
              data.inspectionChecks && data.inspectionChecks.length > 0
                ? data.inspectionChecks
                : f.inspectionChecks,
          }));
          // Initialize search fields
          setItemNameSearch(data.name || "");
          setCategorySearch(data.category || "");
          setUnitSearch(data.unit || "");
        })
        .catch((err) => {
          console.error("load item error", err);
          setError("Failed to load item for editing");
        })
        .finally(() => setLoading(false));
    }
  }, [location.search]);

  const updateField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const generateReportHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-IN', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Item Report - ${form.name || 'Unnamed Item'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              background: #fff;
              color: #000;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              padding-bottom: 15px; 
              border-bottom: 2px solid #000;
            }
            .header h1 { 
              color: #000; 
              font-size: 18px; 
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header p { 
              color: #000; 
              font-size: 11px;
            }
            .section { 
              margin-bottom: 20px; 
              page-break-inside: avoid;
            }
            .section-title { 
              background: #fff;
              color: #000; 
              padding: 8px 0; 
              font-size: 13px; 
              font-weight: bold;
              border-bottom: 1px solid #000;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            table, th, td {
              border: 1px solid #000;
            }
            th {
              background: #f5f5f5;
              padding: 8px;
              text-align: left;
              font-weight: bold;
              font-size: 11px;
            }
            td {
              padding: 8px;
              font-size: 11px;
            }
            .info-row {
              display: flex;
              margin-bottom: 5px;
            }
            .info-label { 
              width: 150px;
              font-weight: bold;
              font-size: 11px;
            }
            .info-value { 
              flex: 1;
              font-size: 11px;
            }
            .process-item { 
              margin-bottom: 10px; 
              padding: 8px;
              border: 1px solid #000;
            }
            .process-header { 
              font-weight: bold;
              margin-bottom: 5px;
              font-size: 11px;
            }
            .substep { 
              margin-left: 20px; 
              font-size: 11px;
              margin-top: 3px;
            }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              font-size: 10px;
              padding-top: 15px;
              border-top: 1px solid #000;
            }
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ITEM SUMMARY REPORT</h1>
            <p>Date: ${currentDate}</p>
          </div>

          <!-- Basic Information -->
          <div class="section">
            <div class="section-title">Basic Information</div>
            <table>
              <tr>
                <th>Item Type</th>
                <th>Item Name</th>
                <th>Item Code</th>
              </tr>
              <tr>
                <td>${form.type || '-'}</td>
                <td>${form.name || '-'}</td>
                <td>${form.code || '-'}</td>
              </tr>
              <tr>
                <th>HSN</th>
                <th>Unit</th>
                <th>Category</th>
              </tr>
              <tr>
                <td>${form.hsn || '-'}</td>
                <td>${form.unit || '-'}</td>
                <td>${form.category || '-'}</td>
              </tr>
            </table>
          </div>

          <!-- Pricing -->
          <div class="section">
            <div class="section-title">Pricing Details</div>
            <table>
              <tr>
                <th>Sale Price</th>
                <th>Tax Type</th>
                <th>Purchase Price</th>
                <th>Tax Type</th>
                <th>Tax Rate</th>
              </tr>
              <tr>
                <td>INR ${form.salePrice || '0'}</td>
                <td>${form.salePriceTaxType === 'with' ? 'With Tax' : 'Without Tax'}</td>
                <td>INR ${form.purchasePrice || '0'}</td>
                <td>${form.purchasePriceTaxType === 'with' ? 'With Tax' : 'Without Tax'}</td>
                <td>${form.taxRate || 'None'}</td>
              </tr>
            </table>
          </div>

          <!-- Stock -->
          <div class="section">
            <div class="section-title">Stock Information</div>
            <table>
              <tr>
                <th>Opening Quantity</th>
                <th>At Price</th>
                <th>As Of Date</th>
                <th>Minimum Stock</th>
                <th>Location</th>
              </tr>
              <tr>
                <td>${form.openingQty || '0'} ${form.unit || ''}</td>
                <td>INR ${form.atPrice || '0'}</td>
                <td>${form.asOfDate || '-'}</td>
                <td>${form.minStock || '-'} ${form.unit || ''}</td>
                <td>${form.location || '-'}</td>
              </tr>
            </table>
          </div>

          ${form.processes && form.processes.some(p => p.stepName) ? `
          <!-- Processes -->
          <div class="section">
            <div class="section-title">Manufacturing Process Steps</div>
            <table>
              <tr>
                <th>Step No.</th>
                <th>Step Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Sub-Steps</th>
              </tr>
              ${form.processes.filter(p => p.stepName).map((process, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${process.stepName}</td>
                  <td>${process.stepType === 'testing' ? 'Testing' : 'Execution'}</td>
                  <td>${process.description || '-'}</td>
                  <td>
                    ${process.subSteps && process.subSteps.length > 0 
                      ? process.subSteps.map(sub => `${sub.name}${sub.description ? ' - ' + sub.description : ''}`).join('<br>') 
                      : '-'}
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}

          ${form.rawMaterials && form.rawMaterials.some(m => m.materialName) ? `
          <!-- Raw Materials -->
          <div class="section">
            <div class="section-title">Raw Materials Required</div>
            <table>
              <tr>
                <th>Material Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Cost/Unit</th>
                <th>Supplier</th>
                <th>Used in Step</th>
              </tr>
              ${form.rawMaterials.filter(m => m.materialName).map((material) => `
                <tr>
                  <td>${material.materialName}</td>
                  <td>${material.quantity || '-'}</td>
                  <td>${material.unit || '-'}</td>
                  <td>INR ${material.costPerUnit || '0'}</td>
                  <td>${material.supplier || '-'}</td>
                  <td>${material.usedInProcessStep 
                    ? `Step ${form.processes.findIndex(p => p.id === material.usedInProcessStep) + 1}`
                    : 'Not linked'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}

          ${form.inspectionChecks && form.inspectionChecks.some(c => c.checkName) ? `
          <!-- Inspection Checks -->
          <div class="section">
            <div class="section-title">Quality Inspection Checks</div>
            <table>
              <tr>
                <th>Check No.</th>
                <th>Check Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Description</th>
                <th>Acceptance Criteria</th>
              </tr>
              ${form.inspectionChecks.filter(c => c.checkName).map((check, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${check.checkName}</td>
                  <td>${check.checkType}</td>
                  <td>${check.status}</td>
                  <td>${check.description || '-'}</td>
                  <td>${check.acceptanceCriteria || '-'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}

          <div class="footer">
            <p>This report was generated by Elints Manufacturing System</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleItemNameSelect = (selectedItem) => {
    // Auto-fill all fields except HSN, code, and image
    setForm((f) => ({
      ...f,
      name: selectedItem.name,
      // Keep HSN, code, and imageBase64 unchanged
      unit: selectedItem.unit || "",
      category: selectedItem.category || "",
      salePrice: selectedItem.salePrice || "",
      salePriceTaxType: selectedItem.salePriceTaxType || "without",
      saleDiscountType: selectedItem.saleDiscountType || "percentage",
      purchasePrice: selectedItem.purchasePrice || "",
      purchasePriceTaxType: selectedItem.purchasePriceTaxType || "without",
      taxRate: selectedItem.taxRate || "None",
      openingQty: selectedItem.openingQty || "",
      atPrice: selectedItem.atPrice || "",
      asOfDate: selectedItem.asOfDate ? selectedItem.asOfDate.slice(0, 10) : f.asOfDate,
      minStock: selectedItem.minStock || "",
      location: selectedItem.location || "",
      processes:
        selectedItem.processes && selectedItem.processes.length > 0
          ? selectedItem.processes
          : f.processes,
      rawMaterials:
        selectedItem.rawMaterials && selectedItem.rawMaterials.length > 0
          ? selectedItem.rawMaterials
          : f.rawMaterials,
      inspectionChecks:
        selectedItem.inspectionChecks && selectedItem.inspectionChecks.length > 0
          ? selectedItem.inspectionChecks
          : f.inspectionChecks,
    }));
    setItemNameSearch(selectedItem.name);
    setCategorySearch(selectedItem.category || "");
    setUnitSearch(selectedItem.unit || "");
    setShowItemDropdown(false);
  };

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
        rawMaterials: form.rawMaterials,
        inspectionChecks: form.inspectionChecks,
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
        setItemNameSearch("");
      } else {
        // Go back to list view after save
        setTimeout(() => {
          setShowForm(false);
          setForm(defaultForm());
          setItemNameSearch("");
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
    setItemNameSearch("");
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
    setItemNameSearch("");
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

  const handleViewSteps = (item) => {
    // Don't allow opening completed items
    const completionData = itemCompletionStatus[item._id];
    if (completionData?.status === 'completed') {
      setMessage('This item has already been completed!');
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    
    setViewingItem(item);
    setShowStepsModal(true);
    setCurrentStepIndex(0); // Reset to first step
    
    // Load checked substeps from employee tracking
    const initialCheckedSteps = {};
    
    if (completionData && completionData.steps) {
      completionData.steps.forEach(step => {
        if (step.status === 'completed') {
          initialCheckedSteps[step.stepId] = true;
        }
        step.subSteps.forEach(subStep => {
          if (subStep.status === 'completed') {
            initialCheckedSteps[`${step.stepId}-${subStep.subStepId}`] = true;
          }
        });
      });
    }
    
    setCheckedSteps(initialCheckedSteps);
  };

  const handleStepCheckbox = async (stepId, subStepId) => {
    const key = `${stepId}-${subStepId}`;
    
    // One-time tickable only - if already checked, don't allow unchecking
    if (checkedSteps[key]) {
      return;
    }
    
    // Update UI immediately
    const newCheckedSteps = { ...checkedSteps, [key]: true };
    setCheckedSteps(newCheckedSteps);
  };

  const handleCompleteItem = async () => {
    if (!viewingItem) return;
    
    try {
      setCompletingItem(true);
      const response = await completeItem(viewingItem._id);
      
      // Update item completion status
      setItemCompletionStatus(prev => ({
        ...prev,
        [viewingItem._id]: {
          ...prev[viewingItem._id],
          status: 'completed',
          completedAt: new Date().toISOString()
        }
      }));
      
      // Refresh items list
      await loadItems();
      
      // Show different message based on whether order was completed
      const successMessage = response.data.orderCompleted
        ? '🎉 All items completed! Order marked as completed and moved to history.'
        : '✅ Item completed successfully!';
      
      setMessage(successMessage);
      
      // Close modal and clear message
      setTimeout(() => {
        setShowStepsModal(false);
        setViewingItem(null);
        setCurrentStepIndex(0);
        setMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Error completing item:', error);
      setError('Failed to mark item as completed: ' + (error.response?.data?.message || error.message));
    } finally {
      setCompletingItem(false);
    }
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
          <span className="text-black text-2xl font-bold">Items</span>
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
                    {userRole !== 'employee' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-600">Sale Price</p>
                          <p className="text-sm font-medium text-gray-900">₹{selectedItem?.salePrice || '0'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Purchase Price</p>
                          <p className="text-sm font-medium text-gray-900">₹{selectedItem?.purchasePrice || '0'}</p>
                        </div>
                      </>
                    )}
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
                {canCreate('items') && (
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
                    {userRole !== 'product team' && userRole !== 'employee' && (
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
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item Code</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                          {userRole !== 'employee' && <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sale Price</th>}
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stock</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="text-sm font-medium text-gray-900">{item.code || '-'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              {item.hsn && <div className="text-xs text-gray-500">HSN: {item.hsn}</div>}
                            </td>
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
                            {userRole !== 'employee' && (
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                ₹{item.salePrice || '0'}
                              </td>
                            )}
                            <td className="py-3 px-4 text-sm text-gray-600">{item.openingQty || '0'} {item.unit || ''}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {userRole === 'employee' && (
                                  itemCompletionStatus[item._id]?.status === 'completed' ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      ✓ Completed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleViewSteps(item)}
                                      className="text-white bg-blue-500 hover:bg-blue-600 text-sm font-medium px-3 py-1 rounded-lg"
                                    >
                                      View
                                    </button>
                                  )
                                )}
                                {userRole === 'product team' && (
                                  <button
                                    onClick={() => handleViewProgress(item)}
                                    className="text-white bg-green-500 hover:bg-green-600 text-sm font-medium p-2 rounded-lg"
                                  >
                                    View Progress
                                  </button>
                                )}
                                {canEdit('items') && (
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-white bg-blue-500 hover:bg-blue-600 text-sm font-medium px-3 py-1 rounded-lg"
                                  >
                                    Edit
                                  </button>
                                )}
                                {canDelete('items') && (
                                  <button
                                    onClick={() => handleDeleteItem(item._id)}
                                    className="text-white bg-red-500 hover:bg-red-600 text-sm font-medium px-3 py-1 rounded-lg"
                                  >
                                    Delete
                                  </button>
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
              {/* Row 1: Item Code, Item Name, HSN, Category */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Item Code
                  </label>
                  <input
                    value={form.code}
                    onChange={(e) => updateField("code", e.target.value)}
                    placeholder="Item Code"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="relative item-name-dropdown-container">
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Item Name *
                  </label>
                  <div className="relative">
                    <input
                      value={itemNameSearch}
                      onChange={(e) => {
                        // Only update the name field, don't auto-fill other fields
                        setItemNameSearch(e.target.value);
                        updateField("name", e.target.value);
                        setShowItemDropdown(true);
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                      placeholder="Type or select item name"
                    />
                    <button
                      type="button"
                      onClick={() => setShowItemDropdown(!showItemDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showItemDropdown ? '▲' : '▼'}
                    </button>
                    {showItemDropdown && items.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                        {items
                          .filter((item) =>
                            item.name.toLowerCase().includes(itemNameSearch.toLowerCase())
                          )
                          .slice(0, 20)
                          .map((item) => (
                            <div
                              key={item._id}
                              onClick={() => handleItemNameSelect(item)}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{item.name}</div>
                              {item.code && (
                                <div className="text-xs text-gray-500">Code: {item.code}</div>
                              )}
                            </div>
                          ))}
                        {items.filter((item) =>
                          item.name.toLowerCase().includes(itemNameSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No matching items found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Category
                  </label>
                  <div className="relative">
                    <input
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        updateField("category", e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                      placeholder="Type or select category"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCategoryDropdown ? '▲' : '▼'}
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                        {['electronics', 'furniture', 'clothing', 'food', 'raw materials', 'tools', 'accessories', 'machinery']
                          .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map((category) => (
                            <div
                              key={category}
                              onClick={() => {
                                updateField("category", category);
                                setCategorySearch(category);
                                setShowCategoryDropdown(false);
                              }}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            >
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Select Unit, Add Item Image, Image Preview */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Select Unit
                  </label>
                  <div className="relative">
                    <input
                      value={unitSearch}
                      onChange={(e) => {
                        setUnitSearch(e.target.value);
                        updateField("unit", e.target.value);
                        setShowUnitDropdown(true);
                      }}
                      onFocus={() => setShowUnitDropdown(true)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                      placeholder="Type or select unit"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showUnitDropdown ? '▲' : '▼'}
                    </button>
                    {showUnitDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                        {['pieces', 'kg', 'grams', 'liters', 'meters', 'boxes', 'dozens', 'rolls', 'sheets', 'units']
                          .filter(unit => unit.toLowerCase().includes(unitSearch.toLowerCase()))
                          .map((unit) => (
                            <div
                              key={unit}
                              onClick={() => {
                                updateField("unit", unit);
                                setUnitSearch(unit);
                                setShowUnitDropdown(false);
                              }}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            >
                              {unit.charAt(0).toUpperCase() + unit.slice(1)}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">
                    Add Image
                  </label>
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
                  {userRole !== 'employee' && (
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
                  )}
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
                  <button
                    onClick={() => setActiveTab("rawMaterials")}
                    className={`pb-3 text-sm font-medium transition-all ${
                      activeTab === "rawMaterials"
                        ? "border-b-2 border-red-500 text-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Raw Materials
                  </button>
                  <button
                    onClick={() => setActiveTab("inspectionCheck")}
                    className={`pb-3 text-sm font-medium transition-all ${
                      activeTab === "inspectionCheck"
                        ? "border-b-2 border-red-500 text-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Inspection Check
                  </button>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className={`pb-3 text-sm font-medium transition-all ${
                      activeTab === "reports"
                        ? "border-b-2 border-red-500 text-red-600"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Reports
                  </button>
                </div>

                {activeTab === "pricing" && userRole !== 'employee' && (
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
                            onChange={(e) => {
                              const selectedTax = e.target.value;
                              updateField("taxRate", selectedTax);
                              // Auto-change to 'with tax' if any tax other than 'None' is selected
                              if (selectedTax !== 'None') {
                                updateField("salePriceTaxType", "with");
                                updateField("purchasePriceTaxType", "with");
                              }
                            }}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                          >
                            <option>None</option>
                            <option>IGST@0%</option>
                            <option>GST@0%</option>
                            <option>IGST@ 0.25%</option>
                            <option>GST@0.25%</option>
                            <option>IGST@3%</option>
                            <option>GST@3%</option>
                            <option>IGST@5%</option>
                            <option>GST@5%</option>
                            <option>IGST@12%</option>
                            <option>GST@12%</option>
                            <option>IGST@18%</option>
                            <option>GST@18%</option>
                            <option>IGST@28%</option>
                            <option>GST@28%</option>
                            <option>Exempt</option>
                            <option>IGST@40%</option>
                            <option>GST@40%</option>
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
                      {userRole !== 'employee' && (
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
                      )}
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
                        draggable
                        onDragStart={(e) => {
                          setDraggedStep(index);
                          e.currentTarget.classList.add('opacity-50');
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.classList.remove('opacity-50');
                          setDraggedStep(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                          
                          if (draggedStep !== null && draggedStep !== index) {
                            const newProcesses = [...form.processes];
                            const draggedItem = newProcesses[draggedStep];
                            
                            // Remove from old position
                            newProcesses.splice(draggedStep, 1);
                            // Insert at new position
                            newProcesses.splice(index, 0, draggedItem);
                            
                            updateField("processes", newProcesses);
                          }
                        }}
                        className="mb-6 pb-6 border-b border-gray-200 last:border-b-0 cursor-move transition-all"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            {/* Drag Handle */}
                            <div className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing">
                              <svg width="16" height="20" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="2" y="3" width="12" height="2" rx="1"/>
                                <rect x="2" y="7" width="12" height="2" rx="1"/>
                                <rect x="2" y="11" width="12" height="2" rx="1"/>
                              </svg>
                            </div>
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
                              className="w-full h-12 rows-{1} border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Description
                            </label>
                            <textarea
                              value={process.description}
                              onChange={(e) => {
                                const newProcesses = [...form.processes];
                                newProcesses[index].description =
                                  e.target.value;
                                updateField("processes", newProcesses);
                              }}
                              placeholder="Brief description of this step"
                              className="w-full h-12 rows-{1} border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1.5">
                            Sub-Steps
                          </label>
                          <div className="space-y-2">
                            {(process.subSteps || []).map((subStep, subIndex) => (
                              <div 
                                key={subStep.id} 
                                draggable
                                onDragStart={(e) => {
                                  setDraggedSubStep({ processIndex: index, subStepIndex: subIndex });
                                  e.currentTarget.classList.add('opacity-50');
                                }}
                                onDragEnd={(e) => {
                                  e.currentTarget.classList.remove('opacity-50');
                                  setDraggedSubStep(null);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                                  
                                  if (draggedSubStep && draggedSubStep.processIndex === index) {
                                    const newProcesses = [...form.processes];
                                    const subSteps = [...newProcesses[index].subSteps];
                                    const draggedItem = subSteps[draggedSubStep.subStepIndex];
                                    
                                    // Remove from old position
                                    subSteps.splice(draggedSubStep.subStepIndex, 1);
                                    // Insert at new position
                                    subSteps.splice(subIndex, 0, draggedItem);
                                    
                                    newProcesses[index].subSteps = subSteps;
                                    updateField("processes", newProcesses);
                                  }
                                }}
                                className="flex gap-2 items-start bg-gray-50 p-3 rounded border border-gray-200 cursor-move transition-all">
                                <div className="flex-shrink-0 flex items-center pt-2 text-gray-400 cursor-grab active:cursor-grabbing">
                                  <svg width="16" height="30" viewBox="0 0 16 16" fill="currentColor">
                                    <rect x="2" y="3" width="12" height="2" rx="1"/>
                                    <rect x="2" y="7" width="12" height="2" rx="1"/>
                                    <rect x="2" y="11" width="12" height="2" rx="1"/>
                                  </svg>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <input
                                    value={subStep.name}
                                    onChange={(e) => {
                                      const newProcesses = [...form.processes];
                                      newProcesses[index].subSteps[subIndex].name = e.target.value;
                                      updateField("processes", newProcesses);
                                    }}
                                    placeholder="Sub-step name (e.g., Apply primer, Mix materials)"
                                    className="w-full border border-gray-300 rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <textarea
                                    value={subStep.description}
                                    onChange={(e) => {
                                      const newProcesses = [...form.processes];
                                      newProcesses[index].subSteps[subIndex].description = e.target.value;
                                      updateField("processes", newProcesses);
                                    }}
                                    placeholder="Details (e.g., Amount: 2L, Color: Red, Temp: 200°C)"
                                    className="w-full h-12 resize-none border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                          {/* Display linked raw materials for this process step */}
                          {form.rawMaterials.filter(m => m.usedInProcessStep === process.id).length > 0 && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                              <h5 className="text-xs font-semibold text-amber-800 mb-2">📦 Raw Materials for this Step:</h5>
                              <div className="space-y-1">
                                {form.rawMaterials
                                  .filter(m => m.usedInProcessStep === process.id)
                                  .map((material, matIndex) => (
                                    <div key={matIndex} className="text-xs text-amber-700">
                                      • {material.materialName || "Unnamed Material"} 
                                      {material.quantity && material.unit && ` - ${material.quantity} ${material.unit}`}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
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

                {activeTab === "rawMaterials" && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Raw Materials Required
                      </h3>
                      <p className="text-xs text-gray-500 mb-4">
                        List all raw materials needed to manufacture this item, including quantities, costs, and suppliers.
                      </p>
                    </div>

                    {form.rawMaterials.map((material, index) => (
                      <div
                        key={material.id}
                        className="mb-6 pb-6 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h4 className="text-sm font-medium text-gray-700">
                              Material {index + 1}
                            </h4>
                            {material.usedInProcessStep && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                🔗 Linked to Step {form.processes.findIndex(p => p.id === material.usedInProcessStep) + 1}
                              </span>
                            )}
                          </div>
                          {form.rawMaterials.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newMaterials = form.rawMaterials.filter(
                                  (_, i) => i !== index
                                );
                                updateField("rawMaterials", newMaterials);
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove Material
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Material Name *
                            </label>
                            <input
                              value={material.materialName}
                              onChange={(e) => {
                                const newMaterials = [...form.rawMaterials];
                                newMaterials[index].materialName = e.target.value;
                                updateField("rawMaterials", newMaterials);
                              }}
                              placeholder="e.g., Steel Sheet, Plastic Resin, Paint"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Quantity
                            </label>
                            <input
                              value={material.quantity}
                              onChange={(e) => {
                                const newMaterials = [...form.rawMaterials];
                                newMaterials[index].quantity = e.target.value;
                                updateField("rawMaterials", newMaterials);
                              }}
                              placeholder="Quantity"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Unit
                            </label>
                            <input
                              list={`unit-options-${index}`}
                              value={material.unit}
                              onChange={(e) => {
                                const newMaterials = [...form.rawMaterials];
                                newMaterials[index].unit = e.target.value;
                                updateField("rawMaterials", newMaterials);
                              }}
                              placeholder="Type or select unit"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <datalist id={`unit-options-${index}`}>
                              <option value="kg">Kilograms (kg)</option>
                              <option value="grams">Grams (g)</option>
                              <option value="liters">Liters (L)</option>
                              <option value="meters">Meters (m)</option>
                              <option value="pieces">Pieces (pcs)</option>
                              <option value="boxes">Boxes</option>
                              <option value="rolls">Rolls</option>
                            </datalist>
                          </div>
                        </div>

                        <div className={`grid gap-4 mb-3 ${userRole !== 'employee' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                          {userRole !== 'employee' && (
                            <div>
                              <label className="block text-sm text-gray-600 mb-1.5">
                                Cost Per Unit
                              </label>
                              <input
                                value={material.costPerUnit}
                                onChange={(e) => {
                                  const newMaterials = [...form.rawMaterials];
                                  newMaterials[index].costPerUnit = e.target.value;
                                  updateField("rawMaterials", newMaterials);
                                }}
                                placeholder="Cost Per Unit"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Supplier
                            </label>
                            <input
                              value={material.supplier}
                              onChange={(e) => {
                                const newMaterials = [...form.rawMaterials];
                                newMaterials[index].supplier = e.target.value;
                                updateField("rawMaterials", newMaterials);
                              }}
                              placeholder="Supplier Name"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Used in Process Step
                            </label>
                            <select
                              value={material.usedInProcessStep || ""}
                              onChange={(e) => {
                                const newMaterials = [...form.rawMaterials];
                                newMaterials[index].usedInProcessStep = e.target.value ? parseInt(e.target.value) : null;
                                updateField("rawMaterials", newMaterials);
                              }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            >
                              <option value="">Not linked to any step</option>
                              {form.processes.map((process, processIndex) => (
                                <option key={process.id} value={process.id}>
                                  Step {processIndex + 1}: {process.stepName || "Unnamed Step"}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Notes
                            </label>
                            <input
                              value={material.notes}
                              onChange={(e) => {
                                const newMaterials = [...form.rawMaterials];
                                newMaterials[index].notes = e.target.value;
                                updateField("rawMaterials", newMaterials);
                              }}
                              placeholder="Additional notes"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const newMaterials = [
                          ...form.rawMaterials,
                          {
                            id: Date.now(),
                            materialName: "",
                            quantity: "",
                            unit: "",
                            costPerUnit: "",
                            supplier: "",
                            notes: "",
                            usedInProcessStep: null,
                          },
                        ];
                        updateField("rawMaterials", newMaterials);
                      }}
                      className="mt-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>+</span>
                      <span>Add Another Raw Material</span>
                    </button>
                  </div>
                )}
                {/*inspection check*/}
                {activeTab === "inspectionCheck" && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Quality Inspection Checks
                      </h3>
                      <p className="text-xs text-gray-500 mb-4">
                        Define quality control checks to be performed on this item during or after manufacturing.
                      </p>
                    </div>

                    {form.inspectionChecks.map((check, index) => (
                      <div
                        key={check.id}
                        className="mb-6 pb-6 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <h4 className="text-sm font-medium text-gray-700">
                              Check {index + 1}
                            </h4>

                            {/* Check Type Badge */}
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                check.checkType === "visual"
                                  ? "bg-purple-100 text-purple-700"
                                  : check.checkType === "measurement"
                                  ? "bg-blue-100 text-blue-700"
                                  : check.checkType === "functional"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {check.checkType === "visual" && "👁️ Visual"}
                              {check.checkType === "measurement" && "📏 Measurement"}
                              {check.checkType === "functional" && "⚙️ Functional"}
                              {check.checkType === "other" && "📋 Other"}
                            </span>
                          </div>

                          {form.inspectionChecks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newChecks = form.inspectionChecks.filter(
                                  (_, i) => i !== index
                                );
                                updateField("inspectionChecks", newChecks);
                              }}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove Check
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Check Name *
                            </label>
                            <input
                              value={check.checkName}
                              onChange={(e) => {
                                const newChecks = [...form.inspectionChecks];
                                newChecks[index].checkName = e.target.value;
                                updateField("inspectionChecks", newChecks);
                              }}
                              placeholder="e.g., Surface Finish Check, Dimension Verification"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Check Type
                            </label>
                            <select
                              value={check.checkType}
                              onChange={(e) => {
                                const newChecks = [...form.inspectionChecks];
                                newChecks[index].checkType = e.target.value;
                                updateField("inspectionChecks", newChecks);
                              }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            >
                              <option value="visual">Visual Inspection</option>
                              <option value="measurement">Measurement</option>
                              <option value="functional">Functional Test</option>
                              <option value="other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Status
                            </label>
                            <select
                              value={check.status}
                              onChange={(e) => {
                                const newChecks = [...form.inspectionChecks];
                                newChecks[index].status = e.target.value;
                                updateField("inspectionChecks", newChecks);
                              }}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                            >
                              <option value="pending">Pending</option>
                              <option value="passed">Passed</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Description
                            </label>
                            <textarea
                              value={check.description}
                              onChange={(e) => {
                                const newChecks = [...form.inspectionChecks];
                                newChecks[index].description = e.target.value;
                                updateField("inspectionChecks", newChecks);
                              }}
                              placeholder="Detailed description of the inspection check"
                              rows="2"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-600 mb-1.5">
                              Acceptance Criteria
                            </label>
                            <textarea
                              value={check.acceptanceCriteria}
                              onChange={(e) => {
                                const newChecks = [...form.inspectionChecks];
                                newChecks[index].acceptanceCriteria = e.target.value;
                                updateField("inspectionChecks", newChecks);
                              }}
                              placeholder="e.g., No visible scratches, Dimensions within ±0.5mm tolerance"
                              rows="2"
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        const newChecks = [
                          ...form.inspectionChecks,
                          {
                            id: Date.now(),
                            checkName: "",
                            description: "",
                            checkType: "visual",
                            acceptanceCriteria: "",
                            status: "pending",
                          },
                        ];
                        updateField("inspectionChecks", newChecks);
                      }}
                      className="mt-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span>+</span>
                      <span>Add Another Inspection Check</span>
                    </button>
                  </div>
                )}

                {activeTab === "reports" && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">
                          Item Summary Report
                        </h3>
                        <p className="text-xs text-gray-500">
                          Complete overview of all item details
                        </p>
                      </div>
                      {canExportReports() && (
                        <button
                          type="button"
                          onClick={() => {
                            // Export report functionality
                            const reportContent = generateReportHTML();
                            const printWindow = window.open('', '_blank');
                            printWindow.document.write(reportContent);
                            printWindow.document.close();
                            printWindow.focus();
                            setTimeout(() => {
                              printWindow.print();
                            }, 250);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <span>📄</span>
                          <span>Export Report</span>
                        </button>
                      )}
                    </div>

                    <div id="report-content" className="space-y-6">
                      {/* Basic Information Section */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2">
                          📋 Basic Information
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Item Type</p>
                            <p className="text-sm font-medium text-gray-900 capitalize">{form.type || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Item Name</p>
                            <p className="text-sm font-medium text-gray-900">{form.name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Item Code</p>
                            <p className="text-sm font-medium text-gray-900">{form.code || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">HSN</p>
                            <p className="text-sm font-medium text-gray-900">{form.hsn || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Unit</p>
                            <p className="text-sm font-medium text-gray-900">{form.unit || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Category</p>
                            <p className="text-sm font-medium text-gray-900 capitalize">{form.category || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Section */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-900 mb-3 border-b border-blue-300 pb-2">
                          💰 Pricing Details
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-blue-700">Sale Price</p>
                            <p className="text-sm font-medium text-blue-900">₹{form.salePrice || '0'}</p>
                            <p className="text-xs text-blue-600">{form.salePriceTaxType === 'with' ? 'With Tax' : 'Without Tax'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700">Purchase Price</p>
                            <p className="text-sm font-medium text-blue-900">₹{form.purchasePrice || '0'}</p>
                            <p className="text-xs text-blue-600">{form.purchasePriceTaxType === 'with' ? 'With Tax' : 'Without Tax'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700">Tax Rate</p>
                            <p className="text-sm font-medium text-blue-900">{form.taxRate || 'None'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Stock Section */}
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="text-sm font-semibold text-purple-900 mb-3 border-b border-purple-300 pb-2">
                          📦 Stock Information
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-purple-700">Opening Quantity</p>
                            <p className="text-sm font-medium text-purple-900">{form.openingQty || '0'} {form.unit || ''}</p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-700">At Price</p>
                            <p className="text-sm font-medium text-purple-900">₹{form.atPrice || '0'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-700">As Of Date</p>
                            <p className="text-sm font-medium text-purple-900">{form.asOfDate || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-700">Minimum Stock</p>
                            <p className="text-sm font-medium text-purple-900">{form.minStock || '-'} {form.unit || ''}</p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-700">Location</p>
                            <p className="text-sm font-medium text-purple-900">{form.location || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Manufacturing Processes */}
                      {form.processes && form.processes.length > 0 && form.processes[0].stepName && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <h4 className="text-sm font-semibold text-green-900 mb-3 border-b border-green-300 pb-2">
                            ⚙️ Manufacturing Process Steps ({form.processes.filter(p => p.stepName).length})
                          </h4>
                          <div className="space-y-3">
                            {form.processes.filter(p => p.stepName).map((process, index) => (
                              <div key={process.id} className="bg-white p-3 rounded border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-semibold text-green-800">Step {index + 1}:</span>
                                  <span className="text-sm font-medium text-gray-900">{process.stepName}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    process.stepType === 'testing' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {process.stepType === 'testing' ? '🧪 Testing' : '⚙️ Execution'}
                                  </span>
                                </div>
                                {process.description && (
                                  <p className="text-xs text-gray-600 ml-4">{process.description}</p>
                                )}
                                {process.subSteps && process.subSteps.length > 0 && (
                                  <div className="ml-4 mt-2 space-y-1">
                                    {process.subSteps.map((subStep, idx) => (
                                      <div key={subStep.id} className="text-xs text-gray-700">
                                        • {subStep.name} {subStep.description && `- ${subStep.description}`}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raw Materials */}
                      {form.rawMaterials && form.rawMaterials.length > 0 && form.rawMaterials[0].materialName && (
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                          <h4 className="text-sm font-semibold text-amber-900 mb-3 border-b border-amber-300 pb-2">
                            📦 Raw Materials Required ({form.rawMaterials.filter(m => m.materialName).length})
                          </h4>
                          <div className="space-y-2">
                            {form.rawMaterials.filter(m => m.materialName).map((material, index) => (
                              <div key={material.id} className="bg-white p-3 rounded border border-amber-200 grid grid-cols-5 gap-3 text-xs">
                                <div>
                                  <p className="text-amber-700 font-medium">Material</p>
                                  <p className="text-gray-900">{material.materialName}</p>
                                </div>
                                <div>
                                  <p className="text-amber-700 font-medium">Quantity</p>
                                  <p className="text-gray-900">{material.quantity || '-'} {material.unit || ''}</p>
                                </div>
                                <div>
                                  <p className="text-amber-700 font-medium">Cost/Unit</p>
                                  <p className="text-gray-900">₹{material.costPerUnit || '0'}</p>
                                </div>
                                <div>
                                  <p className="text-amber-700 font-medium">Supplier</p>
                                  <p className="text-gray-900">{material.supplier || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-amber-700 font-medium">Used in Step</p>
                                  <p className="text-gray-900">
                                    {material.usedInProcessStep 
                                      ? `Step ${form.processes.findIndex(p => p.id === material.usedInProcessStep) + 1}`
                                      : 'Not linked'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Inspection Checks */}
                      {form.inspectionChecks && form.inspectionChecks.length > 0 && form.inspectionChecks[0].checkName && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <h4 className="text-sm font-semibold text-red-900 mb-3 border-b border-red-300 pb-2">
                            ✓ Quality Inspection Checks ({form.inspectionChecks.filter(c => c.checkName).length})
                          </h4>
                          <div className="space-y-2">
                            {form.inspectionChecks.filter(c => c.checkName).map((check, index) => (
                              <div key={check.id} className="bg-white p-3 rounded border border-red-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-red-800">Check {index + 1}:</span>
                                  <span className="text-sm font-medium text-gray-900">{check.checkName}</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    check.checkType === 'visual' ? 'bg-purple-100 text-purple-700' :
                                    check.checkType === 'measurement' ? 'bg-blue-100 text-blue-700' :
                                    check.checkType === 'functional' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {check.checkType}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    check.status === 'passed' ? 'bg-green-100 text-green-700' :
                                    check.status === 'failed' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {check.status}
                                  </span>
                                </div>
                                {check.description && (
                                  <p className="text-xs text-gray-600 mt-1">{check.description}</p>
                                )}
                                {check.acceptanceCriteria && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">Criteria:</span> {check.acceptanceCriteria}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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

      {/* Modal for Employee - View Manufacturing Steps */}
      {showStepsModal && viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Manufacturing Steps</h2>
                <p className="text-sm text-blue-100 mt-1">{viewingItem.name} ({viewingItem.code})</p>
              </div>
              <button
                onClick={() => setShowStepsModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {viewingItem.processes && viewingItem.processes.length > 0 ? (
                <div className="space-y-4">
                  {/* Progress Indicator */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-900">
                        Step {currentStepIndex + 1} of {viewingItem.processes.length}
                      </span>
                      <div className="flex gap-1">
                        {viewingItem.processes.map((_, idx) => (
                          <div 
                            key={idx}
                            className={`w-8 h-1.5 rounded-full ${
                              idx < currentStepIndex 
                                ? 'bg-green-500' 
                                : idx === currentStepIndex 
                                ? 'bg-blue-600' 
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentStepIndex + 1) / viewingItem.processes.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Current Step Only */}
                  {(() => {
                    const process = viewingItem.processes[currentStepIndex];
                    if (!process) return null;
                    
                    // Check if all substeps are completed
                    const allSubStepsCompleted = process.subSteps && process.subSteps.length > 0
                      ? process.subSteps.every(subStep => checkedSteps[`${process.id}-${subStep.id}`])
                      : true;
                    
                    return (
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        {/* Step Header */}
                        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">
                              {currentStepIndex + 1}
                            </span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-lg">{process.stepName}</h3>
                              {process.description && (
                                <p className="text-sm text-gray-600 mt-1">{process.description}</p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              process.stepType === 'testing' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {process.stepType === 'testing' ? '🧪 Testing' : '⚙️ Execution'}
                            </span>
                          </div>
                        </div>

                        {/* Sub-steps */}
                        {process.subSteps && process.subSteps.length > 0 ? (
                          <div className="p-6 bg-gray-50">
                            <h4 className="text-sm font-semibold text-gray-700 mb-4">Sub-steps to complete:</h4>
                            <div className="space-y-3">
                              {process.subSteps.map((subStep) => {
                                const isChecked = checkedSteps[`${process.id}-${subStep.id}`];
                                return (
                                  <div key={subStep.id} className="flex items-start gap-3 bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isChecked || false}
                                      onChange={() => handleStepCheckbox(process.id, subStep.id)}
                                      disabled={isChecked}
                                      className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 ${
                                        isChecked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                                      }`}
                                    />
                                    <div className="flex-1">
                                      <div className={`text-sm font-medium ${isChecked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                        {subStep.name}
                                      </div>
                                      {subStep.description && (
                                        <div className="text-xs text-gray-500 mt-1">{subStep.description}</div>
                                      )}
                                    </div>
                                    {isChecked && (
                                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Next Button - Only show when all substeps are completed */}
                            {allSubStepsCompleted && currentStepIndex < viewingItem.processes.length - 1 && (
                              <div className="mt-6 flex justify-end">
                                <button
                                  onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                                >
                                  Next Step
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            
                            {/* Complete Item Button */}
                            {allSubStepsCompleted && currentStepIndex === viewingItem.processes.length - 1 && (
                              <div className="mt-6 flex justify-center">
                                <button
                                  onClick={() => handleCompleteItem(viewingItem._id)}
                                  disabled={completingItem}
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed"
                                >
                                  {completingItem ? (
                                    <>
                                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Completing...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Complete Item
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-6 bg-gray-50 text-center text-gray-500">
                            No sub-steps defined for this step.
                            {currentStepIndex < viewingItem.processes.length - 1 && (
                              <button
                                onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                              >
                                Next Step →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No manufacturing steps defined for this item.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
              <button
                onClick={() => setShowStepsModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
