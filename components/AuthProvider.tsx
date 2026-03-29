"use client";

import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { KeycloakProfile, KeycloakTokenParsed } from "keycloak-js";
import { getKeycloakInstance, isKeycloakConfigured } from "@/lib/keycloak";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type AuthState = {
  status: AuthStatus;
  profile: KeycloakProfile | null;
  tokenParsed: KeycloakTokenParsed | null;
  error: string;
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  configured: boolean;
};

const missingConfigMessage =
  "Defina NEXT_PUBLIC_KEYCLOAK_URL, NEXT_PUBLIC_KEYCLOAK_REALM e NEXT_PUBLIC_KEYCLOAK_CLIENT_ID para habilitar o login.";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const configured = isKeycloakConfigured();
  const [state, setState] = useState<AuthState>(() => ({
    status: "loading",
    profile: null,
    tokenParsed: null,
    error: "",
  }));

  useEffect(() => {
    if (!configured) {
      return;
    }

    let active = true;
    let refreshTimer: number | undefined;

    async function bootstrap() {
      const keycloak = getKeycloakInstance();
      if (!keycloak) {
        if (!active) return;

        setState({
          status: "error",
          profile: null,
          tokenParsed: null,
          error: "Nao foi possivel inicializar o cliente do Keycloak no navegador.",
        });
        return;
      }

      try {
        const authenticated = await keycloak.init({
          onLoad: "check-sso",
          pkceMethod: "S256",
          checkLoginIframe: false,
        });

        if (!active) return;

        if (!authenticated) {
          setState({
            status: "unauthenticated",
            profile: null,
            tokenParsed: null,
            error: "",
          });
          return;
        }

        const profile = await keycloak.loadUserProfile().catch(() => null);
        const tokenParsed = (keycloak.tokenParsed ?? null) as KeycloakTokenParsed | null;

        setState({
          status: "authenticated",
          profile,
          tokenParsed,
          error: "",
        });

        refreshTimer = window.setInterval(() => {
          keycloak.updateToken(30).catch(async () => {
            await keycloak.logout({ redirectUri: window.location.origin });
          });
        }, 60_000);
      } catch (error) {
        if (!active) return;

        const message = error instanceof Error ? error.message : "Falha ao autenticar com o Keycloak.";
        setState({
          status: "error",
          profile: null,
          tokenParsed: null,
          error: message,
        });
      }
    }

    void bootstrap();

    return () => {
      active = false;
      if (refreshTimer) {
        window.clearInterval(refreshTimer);
      }
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...(configured
        ? state
        : {
            status: "error" as const,
            profile: null,
            tokenParsed: null,
            error: missingConfigMessage,
          }),
      configured,
      isAuthenticated: configured && state.status === "authenticated",
      login: async () => {
        const keycloak = getKeycloakInstance();
        if (!keycloak) {
          throw new Error(missingConfigMessage);
        }

        await keycloak.login({ redirectUri: window.location.origin });
      },
      logout: async () => {
        const keycloak = getKeycloakInstance();
        if (!keycloak) {
          return;
        }

        await keycloak.logout({ redirectUri: window.location.origin });
      },
      getAccessToken: async () => {
        const keycloak = getKeycloakInstance();
        if (!keycloak) {
          throw new Error(missingConfigMessage);
        }

        if (!keycloak.authenticated) {
          throw new Error("Sessao do Keycloak nao esta autenticada.");
        }

        await keycloak.updateToken(30);

        if (!keycloak.token) {
          throw new Error("Token de acesso nao disponivel.");
        }

        return keycloak.token;
      },
    }),
    [configured, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}
