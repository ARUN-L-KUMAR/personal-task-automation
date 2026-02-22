import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
        console.error('API Error:', message);
        return Promise.reject({
            message,
            status: error.response?.status,
            details: error.response?.data,
        });
    }
);

export default api;
