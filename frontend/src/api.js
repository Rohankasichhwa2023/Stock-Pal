// src/api.js
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// robust interceptor
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("accessToken");
    // debug line (remove after confirming)
    console.debug("api.interceptor - token:", token);

    if (token) {
      config.headers = config.headers || {};
      // use bracket notation to avoid issues with Axios headers object shape
      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      // debug if no token
      console.debug("api.interceptor - no token found");
    }
  } catch (e) {
    console.error("api.interceptor error:", e);
  }
  return config;
}, (error) => Promise.reject(error));

export default api;
