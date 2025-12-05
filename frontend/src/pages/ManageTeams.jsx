import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

export default function ManageTeams() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [tempPermissions, setTempPermissions] = useState({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [filterType, setFilterType] = useState("all"); // 'all', 'accounts', 'products', 'others'
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    teamLeaderId: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchTeamLeaders();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out admin users - they have full access and can't be modified
        const nonAdminUsers = data.filter(user => user.role !== 'admin');
        setUsers(nonAdminUsers);
        setFilteredUsers(nonAdminUsers);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      setError("Error fetching users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamLeaders = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users/teams/leaders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamLeaders(data);
      }
    } catch (err) {
      console.error("Error fetching team leaders:", err);
    }
  };

  // Filter users based on selected type
  useEffect(() => {
    if (filterType === 'all') {
      setFilteredUsers(users);
    } else if (filterType === 'accounts') {
      setFilteredUsers(users.filter(user => 
        user.role === 'accounts team' || user.role === 'accounts employee'
      ));
    } else if (filterType === 'products') {
      setFilteredUsers(users.filter(user => 
        user.role === 'product team' || user.role === 'product employee'
      ));
    }
  }, [filterType, users]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`User created successfully! Employee ID: ${data.user.employeeId || 'N/A'}`);
        setShowAddForm(false);
        setFormData({ name: "", email: "", password: "", role: "user", teamLeaderId: "" });
        fetchUsers();
        fetchTeamLeaders(); // Refresh team leaders if a new team was created
      } else {
        const data = await response.json();
        alert(data.message || "Failed to create user");
      }
    } catch (err) {
      alert("Error creating user");
      console.error(err);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert("User deleted successfully!");
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete user");
      }
    } catch (err) {
      alert("Error deleting user");
      console.error(err);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setTempPermissions(user.permissions || {});
    setShowUserDetails(true);
    setShowAddForm(false);
    setHasUnsavedChanges(false);
  };

  const handlePermissionChange = (permissionKey, value) => {
    setTempPermissions(prev => ({
      ...prev,
      [permissionKey]: value,
    }));
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSavingPermissions(true);
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/users/${selectedUser._id}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions: tempPermissions }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser({ ...selectedUser, permissions: data.permissions });
        // Update in the users list as well
        setUsers(users.map(u => 
          u._id === selectedUser._id 
            ? { ...u, permissions: data.permissions }
            : u
        ));
        setHasUnsavedChanges(false);
        alert("Permissions saved successfully!");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update permissions");
      }
    } catch (err) {
      alert("Error updating permissions");
      console.error(err);
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleCancelChanges = () => {
    if (selectedUser) {
      setTempPermissions(selectedUser.permissions || {});
      setHasUnsavedChanges(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "product team":
        return "bg-blue-100 text-blue-800";
      case "product employee":
        return "bg-blue-50 text-blue-700";
      case "accounts team":
        return "bg-green-100 text-green-800";
      case "accounts employee":
        return "bg-green-50 text-green-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "accounts team":
        return "Accounts";
      case "accounts employee":
        return "Accounts Employee";
      case "product team":
        return "Products";
      case "product employee":
        return "Products Employee";
      case "admin":
        return "Admin";
      case "user":
        return "User";
      default:
        return role;
    }
  };

  const permissionCategories = [
    {
      name: "Items Management",
      permissions: [
        { key: "viewItems", label: "View Items" },
        { key: "createItems", label: "Create Items" },
        { key: "editItems", label: "Edit Items" },
        { key: "deleteItems", label: "Delete Items" },
      ]
    },
    {
      name: "Parties Management",
      permissions: [
        { key: "viewParties", label: "View Parties" },
        { key: "createParties", label: "Create Parties" },
        { key: "editParties", label: "Edit Parties" },
        { key: "deleteParties", label: "Delete Parties" },
      ]
    },
    {
      name: "Sales Management",
      permissions: [
        { key: "viewSales", label: "View Sales" },
        { key: "createSales", label: "Create Sales" },
        { key: "editSales", label: "Edit Sales" },
        { key: "deleteSales", label: "Delete Sales" },
      ]
    },
    {
      name: "Purchase Management",
      permissions: [
        { key: "viewPurchases", label: "View Purchases" },
        { key: "createPurchases", label: "Create Purchases" },
        { key: "editPurchases", label: "Edit Purchases" },
        { key: "deletePurchases", label: "Delete Purchases" },
      ]
    },
    {
      name: "Reports",
      permissions: [
        { key: "viewReports", label: "View Reports" },
        { key: "exportReports", label: "Export Reports" },
      ]
    },
    {
      name: "Settings",
      permissions: [
        { key: "viewSettings", label: "View Settings" },
        { key: "editSettings", label: "Edit Settings" },
      ]
    },
    {
      name: "User Management",
      permissions: [
        { key: "manageUsers", label: "Manage Users" },
      ]
    },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-64 p-5 bg-slate-100 min-h-screen">
        {/* Top bar with search and actions */}
        <header className="bg-white rounded-lg shadow flex items-center justify-between p-4 mb-4">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">Manage Teams</h1>
            <p className="text-sm text-slate-600">Manage users and team members</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              <span className="text-lg">{showAddForm ? "✕" : "＋"}</span>
              <span>{showAddForm ? "Cancel" : "Add User"}</span>
            </button>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 mr-2">Filter by:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setFilterType('accounts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'accounts'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Accounts Team ({users.filter(u => u.role === 'accounts team' || u.role === 'accounts employee').length})
            </button>
            <button
              onClick={() => setFilterType('products')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'products'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Product Team ({users.filter(u => u.role === 'product team' || u.role === 'product employee').length})
            </button>
          </div>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add New User</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value, teamLeaderId: "" })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Role</option>
                  <option value="accounts team">Accounts</option>
                  <option value="accounts employee">Accounts Employee</option>
                  <option value="product team">Products</option>
                  <option value="product employee">Products Employee</option>
                </select>
              </div>
              {(formData.role === 'accounts employee' || formData.role === 'product employee') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Team Leader <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.teamLeaderId}
                    onChange={(e) =>
                      setFormData({ ...formData, teamLeaderId: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Team Leader</option>
                    {teamLeaders
                      .filter(leader => 
                        leader.role === 'accounts team'
                      )
                      .map(leader => (
                        <option key={leader._id} value={leader._id}>
                          {leader.name} ({leader.employeeId})
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  ✓ Create User
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4">
          {/* Users List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {filterType === 'all' ? 'No users found' : `No users found in ${filterType} category`}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Team Leader
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-slate-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                      {user.employeeId ? (
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">
                          {user.employeeId}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                      {user.teamLeaderId ? (
                        <div className="text-xs">
                          <div className="font-medium">{user.teamLeaderId.name}</div>
                          <div className="text-slate-500">({user.teamLeaderId.employeeId})</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="text-white bg-blue-500 hover:bg-blue-600 text-sm px-3 py-1 mr-3 rounded"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-white bg-red-500 hover:bg-red-600 text-sm px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>

        {/* User Details Modal */}
        {showUserDetails && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div 
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => {
                if (!hasUnsavedChanges) {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }
              }}
            ></div> 

            {/* Modal Content */}
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-slate-800">{selectedUser.name}</h3>
                    <p className="text-sm text-slate-600">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!hasUnsavedChanges || window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                      setShowUserDetails(false);
                      setSelectedUser(null);
                      setHasUnsavedChanges(false);
                    }
                  }}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* User Info Section */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(selectedUser.role)}`}>
                      {getRoleDisplayName(selectedUser.role)}
                    </span>
                    {selectedUser.employeeId && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono rounded">
                        {selectedUser.employeeId}
                      </span>
                    )}
                  </div>
                  {selectedUser.teamLeaderId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-slate-600 mb-1">Reports to:</div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                          {selectedUser.teamLeaderId.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{selectedUser.teamLeaderId.name}</div>
                          <div className="text-xs text-slate-500">{selectedUser.teamLeaderId.employeeId}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Permissions Section */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-4">Permissions</h4>
                  
                  {permissionCategories.map((category, catIndex) => (
                    <div key={catIndex} className="mb-6">
                      <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                        {category.name}
                      </h5>
                      <div className="space-y-2">
                        {category.permissions.map((perm) => (
                          <label key={perm.key} className="flex items-center cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={tempPermissions[perm.key] || false}
                              onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="ml-3 text-sm text-slate-700">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-200">
                {hasUnsavedChanges && (
                  <div className="mb-3 text-xs text-amber-600 flex items-center">
                    <span className="mr-2">⚠️</span>
                    You have unsaved changes
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePermissions}
                    disabled={!hasUnsavedChanges || savingPermissions}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      hasUnsavedChanges && !savingPermissions
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {savingPermissions ? 'Saving...' : 'Save Changes'}
                  </button>
                  {hasUnsavedChanges && (
                    <button
                      onClick={handleCancelChanges}
                      disabled={savingPermissions}
                      className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
