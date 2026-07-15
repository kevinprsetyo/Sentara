import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Quick client-side check for offline state
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.error('Login aborted: client offline (navigator.onLine=false)');
            return { success: false, message: 'No internet connection (offline)' };
        }

        try {
            const response = await api.post('/api/login', { email, password });
            console.log("Login Response:", response); // DEBUG

            let data = response.data;
            if (data.data) {
                // Handle nested { data: { ... } } structure standard in some APIs
                data = data.data;
            }

            // Field mapping: API returns access_token, not token
            const { access_token, token, user: userData } = data;
            const finalToken = access_token || token;

            if (!finalToken || !userData) {
                console.error("Missing token or user data in response", data);
                throw new Error("Invalid response from server");
            }

            localStorage.setItem('token', finalToken);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            return { success: true };
        } catch (error) {
            // Better error serialization for AxiosError objects
            const errInfo = error && typeof error.toJSON === 'function' ? error.toJSON() : {
                message: error.message,
                code: error.code,
                url: error.config?.url,
            };

            console.error("Login failed", errInfo);

            // Helpful message for network disconnected cases
            if (error?.code === 'ERR_INTERNET_DISCONNECTED' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
                return { success: false, message: 'No internet connection (client appears offline)' };
            }

            return {
                success: false,
                message: error.response?.data?.message || errInfo.message || 'Login failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
