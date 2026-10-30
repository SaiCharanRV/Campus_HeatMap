import { api, data } from './axios.js';

export const authApi = {
  sendRegisterOtp: (email) => data(api.post('/auth/register/send-otp', { email })),
  verifyRegister: (body) => data(api.post('/auth/register/verify', body)),
  login: (body) => data(api.post('/auth/login', body)),
  forgotPassword: (email) => data(api.post('/auth/forgot-password', { email })),
  resetPassword: (body) => data(api.post('/auth/reset-password', body)),
  me: () => data(api.get('/auth/me')),
};
