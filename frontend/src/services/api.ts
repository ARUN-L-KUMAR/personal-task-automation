import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach JWT Bearer token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('g-one_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
        console.error('API Error:', message);

        // Auto-logout on 401 (expired / invalid token)
        if (error.response?.status === 401) {
            localStorage.removeItem('g-one_token');
            // Don't redirect here — let the auth store handle it
        }

        return Promise.reject({
            message,
            status: error.response?.status,
            details: error.response?.data,
        });
    }
);

export default api;
