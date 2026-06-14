import React, { useState } from 'react';
import type { User } from '../types';
import { db } from '../db/client';
import { users as usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthContext } from './AuthContext.context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email: string) => {
    setLoading(true);
    try {
      // Check if user exists
      const existingUsers = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
      
      let currentUser: User;
      
      if (existingUsers.length > 0) {
        currentUser = existingUsers[0] as User;
      } else {
        // Create new user
        currentUser = {
          id: uuidv4(),
          email: email.toLowerCase(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.insert(usersTable).values(currentUser);
      }
      
      setUser(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
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
