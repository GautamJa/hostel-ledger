import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export type UserRole = 'admin' | 'warden' | 'accountant' | 'student';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StudentProfile {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  monthlyFee: string;
  roomId?: number | null;
  status: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: DbUser | null;
  studentProfile: StudentProfile | null;
  loading: boolean;
  token: string | null;
  googleAccessToken: string | null;
  signInWithGoogle: () => Promise<string | null>;
  signOutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  sendGmailMessage: (to: string, subject: string, bodyText: string) => Promise<boolean>;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('google_access_token') || null;
  });
  const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole>('admin');

  const activeRole: UserRole = activeRoleOverride;

  const fetchProfile = async (idToken?: string | null, roleToFetch?: UserRole) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${idToken || 'demo-token'}`,
          'x-active-role': roleToFetch || activeRole,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data.user);
        setStudentProfile(data.studentProfile || null);
      }
    } catch (err) {
      console.error('Error fetching /api/auth/me:', err);
    }
  };

  useEffect(() => {
    // Initial profile fetch immediately
    fetchProfile(token, activeRole);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        try {
          const idToken = await user.getIdToken();
          setToken(idToken);
          await fetchProfile(idToken, activeRole);
        } catch (error) {
          console.error('Error getting token:', error);
        }
      } else {
        setFirebaseUser(null);
        setToken(null);
        setGoogleAccessToken(null);
        localStorage.removeItem('google_access_token');
        await fetchProfile('demo-token', activeRole);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setActiveRoleOverride(newRole);
    fetchProfile(token, newRole);
  };

  const refreshUser = async () => {
    let currentToken = token;
    if (firebaseUser) {
      currentToken = await firebaseUser.getIdToken(true);
      setToken(currentToken);
    }
    await fetchProfile(currentToken, activeRole);
  };

  const signInWithGoogle = async (): Promise<string | null> => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        localStorage.setItem('google_access_token', credential.accessToken);
        return credential.accessToken;
      }
      return null;
    } catch (error: any) {
      console.error('Sign-in error:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setToken(null);
      setGoogleAccessToken(null);
      localStorage.removeItem('google_access_token');
      await fetchProfile('demo-token', activeRole);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const sendGmailMessage = async (to: string, subject: string, bodyText: string): Promise<boolean> => {
    if (!googleAccessToken) {
      throw new Error('Please sign in with Google to send emails directly via Gmail API.');
    }
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      bodyText,
    ];
    const message = messageParts.join('\r\n');
    const raw = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || 'Failed to dispatch email via Gmail API');
    }
    return true;
  };

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    let currentToken = token;
    if (firebaseUser) {
      try {
        currentToken = await firebaseUser.getIdToken();
        setToken(currentToken);
      } catch (e) {
        console.warn('Could not refresh Firebase token, using fallback:', e);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken || 'demo-token'}`,
      'x-active-role': activeRole,
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(path, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        studentProfile,
        loading,
        token,
        googleAccessToken,
        signInWithGoogle,
        signOutUser,
        refreshUser,
        apiFetch,
        sendGmailMessage,
        activeRole,
        setActiveRole: handleRoleChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
