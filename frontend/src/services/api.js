import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api', // Relative path to leverage proxy defined in package.json
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to add token if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -- Orders --
export const getAllOrders = (params) => api.get('/orders', { params });
export const getMyOrders = (params) => api.get('/orders/mine', { params });
export const createOrder = (data) => api.post('/orders', data);
export const searchOrders = (query) => api.get('/orders', { params: { search: query } });
export const assignOrder = (id, employeeId) => api.patch(`/orders/${id}/assign`, { employeeId });
export const updateOrderStatus = (id, status, note) => api.patch(`/orders/${id}/status`, { status, note });
export const getOrderTree = (params) => api.get('/orders/tree', { params });
export const getOrderFlowStats = () => api.get('/orders/stats/flow');

// -- Dashboard --
export const getDashboardSummary = () => api.get('/dashboard/summary');
export const getOrderChartData = (params) => api.get('/dashboard/charts/orders', { params }); // e.g. { period: 'month' }
export const getRecentTransactions = () => api.get('/dashboard/recent-transactions');

// -- Items --
export const getAllItems = () => api.get('/items');
export const getItemById = (id) => api.get(`/items/${id}`);
export const createItem = (data) => api.post('/items', data);
export const updateItem = (id, data) => api.put(`/items/${id}`, data);
export const getItemTransactions = (id) => api.get(`/items/${id}/transactions`);
export const deleteItem = (id) => api.delete(`/items/${id}`);

// -- Parties --
export const getAllParties = (params) => api.get('/parties', { params }); // e.g. { type: 'customer' }
export const createParty = (data) => api.post('/parties', data);

// -- Sales --
export const createSale = (data) => api.post('/sales', data);

// -- Purchases --
export const createPurchase = (data) => api.post('/purchases', data);

// Default export
export default api;
