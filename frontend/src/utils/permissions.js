// Permission utility functions

export const getUserPermissions = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.permissions || {};
  } catch {
    return {};
  }
};

export const hasPermission = (permission) => {
  const permissions = getUserPermissions();
  // Admin has all permissions by default
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.role === 'admin') {
    return true;
  }
  return permissions[permission] === true;
};

export const hasAnyPermission = (permissionList) => {
  return permissionList.some(permission => hasPermission(permission));
};

export const hasAllPermissions = (permissionList) => {
  return permissionList.every(permission => hasPermission(permission));
};

// Check if user can view a specific section
export const canViewSection = (section) => {
  const sectionPermissions = {
    items: 'viewItems',
    parties: 'viewParties',
    sales: 'viewSales',
    purchases: 'viewPurchases',
    reports: 'viewReports',
    settings: 'viewSettings',
    manageTeams: 'manageUsers'
  };
  
  return hasPermission(sectionPermissions[section]);
};

// Check CRUD permissions
export const canCreate = (entity) => {
  const createPermissions = {
    items: 'createItems',
    parties: 'createParties',
    sales: 'createSales',
    purchases: 'createPurchases'
  };
  
  return hasPermission(createPermissions[entity]);
};

export const canEdit = (entity) => {
  const editPermissions = {
    items: 'editItems',
    parties: 'editParties',
    sales: 'editSales',
    purchases: 'editPurchases',
    settings: 'editSettings'
  };
  
  return hasPermission(editPermissions[entity]);
};

export const canDelete = (entity) => {
  const deletePermissions = {
    items: 'deleteItems',
    parties: 'deleteParties',
    sales: 'deleteSales',
    purchases: 'deletePurchases'
  };
  
  return hasPermission(deletePermissions[entity]);
};

export const canExportReports = () => {
  return hasPermission('exportReports');
};
