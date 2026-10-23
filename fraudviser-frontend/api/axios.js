import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  timeout: 90000,
});

export default api;
