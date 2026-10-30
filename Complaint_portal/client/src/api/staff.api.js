import { api, data } from './axios.js';

export const staffApi = {
  list: (params) => data(api.get('/staff/complaints', { params })),
  stats: () => data(api.get('/staff/stats')),
  get: (id) => data(api.get(`/staff/complaints/${id}`)),
  assign: (id, body) => data(api.patch(`/staff/complaints/${id}/assign`, body)),
  updateStatus: (id, formData) => data(api.patch(`/staff/complaints/${id}/status`, formData)),
  reject: (id, reason) => data(api.patch(`/staff/complaints/${id}/reject`, { reason })),
  workers: (params) => data(api.get('/staff/workers', { params })),
  recurring: (params) => data(api.get('/staff/recurring', { params })),
  acknowledgeRecurring: (id, note) => data(api.patch(`/staff/recurring/${id}/acknowledge`, { note })),
};
