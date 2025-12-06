import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Configurar axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH
// ============================================
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getRoles: () => api.get('/auth/roles')
};

// ============================================
// VEHICULOS
// ============================================
export const vehiculosAPI = {
  getAll: (params) => api.get('/vehiculos', { params }),
  getById: (id) => api.get(`/vehiculos/${id}`),
  getEstadisticas: (id) => api.get(`/vehiculos/${id}/estadisticas`),
  create: (data) => api.post('/vehiculos', data),
  update: (id, data) => api.put(`/vehiculos/${id}`, data),
  delete: (id) => api.delete(`/vehiculos/${id}`)
};

// ============================================
// CHOFERES
// ============================================
export const choferesAPI = {
  getAll: (params) => api.get('/choferes', { params }),
  getById: (id) => api.get(`/choferes/${id}`),
  getEstadisticas: (id) => api.get(`/choferes/${id}/estadisticas`),
  create: (data) => api.post('/choferes', data),
  update: (id, data) => api.put(`/choferes/${id}`, data),
  desactivar: (id) => api.patch(`/choferes/${id}/desactivar`),
  delete: (id) => api.delete(`/choferes/${id}`)
};

// ============================================
// RUTAS
// ============================================
export const rutasAPI = {
  getAll: (params) => api.get('/rutas', { params }),
  getById: (id) => api.get(`/rutas/${id}`),
  getEstadisticas: (id) => api.get(`/rutas/${id}/estadisticas`),
  create: (data) => api.post('/rutas', data),
  update: (id, data) => api.put(`/rutas/${id}`, data),
  desactivar: (id) => api.patch(`/rutas/${id}/desactivar`),
  delete: (id) => api.delete(`/rutas/${id}`)
};

// ============================================
// VIAJES
// ============================================
export const viajesAPI = {
  getAll: (params) => api.get('/viajes', { params }),
  getById: (id) => api.get(`/viajes/${id}`),
  create: (data) => api.post('/viajes', data),
  iniciar: (id, data) => api.patch(`/viajes/${id}/iniciar`, data),
  completar: (id, data) => api.patch(`/viajes/${id}/completar`, data),
  cancelar: (id, data) => api.patch(`/viajes/${id}/cancelar`, data)
};

// ----------------------------
// MANTENIMIENTOS
// ----------------------------
export const mantenimientosAPI = {
  getAll: () => api.get("/mantenimientos"),
  getById: (id) => api.get(`/mantenimientos/${id}`),
  create: (data) => api.post("/mantenimientos", data),
  update: (id, data) => api.put(`/mantenimientos/${id}`, data),
  delete: (id) => api.delete(`/mantenimientos/${id}`),
};



// ============================================
// DASHBOARD
// ============================================
export const dashboardAPI = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getVehiculosMasUsados: (dias) => api.get('/dashboard/vehiculos-mas-usados', { params: { dias } }),
  getProductividadChoferes: (dias) => api.get('/dashboard/productividad-choferes', { params: { dias } }),
  getRutasFrecuentes: (dias) => api.get('/dashboard/rutas-frecuentes', { params: { dias } }),
  getViajesPorDia: (dias) => api.get('/dashboard/viajes-por-dia', { params: { dias } }),
  getDistribucionViajes: () => api.get('/dashboard/distribucion-viajes'),
  getViajesRecientes: (limite) => api.get('/dashboard/viajes-recientes', { params: { limite } }),
  getVehiculosProximoMantenimiento: () => api.get('/dashboard/vehiculos-proximo-mantenimiento'),
  getResumenMensual: () => api.get('/dashboard/resumen-mensual')
};

// ============================================
// ALERTAS
// ============================================
export const alertasAPI = {
  getAll: (params) => api.get('/alertas', { params }),
  getById: (id) => api.get(`/alertas/${id}`),
  getActivas: () => api.get('/alertas/activas/dashboard'),
  getEstadisticas: () => api.get('/alertas/estadisticas/general'),
  create: (data) => api.post('/alertas', data),
  resolver: (id) => api.patch(`/alertas/${id}/resolver`),
  resolverPorRelacion: (tipo, id) => api.patch(`/alertas/resolver-por-relacion/${tipo}/${id}`),
  delete: (id) => api.delete(`/alertas/${id}`)
};


// ============================================
// REPORTES (MÓDULO AVANZADO)
// ============================================
export const reportesAPI = {
  getKPIs: (params) => api.get("/reportes/kpis", { params }),
  getViajesPorDia: (params) => api.get("/reportes/viajes-por-dia", { params }),
  getRutasMasUsadas: (params) => api.get("/reportes/rutas-mas-usadas", { params }),
  getChoferesProductivos: (params) => api.get("/reportes/choferes-productivos", { params }),
  getMantenimientoPorMes: () => api.get("/reportes/mantenimiento-por-mes"),
  getAlertasPrioridad: () => api.get("/reportes/alertas-prioridad"),
  getDatosExportacion: () => api.get("/reportes/datos-exportacion"),
};



export default api;