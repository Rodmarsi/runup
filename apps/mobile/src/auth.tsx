import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import type { AuthUser } from "@runup/api-client";
import { api } from "./api.js";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sessão persistida: tenta reidratar o usuário a partir do token guardado.
  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const result = await api.login(email, password);
        setUser(result.user);
      },
      register: async (name, email, password) => {
        const result = await api.register({ name, email, password, role: "student" });
        setUser(result.user);
      },
      loginWithGoogle: async () => {
        const redirectUrl = Linking.createURL("auth/callback");
        const { url } = await api.googleAuthorizeUrl("student", "mobile");
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
        if (result.type !== "success") return;
        // O callback devolve os tokens no fragmento (#access_token=...&refresh_token=...).
        const fragment = result.url.split("#")[1] ?? "";
        const pairs = Object.fromEntries(
          fragment.split("&").map((pair) => pair.split("=")),
        );
        const token = pairs.access_token;
        if (!token) throw new Error("Login com Google não retornou um token");
        await api.setSession(
          decodeURIComponent(token),
          pairs.refresh_token ? decodeURIComponent(pairs.refresh_token) : undefined,
        );
        setUser(await api.me());
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
