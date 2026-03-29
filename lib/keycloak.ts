"use client";

import Keycloak from "keycloak-js";

const hasBrowser = typeof window !== "undefined";

const hasKeycloakEnv =
  Boolean(process.env.NEXT_PUBLIC_KEYCLOAK_URL) &&
  Boolean(process.env.NEXT_PUBLIC_KEYCLOAK_REALM) &&
  Boolean(process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID);

let keycloakInstance: Keycloak | null = null;

export function isKeycloakConfigured() {
  return hasKeycloakEnv;
}

export function getKeycloakInstance() {
  if (!hasBrowser || !hasKeycloakEnv) {
    return null;
  }

  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
    });
  }

  return keycloakInstance;
}
