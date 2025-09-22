import Keycloak from "keycloak-js";

let keycloakInstance: Keycloak.KeycloakInstance | null = null;
let initPromise: Promise<boolean> | null = null;

export function getKeycloak() {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: "https://login-d.pi-labs.ai/auth",
      realm: "im-platform",
      clientId: "wms-application-dev",
    });
  }
  return keycloakInstance;
}

export function initKeycloak() {
  const keycloak = getKeycloak();

  // Return existing promise if already initializing
  if (initPromise) {
    return initPromise;
  }

  // Return resolved promise if already initialized
  if (keycloak.authenticated !== undefined) {
    return Promise.resolve(keycloak.authenticated);
  }

  // Initialize and store the promise
  initPromise = keycloak.init({
    onLoad: "login-required",
    redirectUri: "http://localhost:3000", // dev
  });

  return initPromise;
}
