/// <reference types="vite/client" />
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sf_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_user');
      localStorage.removeItem('sf_shop');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (phone: string, password: string) =>
    api.post('/auth/login', { phone, password }).then(r => r.data),
  register: (data: Record<string, string>) =>
    api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
};

// Inventory
export const inventoryApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    api.get('/inventory', { params }).then(r => r.data),
  get: (id: string) => api.get(`/inventory/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/inventory', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/inventory/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/inventory/${id}`).then(r => r.data),
  brands: () => api.get('/inventory/brands').then(r => r.data),
  lowStock: () => api.get('/inventory/alerts/low-stock').then(r => r.data),
};

// Billing
export const billingApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/billing', { params }).then(r => r.data),
  get: (id: string) => api.get(`/billing/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/billing', data).then(r => r.data),
  void: (id: string) => api.delete(`/billing/${id}`).then(r => r.data),
};

// Analytics
export const analyticsApi = {
  summary: (period: string) =>
    api.get('/analytics/summary', { params: { period } }).then(r => r.data),
  trend: (period: string) =>
    api.get('/analytics/trend', { params: { period } }).then(r => r.data),
  topProducts: (period: string, limit = 8) =>
    api.get('/analytics/top-products', { params: { period, limit } }).then(r => r.data),
  brands: (period: string) =>
    api.get('/analytics/brands', { params: { period } }).then(r => r.data),
  sizes: (period: string) =>
    api.get('/analytics/sizes', { params: { period } }).then(r => r.data),
  payments: (period: string) =>
    api.get('/analytics/payments', { params: { period } }).then(r => r.data),
  deadStock: (days = 30) =>
    api.get('/analytics/dead-stock', { params: { days } }).then(r => r.data),
};

// Shop
export const shopApi = {
  get: () => api.get('/shop').then(r => r.data),
  update: (data: Record<string, string>) =>
    api.put('/shop', data).then(r => r.data),
  staff: () => api.get('/shop/staff').then(r => r.data),
};

export default api;

// Logo
export const logoApi = {
  upload: (logo_data: string) => api.post('/shop/logo', { logo_data }).then(r => r.data),
  delete: () => api.delete('/shop/logo').then(r => r.data),
};

// Staff management
export const staffApi = {
  list: () => api.get('/shop/staff').then(r => r.data),
  add: (data: Record<string, string>) => api.post('/shop/staff', data).then(r => r.data),
  update: (id: string, data: Record<string, string | number>) => api.put(`/shop/staff/${id}`, data).then(r => r.data),
  changePassword: (id: string, password: string) => api.put(`/shop/staff/${id}/password`, { password }).then(r => r.data),
  deactivate: (id: string) => api.delete(`/shop/staff/${id}`).then(r => r.data),
  changeMyPassword: (current_password: string, new_password: string) => api.put('/shop/my-password', { current_password, new_password }).then(r => r.data),
};
