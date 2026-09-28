import axios from 'axios';

// SESSION AUTH ONLY — no JWT, no tokens, no localStorage/sessionStorage auth.
// The browser holds a single secure HTTP-only session cookie (lp.sid) set by
// the Express server. All requests send it via withCredentials.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 30000, // 30 seconds - allows time for email sending during registration
});

// Let the server know this is an AJAX request. Some frameworks use this
// header to determine how to handle auth failures (e.g., send a 401
// instead of a 302 redirect to a login page).
api.interceptors.request.use((config) => {
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});

// No token refresh: the session cookie is the credential. On 401 the user
// must log in again (or they were logged out by a page refresh).
api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Only dispatch session-expired for authenticated routes, not for /auth/me
    // (401 on /auth/me is expected when user is not logged in)
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/me')) {
      window.dispatchEvent(new CustomEvent('lp:session-expired'));
    }
    return Promise.reject(err);
  }
);

export const unwrap = (res) => res.data;
export const apiError = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;

export default api;