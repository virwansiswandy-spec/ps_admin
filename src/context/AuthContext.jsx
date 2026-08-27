import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { SERVER_ORIGIN } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login/json', { email, password });
      const { access_token } = response.data;
      
      setToken(access_token);
      localStorage.setItem('token', access_token);

      // Fetch user profile info
      const userRes = await api.get('/users/me');
      const userData = userRes.data;

      if (!['admin', 'super_admin'].includes(userData.role)) {
        // Clear tokens if user is not authorized as admin
        setToken(null);
        localStorage.removeItem('token');
        throw new Error('Akses ditolak. Akun ini tidak memiliki hak akses Admin.');
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true };
    } catch (err) {
      let msg = 'Login gagal. Coba lagi.';
      if (err.response?.data?.detail) {
        const d = err.response.data.detail;
        if (typeof d === 'string') {
          msg = d;
        } else if (Array.isArray(d)) {
          msg = d.map(item => (typeof item === 'object' ? item.msg || JSON.stringify(item) : item)).join(', ');
        } else {
          msg = JSON.stringify(d);
        }
      } else if (err.message) {
        msg = err.message === 'Network Error' 
          ? `Gagal terhubung ke Server Backend (FastAPI). Pastikan server backend sudah berjalan di ${SERVER_ORIGIN}.` 
          : err.message;
      }
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      isAuthenticated: !!token && ['admin', 'super_admin'].includes(user?.role),
      isSuperAdmin: user?.role === 'super_admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
