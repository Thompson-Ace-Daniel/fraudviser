import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL;
// Same-origin /api by default: Vite proxies it to the backend in development
// (see vite.config.js), and production serves it from the deployed API.
const api = axios.create({
  baseURL: (configuredApiUrl || "/api").replace(/\/+$/, ""),
  timeout: 150000,
  withCredentials: true,
});

// Notify the app when the session expires mid-use so protected routes can
// redirect to /login with their normal `from` state (no full reload).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fraudviser:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export default api;
