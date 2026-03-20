/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const AUTH_STORAGE_KEY = 'atelierAuthSession';

const AuthContext = createContext(null);

function persistSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session?.token) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsBootstrapping(false);
      return;
    }

    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedSession) {
      setIsBootstrapping(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedSession);
      setToken(parsed.token || '');
      setUser(parsed.user || null);
    } catch (error) {
      console.error(error);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    apiFetch('/api/auth/me', { token })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setUser(data.user);
        persistSession({ token, user: data.user });
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) {
          return;
        }

        setToken('');
        setUser(null);
        persistSession(null);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const applyAuthResponse = (data) => {
    setToken(data.token);
    setUser(data.user);
    persistSession({ token: data.token, user: data.user });
    return data;
  };

  const register = async (payload) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: payload,
    });

    return applyAuthResponse(data);
  };

  const login = async (payload) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: payload,
    });

    return applyAuthResponse(data);
  };

  const loginWithGoogleCredential = async (credential) => {
    const data = await apiFetch('/api/auth/google', {
      method: 'POST',
      body: { credential },
    });

    return applyAuthResponse(data);
  };

  const refreshUser = async () => {
    if (!token) {
      return null;
    }

    const data = await apiFetch('/api/auth/me', { token });
    setUser(data.user);
    persistSession({ token, user: data.user });
    return data.user;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    persistSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token && user),
        isBootstrapping,
        register,
        login,
        loginWithGoogleCredential,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  return context;
}
