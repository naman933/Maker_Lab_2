import { createContext, useContext, useState, useEffect } from 'react';

const API = process.env.REACT_APP_BACKEND_URL || '';
const TOKEN_KEY = 'aqis_token';
const USER_KEY = 'aqis_session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const resp = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        return { success: false, error: data.detail || 'Invalid username or password' };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const resp = await fetch(`${API}/api/users`);
      if (resp.ok) {
        const users = await resp.json();
        const current = users.find(u => u.id === user.id);
        if (current) {
          localStorage.setItem(USER_KEY, JSON.stringify(current));
          setUser(current);
        }
      }
    } catch {}
  };

  const isAdmin = user?.role === 'Admin' || user?.isAdminAccess === true;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
