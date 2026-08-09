import React, { useEffect, useState } from 'react';
import type { User } from '../types';
import { AuthContext } from './AuthContext.context';
import { getSessionToken } from '../utils/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (!getSessionToken()) return null;
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(Boolean(getSessionToken()));

  useEffect(() => {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      localStorage.removeItem('user');
      return;
    }

    let cancelled = false;

    const validateSession = async () => {
      try {
        const response = await fetch('/.netlify/functions/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ action: 'session' }),
        });

        if (!response.ok) {
          throw new Error('Session expired');
        }

        const data = await response.json() as { user: User };
        if (!cancelled) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('sessionToken');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const currentUser = data.user as User;
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
      localStorage.setItem('sessionToken', data.sessionToken);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('activeMatch');
    localStorage.removeItem('activeSet');
    localStorage.removeItem('activeTeam');
    localStorage.removeItem('rallies');
    localStorage.removeItem('teams');
    localStorage.removeItem('players');
    localStorage.removeItem('matches');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
