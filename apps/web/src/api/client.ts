import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('wog_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new Error('Request timed out. The server may be starting up — please try again.'),
      );
    }
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const accessToken = localStorage.getItem('wog_access_token');
      const storedRefresh = localStorage.getItem('wog_refresh_token');

      // If no tokens are stored, this is an unauthenticated request (e.g. the
      // login endpoint itself). Let the error propagate so the caller's catch
      // block can display it — do NOT redirect to /login.
      if (!accessToken && !storedRefresh) {
        return Promise.reject(error);
      }

      if (storedRefresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken: storedRefresh,
          });
          localStorage.setItem('wog_access_token', data.accessToken);
          localStorage.setItem('wog_refresh_token', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return client(original);
        } catch {
          localStorage.removeItem('wog_access_token');
          localStorage.removeItem('wog_refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('wog_access_token');
        localStorage.removeItem('wog_refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default client;
