/**
 * Контекст аутентификации: пользователь, вход/выход, восстановление сессии, права.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiLogin,
  apiLogout,
  apiRefresh,
  type AuthUser,
  type Role,
} from "@/lib/auth";
import { clearAccessToken } from "@/lib/auth-storage";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (required: Role) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Порядок ролей (больше = больше прав). */
const ROLE_LEVEL: Record<Role, number> = {
  super_admin: 3,
  manager: 2,
  viewer: 1,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Восстановление сессии при первом рендере через refresh-токен
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRefresh();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) clearAccessToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (required: Role) => {
      if (!user) return false;
      const level = ROLE_LEVEL[user.role] ?? 0;
      return level >= (ROLE_LEVEL[required] ?? 0);
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      hasRole,
      isSuperAdmin: user?.role === "super_admin",
    }),
    [user, loading, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Хук доступа к контексту аутентификации. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
