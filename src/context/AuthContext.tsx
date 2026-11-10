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
  createdAt?: string;
}

export interface StudentProfile {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender?: string;
  email: string;
  phone: string;
  monthlyFee: string;
  roomId?: number | null;
  status: string;
  admissionDate?: string;
  homeAddress?: string | null;
  room?: any;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: DbUser | null;
  studentProfile: StudentProfile | null;
  loading: boolean;
  token: string | null;
  isLoggedIn: boolean;
  googleAccessToken: string | null;
  login: (email: string, password: string) => Promise<any>;
  signup: (data: any) => Promise<any>;
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
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('sr_auth_token') || null;
  });
  const [dbUser, setDbUser] = useState<DbUser | null>(() => {
    const cached = localStorage.getItem('sr_auth_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('google_access_token') || null;
  });
  const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole>(() => {
    return (dbUser?.role as UserRole) || 'admin';
  });

  // Effective role: strictly enforce student role for student accounts, while allowing admin to test views
  const activeRole: UserRole = dbUser?.role === 'student' ? 'student' : (activeRoleOverride || dbUser?.role || 'admin');

  const isLoggedIn = Boolean(token && dbUser);

  const fetchProfile = async (sessionToken?: string | null, roleToFetch?: UserRole) => {
    const currentTok = sessionToken || token;
    if (!currentTok) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentTok}`,
          'x-active-role': roleToFetch || activeRole,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setDbUser(data.user);
        setStudentProfile(data.studentProfile || null);
        localStorage.setItem('sr_auth_user', JSON.stringify(data.user));
        if (data.user?.role) {
          setActiveRoleOverride(data.user.role);
        }
      } else if (res.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('sr_auth_token');
        localStorage.removeItem('sr_auth_user');
        setToken(null);
        setDbUser(null);
        setStudentProfile(null);
      }
    } catch (err) {
      console.error('Error fetching /api/auth/me:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check initial session
    if (token) {
      fetchProfile(token, activeRole);
    } else {
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        try {
          const idToken = await user.getIdToken();
          setToken(idToken);
          localStorage.setItem('sr_auth_token', idToken);
          await fetchProfile(idToken, activeRole);
        } catch (error) {
          console.error('Error getting Firebase token:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in. Please verify your email and password.');
    }

    setToken(data.token);
    setDbUser(data.user);
    setStudentProfile(data.studentProfile || null);
    setActiveRoleOverride(data.user.role);
    localStorage.setItem('sr_auth_token', data.token);
    localStorage.setItem('sr_auth_user', JSON.stringify(data.user));
    return data;
  };

  const signup = async (formData: any) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    setToken(data.token);
    setDbUser(data.user);
    setStudentProfile(data.studentProfile || null);
    setActiveRoleOverride('student');
    localStorage.setItem('sr_auth_token', data.token);
    localStorage.setItem('sr_auth_user', JSON.stringify(data.user));
    return data;
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (dbUser?.role === 'student') return; // Students cannot change role
    setActiveRoleOverride(newRole);
    fetchProfile(token, newRole);
  };

  const refreshUser = async () => {
    await fetchProfile(token, activeRole);
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
      if (firebaseUser) {
        await signOut(auth);
      }
    } catch (error) {
      console.warn('Firebase signout error:', error);
    } finally {
      setFirebaseUser(null);
      setToken(null);
      setDbUser(null);
      setStudentProfile(null);
      setGoogleAccessToken(null);
      localStorage.removeItem('sr_auth_token');
      localStorage.removeItem('sr_auth_user');
      localStorage.removeItem('google_access_token');
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
    const currentToken = token;

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

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Server error (${response.status}): ${text.slice(0, 120)}`);
      }
      return text;
    }

    if (!response.ok) {
      if (response.status === 401 && token) {
        // Sign out if session expired
        signOutUser();
      }
      throw new Error(data?.error || `Request failed with status ${response.status}`);
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
        isLoggedIn,
        googleAccessToken,
        login,
        signup,
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
