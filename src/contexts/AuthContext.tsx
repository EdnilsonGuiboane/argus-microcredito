import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { User, UserRole } from '@/models/types';
import { authService } from '@/services/auth/authService';
import { auditService } from '@/services/auditService';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  roles: UserRole[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canAccess: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    try {
      const result = await authService.getCurrentUserWithRoles();

      if (!result) {
        setUser(null);
        setRoles([]);
        return;
      }

      setUser(result.user);
      setRoles(result.roles);
    } catch (error) {
      console.error('Erro ao carregar utilizador autenticado:', error);
      setUser(null);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadCurrentUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadCurrentUser]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      const result = await authService.loginWithRoles(email, password);

      setUser(result.user);
      setRoles(result.roles);

      auditService.log(
        result.user.id,
        result.user.fullName,
        'LOGIN',
        'session',
        '',
        'Utilizador iniciou sessão'
      );

      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (user) {
        auditService.log(
          user.id,
          user.fullName,
          'LOGOUT',
          'session',
          '',
          'Utilizador terminou sessão'
        );
      }

      await authService.logout();

      setUser(null);
      setRoles([]);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }, [user]);

  const hasRole = useCallback(
    (inputRoles: UserRole | UserRole[]) => {
      const roleArray = Array.isArray(inputRoles) ? inputRoles : [inputRoles];
      return roleArray.some((role) => roles.includes(role));
    },
    [roles]
  );

  const canAccess = useCallback(
    (requiredRoles: UserRole[]) => {
      if (roles.includes('admin')) return true;
      return requiredRoles.some((role) => roles.includes(role));
    },
    [roles]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        canAccess,
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