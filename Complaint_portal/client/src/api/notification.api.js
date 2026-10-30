import { api, data } from './axios.js';

export const notificationApi = {
  list: () => data(api.get('/notifications')),
  markRead: (id) => data(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => data(api.patch('/notifications/read-all')),
};
