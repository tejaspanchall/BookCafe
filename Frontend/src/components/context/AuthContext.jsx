'use client';
import { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export const AuthContext = createContext(null);

const getStorageValue = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`Error accessing localStorage for key ${key}:`, e);
    return null;
  }
};

const setStorageValue = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Error setting localStorage for key ${key}:`, e);
  }
};

const removeStorageValue = (key) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing localStorage for key ${key}:`, e);
  }
};

export const AuthProvider = ({ children }) => {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND;
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState({ isAuthenticated: false, isTeacher: false });

  const updateAuthState = useCallback(() => {
    const storedToken = getStorageValue('token');
    const storedUser = getStorageValue('user');
    let parsedUser = null;

    try {
      parsedUser = storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    }

    const currentToken = token || storedToken;
    const currentUser = user || parsedUser;

    setAuthState({
      isAuthenticated: !!currentToken && !!currentUser,
      isTeacher: currentUser?.role === 'teacher' || false
    });

    if (!token && storedToken) setToken(storedToken);
    if (!user && parsedUser) setUser(parsedUser);
  }, [token, user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      updateAuthState();
    }
  }, [token, user, updateAuthState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedUser = getStorageValue('user');
    const storedToken = getStorageValue('token');
    
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
      } catch (e) {
        console.error('Failed to parse stored user during initialization:', e);
        removeStorageValue('user');
        removeStorageValue('token');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${BACKEND}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      setStorageValue('token', data.token);
      setStorageValue('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      updateAuthState();
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = useCallback(() => {
    removeStorageValue('token');
    removeStorageValue('user');
    setToken(null);
    setUser(null);
    setAuthState({ isAuthenticated: false, isTeacher: false });
    router.push('/login');
    return true;
  }, [router]);

  const isAuthenticated = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    const currentToken = token || getStorageValue('token');
    const currentUser = user || (() => {
      try {
        const stored = getStorageValue('user');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    })();
    return !!currentToken && !!currentUser;
  }, [token, user]);

  const isTeacher = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const currentUser = user || (() => {
      try {
        const stored = getStorageValue('user');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    })();
    return currentUser?.role === 'teacher';
  }, [user]);

  const value = {
    token: typeof window !== 'undefined' ? (token || getStorageValue('token')) : null,
    user: typeof window !== 'undefined' ? (user || (() => {
      try {
        const stored = getStorageValue('user');
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    })()) : null,
    login,
    logout,
    isAuthenticated,
    isTeacher,
    authState,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};