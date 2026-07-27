import React, { useState } from 'react';
import type { User } from '../types';
import { AuthContext } from './AuthContext.context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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
