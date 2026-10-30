import axios from 'axios';

export const TOKEN_KEY = 'iitr_token';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A rejected token means the session is over; AuthContext listens for this
    if (err.response?.status === 401 && err.config?.headers?.Authorization) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong';

export const data = (promise) => promise.then((res) => res.data);
