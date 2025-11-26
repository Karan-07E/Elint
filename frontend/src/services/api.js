import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Current user verifier for each request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
  return config;
}, (error) => {
  console.error('❌ Request error:', error);
  return Promise.reject(error);
});

// Dashboard APIs
export const getDashboardSummary = () => api.get('/dashboard/summary');
export const getSalesChart = (period = 'month') => api.get(`/dashboard/sales-chart?period=${period}`);
export const getOrdersInProgressChart = (period = 'month') => api.get(`/dashboard/orders-in-progress-chart?period=${period}`);
export const getOrdersInQueueChart = (period = 'month') => api.get(`/dashboard/orders-in-queue-chart?period=${period}`);
export const getRecentTransactions = () => api.get('/dashboard/recent-transactions');

// Dashboard APIs
// export const getDashboardSummary = () => api.get('/dashboard/summary');
export const getOrderChartData = (period = 'month') => api.get(`/dashboard/charts/orders?period=${period}`); // ✅ NEW
// export const getRecentTransactions = () => api.get('/dashboard/recent-transactions');

// Party APIs
export const getAllParties = (type = '') => api.get(`/parties${type ? `?type=${type}` : ''}`);
export const getPartyById = (id) => api.get(`/parties/${id}`);
export const createParty = (data) => api.post('/parties', data);
export const updateParty = (id, data) => api.put(`/parties/${id}`, data);
export const deleteParty = (id) => api.delete(`/parties/${id}`);

// Item APIs
export const getAllItems = () => api.get('/items');
export const getItemById = (id) => api.get(`/items/${id}`);
export const createItem = (data) => api.post('/items', data);
export const updateItem = (id, data) => api.put(`/items/${id}`, data);
export const deleteItem = (id) => api.delete(`/items/${id}`);
export const getItemTransactions = (id) => api.get(`/items/${id}/transactions`);

// Sale APIs
export const getAllSales = () => api.get('/sales');
export const getSaleById = (id) => api.get(`/sales/${id}`);
export const createSale = (data) => api.post('/sales', data);
export const updateSale = (id, data) => api.put(`/sales/${id}`, data);
export const deleteSale = (id) => api.delete(`/sales/${id}`);

// Purchase APIs
export const getAllPurchases = () => api.get('/purchases');
export const getPurchaseById = (id) => api.get(`/purchases/${id}`);
export const createPurchase = (data) => api.post('/purchases', data);
export const updatePurchase = (id, data) => api.put(`/purchases/${id}`, data);
export const deletePurchase = (id) => api.delete(`/purchases/${id}`);

// Transaction APIs
export const getAllTransactions = () => api.get('/transactions');
export const getTransactionById = (id) => api.get(`/transactions/${id}`);
export const createTransaction = (data) => api.post('/transactions', data);
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

// Order APIs
export const getAllOrders = (status = '') => api.get(`/orders${status ? `?status=${status}` : ''}`);
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrder = (id, data) => api.put(`/orders/${id}`, data);
export const updateOrderStatus = (id, status, note = '') => api.patch(`/orders/${id}/status`, { status, note });
export const deleteOrder = (id) => api.delete(`/orders/${id}`);
export const getOrderStats = () => api.get('/orders/stats/summary');
export const getOrderFlowStats = () => api.get('/orders/stats/flow');
export const getOrderTree = (search = '') => api.get(`/orders/tree${search ? `?search=${search}` : ''}`);
export const searchOrders = (params = {}) => api.get('/orders', { params });

export default api;