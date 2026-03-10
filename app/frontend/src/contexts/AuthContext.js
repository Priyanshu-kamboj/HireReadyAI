import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
      const response = await axios.get(`${API}/auth/me`, {
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
    const response = await axios.post(`${API}/auth/register`, { name, email, password });
    const { user: newUser } = response.data;
    // Keep user logged out; require explicit login afterwards
    return newUser;
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: newUser } = response.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    return newUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const upgradeUser = async () => {
    try {
      const response = await axios.post(`${API}/payment/upgrade`, {}, {
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