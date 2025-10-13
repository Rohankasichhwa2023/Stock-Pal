import axios from "axios";

const API_BASE = "http://127.0.0.1:8000"; // adjust if needed

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token for each request (reads from localStorage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Token ${token}`;  
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

export default api;
