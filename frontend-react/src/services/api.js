import axios from 'axios';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://sentara.oke.com';

console.log("[API INIT] Base URL →", apiBase);

const api = axios.create({
    baseURL: apiBase,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // ⬇️ Log URL yang ditembak
        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`[API REQUEST] ${config.method?.toUpperCase()} → ${fullUrl}`);

        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 / 403
api.interceptors.response.use(
    (response) => {
        // ⬇️ Optional: log jika ingin lihat response
        console.log(`[API RESPONSE] ${response.status} ← ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.response) {
            console.log(`[API ERROR] ${error.response.status} from ${error.config.url}`);
        }

        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        if (error.response && error.response.status === 403) {
            console.warn("Access Forbidden (403) - Logging out");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
