import { api, data } from './axios.js';

export const complaintApi = {
  create: (formData) => data(api.post('/complaints', formData)),
  mine: (params) => data(api.get('/complaints/mine', { params })),
  list: (params) => data(api.get('/complaints', { params })),
  get: (id) => data(api.get(`/complaints/${id}`)),
  upvote: (id) => data(api.post(`/complaints/${id}/upvote`)),
  reopen: (id, reason) => data(api.post(`/complaints/${id}/reopen`, { reason })),
  rate: (id, body) => data(api.post(`/complaints/${id}/rate`, body)),
  comment: (id, text) => data(api.post(`/complaints/${id}/comments`, { text })),
};
