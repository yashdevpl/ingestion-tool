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

// Check if we're running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

// Clear any existing authentication state
export function clearAuth() {
  const keycloak = getKeycloak();
  keycloak.clearToken();
  (keycloak as any).authenticated = false;
  (keycloak as any).token = undefined;
  (keycloak as any).refreshToken = undefined;
  (keycloak as any).idToken = undefined;
  initPromise = null;
  
  // Clear any stored tokens from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('kc-token');
    localStorage.removeItem('kc-refresh-token');
    localStorage.removeItem('kc-id-token');
    localStorage.removeItem('kc-authenticated');
    localStorage.removeItem('kc-callback-' + ENV.KC_REALM);
    localStorage.removeItem('kc-callback');
    localStorage.removeItem('auth-status');
    
    // Clear any other Keycloak related storage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('kc-')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Handle OAuth callback from custom protocol
const handleOAuthCallback = (url: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    console.log('Processing OAuth callback:', url);
    
    try {
      // Parse the callback URL
      const urlObj = new URL(url);
      
      // For authorization code flow, parameters come in query string, not hash
      const params = new URLSearchParams(urlObj.search); // Use search for query params
      
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');
      
      if (error) {
        console.error('OAuth error:', error);
        reject(new Error(`OAuth error: ${error}`));
        return;
      }
      
      if (!code) {
        console.error('No authorization code received');
        console.log('Available parameters:', Array.from(params.entries()));
        reject(new Error('No authorization code received'));
        return;
      }
      
      console.log('Authorization code received:', code);
      
      // Exchange the authorization code for tokens using Keycloak's token endpoint
      const tokenUrl = `${ENV.KC_URL}/realms/${ENV.KC_REALM}/protocol/openid-connect/token`;
      
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ENV.KC_CLIENT,
        code: code,
        redirect_uri: ENV.KC_REDIRECT_URL,
      });
      
      fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          console.error('Token exchange error:', data);
          reject(new Error(`Token exchange error: ${data.error}`));
          return;
        }
        
        console.log('Tokens received successfully');
        
        // Set the tokens in Keycloak instance
        const keycloak = getKeycloak();
        (keycloak as any).token = data.access_token;
        (keycloak as any).refreshToken = data.refresh_token;
        (keycloak as any).idToken = data.id_token;
        (keycloak as any).authenticated = true;
        
        // Parse the token to get user info
        try {
          (keycloak as any).tokenParsed = JSON.parse(atob(data.access_token.split('.')[1]));
        } catch (e) {
          console.warn('Could not parse token:', e);
        }
        
        // Persist tokens to localStorage for page reloads
        localStorage.setItem('kc-token', data.access_token);
        localStorage.setItem('kc-refresh-token', data.refresh_token);
        if (data.id_token) {
          localStorage.setItem('kc-id-token', data.id_token);
        }
        localStorage.setItem('kc-authenticated', 'true');
        
        // Set up token refresh
        if (data.expires_in) {
          (keycloak as any).tokenTimeoutHandle = setTimeout(() => {
            keycloak.updateToken(30);
          }, (data.expires_in - 30) * 1000);
        }
        
        console.log('Authentication completed successfully');
        
        // Trigger a storage event to notify other parts of the app
        console.log('Setting auth-status to authenticated in localStorage');
        localStorage.setItem('auth-status', 'authenticated');
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'auth-status',
          newValue: 'authenticated',
          storageArea: localStorage
        }));
        
        console.log('Dispatching auth-complete custom event');
        window.dispatchEvent(new CustomEvent('auth-complete'));
        
        resolve(true);
      })
      .catch(error => {
        console.error('Error exchanging code for tokens:', error);
        reject(error);
      });
      
    } catch (error) {
      console.error('Error parsing callback URL:', error);
      reject(error);
    }
  });
};

