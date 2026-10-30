import { api, data } from './axios.js';

export const alertApi = {
  list: (params) => data(api.get('/alerts', { params })),
  create: (body) => data(api.post('/alerts', body)),
  update: (id, body) => data(api.patch(`/alerts/${id}`, body)),
  resolve: (id) => data(api.post(`/alerts/${id}/resolve`)),
  remove: (id) => data(api.delete(`/alerts/${id}`)),
};
