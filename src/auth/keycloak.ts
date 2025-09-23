import Keycloak from "keycloak-js";
import { ENV } from "../utils/constants";

let keycloakInstance: Keycloak | null = null;
let initPromise: Promise<boolean> | null = null;

export function getKeycloak() {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: ENV.KC_URL,
      realm: ENV.KC_REALM,
      clientId: ENV.KC_CLIENT,
    });
  }
  return keycloakInstance;
}

export function initKeycloak() {
  const keycloak = getKeycloak();

  if (initPromise) return initPromise;
  if (keycloak.authenticated !== undefined) {
    return Promise.resolve(keycloak.authenticated);
  }

  initPromise = keycloak.init({
    onLoad: "login-required",
    redirectUri: ENV.KC_REDIRECT_URL,
  });

  return initPromise;
}