export async function initKeycloak(): Promise<boolean> {
  const keycloak = getKeycloak();

  if (initPromise) return initPromise;

  console.log('Initializing Keycloak authentication...');
  
  // First, check if we already have valid tokens
  if (isAuthenticated()) {
    console.log('Already authenticated with valid tokens');
    return Promise.resolve(true);
  }

  // Always clear auth state first to ensure fresh login (only if not authenticated)
  clearAuth();

  // Set up protocol callback handler for Electron
  if (isElectron()) {
    // Check for any pending OAuth callback first
    window.electronAPI.getPendingOAuthCallback().then(async (pendingUrl) => {
      if (pendingUrl) {
        console.log('Found pending OAuth callback:', pendingUrl);
        try {
          const authenticated = await handleOAuthCallback(pendingUrl);
          if (authenticated) {
            console.log('Pending OAuth callback processed successfully');
            window.dispatchEvent(new CustomEvent('auth-complete'));
          }
        } catch (error) {
          console.error('Failed to process pending OAuth callback:', error);
          window.dispatchEvent(new CustomEvent('auth-failed', { detail: error }));
        }
      }
    }).catch(error => {
      console.error('Failed to get pending OAuth callback:', error);
    });
    
    // Set up regular callback handler for future callbacks
    window.electronAPI.onOAuthCallback(async (url: string) => {
      try {
        const authenticated = await handleOAuthCallback(url);
        if (authenticated) {
          console.log('OAuth callback completed, triggering app refresh...');
          // Notify the app that authentication is complete
          window.dispatchEvent(new CustomEvent('auth-complete'));
        }
      } catch (error) {
        console.error('OAuth callback failed:', error);
        window.dispatchEvent(new CustomEvent('auth-failed', { detail: error }));
      }
    });
  }

  // For Electron, we don't use Keycloak's built-in initialization
  // Instead, we manually handle the login flow
  if (isElectron()) {
    initPromise = new Promise<boolean>((resolve) => {
      console.log('Electron detected - using custom OAuth flow');
      
      // Set up event listeners for auth completion
      const handleAuthComplete = () => {
        console.log('Auth complete event received');
        window.removeEventListener('auth-complete', handleAuthComplete);
        window.removeEventListener('auth-failed', handleAuthFailed);
        resolve(true);
      };
      
      const handleAuthFailed = (event: any) => {
        console.error('Auth failed event received:', event.detail);
        window.removeEventListener('auth-complete', handleAuthComplete);
        window.removeEventListener('auth-failed', handleAuthFailed);
        resolve(false);
      };
      
      window.addEventListener('auth-complete', handleAuthComplete);
      window.addEventListener('auth-failed', handleAuthFailed);
      
      // Start with unauthenticated state
      resolve(false);
    });
  } else {
    // For web browser, use standard Keycloak initialization
    initPromise = keycloak.init({
      onLoad: "login-required",
      redirectUri: ENV.KC_REDIRECT_URL,
    });
  }

  return initPromise;
}

// Function to trigger login
export async function login(): Promise<void> {
  if (isElectron()) {
    try {
      // Manually create the authorization URL since keycloak.createLoginUrl() 
      // requires the instance to be initialized first
      const state = generateRandomString(32);
      const nonce = generateRandomString(32);
      
      const authParams = new URLSearchParams({
        client_id: ENV.KC_CLIENT,
        redirect_uri: ENV.KC_REDIRECT_URL,
        response_type: 'code',
        scope: 'openid profile email',
        state: state,
        nonce: nonce,
      });
      
      const authUrl = `${ENV.KC_URL}/realms/${ENV.KC_REALM}/protocol/openid-connect/auth?${authParams.toString()}`;
      
      console.log('Navigating to auth URL in current window:', authUrl);
      
      // Load the authentication URL directly in the current window
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Error during authentication:', error);
      window.dispatchEvent(new CustomEvent('auth-failed', { detail: error }));
      throw error;
    }
  } else {
    // For web browser, use standard login
    const keycloak = getKeycloak();
    return keycloak.login({
      redirectUri: ENV.KC_REDIRECT_URL,
    });
  }
}

// Helper function to generate random string for OAuth state/nonce
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

// Function to restore authentication from localStorage
function restoreAuthFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('kc-token');
  const refreshToken = localStorage.getItem('kc-refresh-token');
  const idToken = localStorage.getItem('kc-id-token');
  const authenticated = localStorage.getItem('kc-authenticated');
  
  if (token && authenticated === 'true') {
    console.log('Restoring authentication from localStorage');
    const keycloak = getKeycloak();
    (keycloak as any).token = token;
    (keycloak as any).refreshToken = refreshToken;
    (keycloak as any).idToken = idToken;
    (keycloak as any).authenticated = true;
    
    // Parse the token to get user info
    try {
      (keycloak as any).tokenParsed = JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.warn('Could not parse stored token:', e);
      clearAuth();
      return false;
    }
    
    return true;
  }
  
  return false;
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const keycloak = getKeycloak();
  
  // First check current instance
  if ((keycloak as any).authenticated && (keycloak as any).token) {
    return true;
  }
  
  // If not authenticated, try to restore from localStorage
  return restoreAuthFromStorage();
}

// Get current user info
export function getUserInfo() {
  const keycloak = getKeycloak();
  return (keycloak as any).tokenParsed;
}

// Logout function
export async function logout(): Promise<void> {
  const keycloak = getKeycloak();
  clearAuth();
  
  if (isElectron()) {
    // For Electron, we might want to clear session and reload
    window.location.reload();
  } else {
    return keycloak.logout();
  }
}

// Clean up listeners when component unmounts
export function cleanupKeycloak() {
  if (isElectron()) {
    window.electronAPI.removeOAuthListener();
  }
  
  const keycloak = getKeycloak();
  if ((keycloak as any).tokenTimeoutHandle) {
    clearTimeout((keycloak as any).tokenTimeoutHandle);
  }
}