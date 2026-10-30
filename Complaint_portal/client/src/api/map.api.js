import { api, data } from './axios.js';

export const mapApi = {
  locations: () => data(api.get('/locations')),
  heatmap: (params) => data(api.get('/map/heatmap', { params })),
};
