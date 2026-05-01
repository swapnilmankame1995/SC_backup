import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import { apiCall } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastRefreshAttempt = React.useRef<number>(0);

  useEffect(() => {
    checkSession();
    
    // Set up automatic token refresh every 45 minutes
    const refreshInterval = setInterval(async () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (token && refreshToken && user) {
        console.log('Auto-refreshing token to keep session alive...');
        try {
          await refreshAuthToken();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
          // Silently fail - user will need to log in again when they try to perform an action
        }
      }
    }, 45 * 60 * 1000); // 45 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user]);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      
      // Check if we have a token in localStorage
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        // Try to refresh user data with existing token
        // refreshUser will handle clearing invalid tokens
        await refreshUser();
      } else {
        // No token, user is logged out
        setUser(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuthToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        throw error || new Error('Failed to refresh session');
      }

      // Update tokens in localStorage
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);
      
      console.log('Token refreshed successfully');
      return true;
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      return false;
    }
  };

  const refreshUser = async () => {
    // Prevent rapid successive calls (max once per 2 seconds)
    const now = Date.now();
    if (now - lastRefreshAttempt.current < 2000) {
      console.log('Skipping refreshUser - called too recently');
      return;
    }
    lastRefreshAttempt.current = now;
    
    try {
      const result = await apiCall('/check-user', { method: 'POST' });
      setUser(result.user);
    } catch (error: any) {
      // Token might be expired - try to refresh it first
      console.log('Check-user failed, attempting token refresh...');
      const refreshed = await refreshAuthToken();
      
      if (refreshed) {
        // Try check-user again with new token
        try {
          const result = await apiCall('/check-user', { method: 'POST' });
          setUser(result.user);
          return;
        } catch (retryError) {
          console.log('Check-user failed after refresh');
        }
      }
      
      // If we get here, session is truly invalid
      console.log('Session expired or invalid, clearing token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    // Use server-side login endpoint
    const result = await apiCall('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false);

    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }
    
    if (result.session) {
      localStorage.setItem('access_token', result.session.access_token);
      localStorage.setItem('refresh_token', result.session.refresh_token);
      setUser(result.user);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const result = await apiCall('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }, false);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Now login
    await login(email, password);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('analytics_cache');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const verifyAuth = (): boolean => {
    const token = localStorage.getItem('access_token');
    if (!token || !user) {
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        checkSession,
        refreshUser,
        verifyAuth,
      }}
    >
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