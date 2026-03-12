import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/api/config";

interface User {
    id: number;
    email: string;
    username: string;
    tercero_id?: number;
    is_staff: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, refreshToken: string) => Promise<User | null>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("grapp_access_token"));
    const [isLoading, setIsLoading] = useState(true);

    // Setup Axios Interceptor
    useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // Logica para refresh token (simplificada)
                if (error.response?.status === 401 && !originalRequest._retry) {
                    // Token is expired, redirect to login
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [token]);

    const checkAuth = async (overrideToken?: string): Promise<User | null> => {
        const activeToken = overrideToken || token;
        try {
            if (!activeToken) throw new Error("No token");
            const response = await axios.get(`${API_URL}/api/auth/me/`, {
                headers: { Authorization: `Bearer ${activeToken}` },
            });
            setUser(response.data);
            return response.data as User;
        } catch (err) {
            console.error("Auth check failed:", err);
            logout();
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            checkAuth();
        } else {
            setIsLoading(false);
        }
    }, [token]);

    const login = async (accessToken: string, refreshToken: string): Promise<User | null> => {
        localStorage.setItem("grapp_access_token", accessToken);
        localStorage.setItem("grapp_refresh_token", refreshToken);
        setToken(accessToken);
        return await checkAuth(accessToken);
    };

    const logout = () => {
        localStorage.removeItem("grapp_access_token");
        localStorage.removeItem("grapp_refresh_token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
};
