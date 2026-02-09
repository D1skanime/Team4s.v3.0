'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, RegisterData, LoginData } from '@/types';
import {
  authClient,
  AuthError,
} from '@/lib/auth';
import {
  syncLocalWatchlistToBackend,
  clearSyncFlag,
} from '@/lib/watchlist';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!authClient.isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authClient.getMe();
        setUser(userData);
      } catch {
        // Token invalid or expired
        authClient.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (data: LoginData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.login(data);
      setUser(response.user);

      // Sync localStorage watchlist to backend after successful login
      // This runs in background, no need to await
      syncLocalWatchlistToBackend().catch((err) => {
        console.error('Watchlist sync failed:', err);
      });
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Login fehlgeschlagen';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authClient.register(data);
      setUser(response.user);
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Registrierung fehlgeschlagen';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authClient.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
      // Clear sync flag so next login will sync again
      clearSyncFlag();
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!authClient.isAuthenticated()) {
      return;
    }

    try {
      const userData = await authClient.getMe();
      setUser(userData);
    } catch {
      // Token invalid or expired
      authClient.clearTokens();
      setUser(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export for convenience
export { AuthContext };
