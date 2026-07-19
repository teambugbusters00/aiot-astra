import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 1000000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('aiot_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aiot_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:    (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, userType: string, institution?: string) => api.post('/auth/register', { name, email, password, userType, institution }),
  demo:     () => api.post('/auth/demo'),
  me:       () => api.get('/auth/me'),
};

export const aiAPI = {
  generate:   (prompt: string, platform: string, socketId?: string) => api.post('/ai/generate', { prompt, platform, socketId }),
  code:       (prompt: string, platform: string, components: any[], mqttTopics: any[]) =>
                api.post('/ai/code', { prompt, platform, components, mqttTopics }),
  components: (prompt: string, platform: string) => api.post('/ai/components', { prompt, platform }),
  diagram:    (components: any[], platform: string) => api.post('/ai/diagram', { components, platform }),
  validate:   (payload: object) => api.post('/ai/validate', payload),
  getGen:     (id: string) => api.get(`/ai/generation/${id}`),
};

export const simAPI = {
  compile:    (code: string, platform: string) => api.post('/simulation/compile', { code, platform }),
  create:     (data: object) => api.post('/simulation/create', data),
  get:        (id: string) => api.get(`/simulation/${id}`),
  setPin:     (id: string, pin: number, value: boolean | number) =>
                api.post(`/simulation/${id}/pin`, { pin, value }),
  sendSerial: (id: string, data: string) => api.post(`/simulation/${id}/serial`, { data }),
  delete:     (id: string) => api.delete(`/simulation/${id}`),
};

export const mqttAPI = {
  status:    () => api.get('/mqtt/status'),
  cache:     () => api.get('/mqtt/cache'),
  subscribe: (topic: string) => api.post('/mqtt/subscribe', { topic }),
  publish:   (topic: string, payload: any, qos?: number) =>
               api.post('/mqtt/publish', { topic, payload, qos }),
};

export const projectsAPI = {
  list:   () => api.get('/projects'),
  public: () => api.get('/projects/public'),
  get:    (id: string) => api.get(`/projects/${id}`),
  create: (data: object) => api.post('/projects/create', data),
  update: (id: string, data: object) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  clone:  (id: string) => api.post(`/projects/${id}/clone`),
};

export const deployAPI = {
  ota:      (data: object) => api.post('/deploy/ota', data),
  usb:      (data: object) => api.post('/deploy/usb', data),
  ssh:      (data: object) => api.post('/deploy/ssh', data),
  devices:  () => api.get('/deploy/devices'),
  register: (data: object) => api.post('/deploy/devices/register', data),
};

export const billingAPI = {
  plans:      () => api.get('/billing/plans'),
  usage:      () => api.get('/billing/usage'),
  upgrade:    (plan: string) => api.post('/billing/upgrade', { plan }),
  resetUsage: () => api.post('/billing/reset-usage'),
};

export const serialAPI = {
  ports:      () => api.get('/serial/ports'),
  connect:    (path: string, baudRate?: number) => api.post('/serial/connect', { path, baudRate }),
  write:      (sessionId: string, data: string) => api.post('/serial/write', { sessionId, data }),
  disconnect: (sessionId: string) => api.delete(`/serial/disconnect/${sessionId}`),
};
