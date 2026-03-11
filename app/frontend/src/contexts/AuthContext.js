import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const configuredApiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL;
const fallbackApiUrl = 'https://hirereadyai-backend.onrender.com';
const API_BASE_URL = (configuredApiUrl || fallbackApiUrl).replace(/\/$/, '');
const API = `${API_BASE_URL}/api`;

const apiClient = axios.create({
  baseURL: API,
  timeout: 20000
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    // Perform registration but DO NOT log the user in automatically
    const response = await apiClient.post('/auth/register', { name, email, password });
    const { user: newUser } = response.data;
    // Keep user logged out; require explicit login afterwards
    return newUser;
  };

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      return newUser;
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        'Login failed. Please try again.';
      console.error('Login request failed:', { message, apiBaseUrl: API_BASE_URL, error });
      throw new Error(message);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const upgradeUser = async () => {
    try {
      const response = await apiClient.post('/payment/upgrade', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({ ...user, plan_type: 'pro' });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, upgradeUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};