import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from './WebSocketContext';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'coffee_shop_auth_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();
  const { sendMessage, isReady } = useWebSocket();

  useEffect(() => {
    if (!isReady || !user?.username) return;
    sendMessage('AUTH_RESUME', { username: user.username });
  }, [isReady, user, sendMessage]);

  const login = (username, role) => {
    const nextUser = { username, role };
    setUser(nextUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    if (role === 'admin') navigate('/admin');
    if (role === 'cashier') navigate('/shop');
    if (role === 'kitchen') navigate('/kitchen');
  };

  const logout = () => {
    if (isReady) {
      sendMessage('AUTH_LOGOUT');
    }
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
