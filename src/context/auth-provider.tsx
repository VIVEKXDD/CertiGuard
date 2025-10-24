'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role, AuthenticateUserOutput } from '@/lib/types';
import { authenticateUser } from '@/ai/flows/authenticate-user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: Role) => Promise<AuthenticateUserOutput>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('certguard_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse user from sessionStorage', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, role: Role): Promise<AuthenticateUserOutput> => {
    const result = await authenticateUser({ email, password, role });

    if (result.success && result.user) {
      const userData = { email: result.user.email, role: result.user.role };
      sessionStorage.setItem('certguard_user', JSON.stringify(userData));
      setUser(userData);

      switch (role) {
        case 'Admin':
          router.push('/admin');
          break;
        case 'Institution':
          router.push('/institution');
          break;
        case 'Verifier':
          router.push('/verifier');
          break;
        default:
          router.push('/login');
      }
    }
    
    return result;
  };

  const logout = useCallback(() => {
    sessionStorage.removeItem('certguard_user');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
