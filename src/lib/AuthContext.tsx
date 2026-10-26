import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, type User } from "./api";

interface AuthContextValue { user: User | null; loading: boolean; signIn(email: string, password: string): Promise<User>; signUp(email: string, name: string, password: string): Promise<User>; signOut(): Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.me().then((current) => { if (active) setUser(current); }).catch((error) => {
      if (active && !(error instanceof ApiError && error.status === 401)) console.error(error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const signIn = useCallback(async (email: string, password: string) => { const next = await api.login(email, password); setUser(next); return next; }, []);
  const signUp = useCallback(async (email: string, name: string, password: string) => { const next = await api.register(email, name, password); setUser(next); return next; }, []);
  const signOut = useCallback(async () => { try { await api.logout(); } finally { setUser(null); } }, []);
  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
