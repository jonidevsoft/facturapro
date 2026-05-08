import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Adjuntar token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirigir al login si el token expira
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── AUTH
export const authApi = {
  login: (email, password) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

// ── CLIENTES
export const clientsApi = {
  list:   (params) => api.get('/clients', { params }),
  get:    (id)     => api.get(`/clients/${id}`),
  create: (data)   => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id)     => api.delete(`/clients/${id}`),
}

// ── PRODUCTOS
export const productsApi = {
  list:   (params) => api.get('/products', { params }),
  get:    (id)     => api.get(`/products/${id}`),
  create: (data)   => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
}

// ── FACTURAS
export const invoicesApi = {
  list:    (params) => api.get('/invoices', { params }),
  get:     (id)     => api.get(`/invoices/${id}`),
  create:  (data)   => api.post('/invoices', data),
  update:  (id, data) => api.put(`/invoices/${id}`, data),
  issue:   (id)     => api.post(`/invoices/${id}/issue`),
  cancel:  (id)     => api.post(`/invoices/${id}/cancel`),
  pdfUrl:  (id)     => `${BASE_URL}/invoices/${id}/pdf`,
}

// ── DASHBOARD
export const dashboardApi = {
  stats:      () => api.get('/dashboard/stats'),
  revenue:    (year) => api.get('/dashboard/revenue', { params: { year } }),
  topClients: (limit = 5) => api.get('/dashboard/top-clients', { params: { limit } }),
}

export default api
