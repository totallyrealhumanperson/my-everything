
'use client';

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  // createUserWithEmailAndPassword, // Removed as signup is manual
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
// import type { AuthCredential } from 'firebase/auth'; // For type usage if needed later

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // signUpWithEmail: (email: string, pass: string) => Promise<User | null>; // Removed
  signInWithEmail: (email: string, pass: string) => Promise<User | null>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // const signUpWithEmail = async (email: string, pass: string): Promise<User | null> => {
  //   try {
  //     const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  //     return userCredential.user;
  //   } catch (error) {
  //     console.error("Error signing up:", error);
  //     throw error; // Re-throw to be caught by the calling component
  //   }
  // };

  const signInWithEmail = async (email: string, pass: string): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return userCredential.user;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, /*signUpWithEmail,*/ signInWithEmail, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
