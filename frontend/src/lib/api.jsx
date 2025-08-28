import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

// Auto-attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // we'll save login token here later
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
