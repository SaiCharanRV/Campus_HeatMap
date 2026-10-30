import { api, data } from './axios.js';

export const adminApi = {
  users: (params) => data(api.get('/admin/users', { params })),
  createUser: (body) => data(api.post('/admin/users', body)),
  updateUser: (id, body) => data(api.patch(`/admin/users/${id}`, body)),
  deactivateUser: (id) => data(api.delete(`/admin/users/${id}`)),

  zones: () => data(api.get('/admin/zones')),
  createZone: (body) => data(api.post('/admin/zones', body)),
  updateZone: (id, body) => data(api.patch(`/admin/zones/${id}`, body)),
  deleteZone: (id) => data(api.delete(`/admin/zones/${id}`)),

  createLocation: (body) => data(api.post('/admin/locations', body)),
  updateLocation: (id, body) => data(api.patch(`/admin/locations/${id}`, body)),
  deleteLocation: (id) => data(api.delete(`/admin/locations/${id}`)),

  mappings: () => data(api.get('/admin/mappings')),
  setMapping: (body) => data(api.put('/admin/mappings', body)),
  deleteMapping: (id) => data(api.delete(`/admin/mappings/${id}`)),

  analytics: () => data(api.get('/admin/analytics')),
};
