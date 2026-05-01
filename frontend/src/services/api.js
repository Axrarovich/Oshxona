import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const productAPI = {
  getAll: () => api.get('/products'),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getInventory: () => api.get('/products/inventory'),
};

export const recipeAPI = {
  getAll: () => api.get('/recipes'),
  getOne: (id) => api.get(`/recipes/${id}`),
  create: (data) => api.post('/recipes', data),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
  addItem: (data) => api.post('/recipes/items', data),
  updateItem: (id, data) => api.put(`/recipes/items/${id}`, data),
  removeItem: (itemId) => api.delete(`/recipes/items/${itemId}`),
};

export const logAPI = {
  getAll: () => api.get('/logs'),
  getByDate: (date) => api.get(`/logs/${date}`),
  getByConsumption: (id) => api.get(`/logs/consumption/${id}`),
  create: (data) => api.post('/logs', data),
  delete: (id) => api.delete(`/logs/${id}`),
};

export const consumptionAPI = {
  getAll: () => api.get('/consumption'),
  getByDate: (date) => api.get(`/consumption/${date}`),
  create: (data) => api.post('/consumption', data),
  update: (id, data) => api.put(`/consumption/${id}`, data),
  delete: (id) => api.delete(`/consumption/${id}`),
};

export const wastageAPI = {
  getAll: () => api.get('/wastage'),
  getByDate: (date) => api.get(`/wastage/${date}`),
  create: (data) => api.post('/wastage', data),
  update: (id, data) => api.put(`/wastage/${id}`, data),
  delete: (id) => api.delete(`/wastage/${id}`),
};

export const reportAPI = {
  getDailyReport: (date) => api.get('/reports/daily', { params: { date } }),
  getMonthly: (year, month) => api.get('/reports/monthly', { params: { year, month } }),
  getInventory: () => api.get('/reports/inventory'),
  getConsumptionStats: (days) => api.get('/reports/consumption-stats', { params: { days } }),
};

export default api;
