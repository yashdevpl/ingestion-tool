import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  cleanupKeycloak,
  clearAuth,
  getUserInfo,
  initKeycloak,
  isAuthenticated,
  login,
  logout,
} from "./auth/keycloak";
import { AppHeaderUI } from "./components/AppHeader";
import LoginLoader from "./components/LoginLoader";
import { Button } from "./components/ui/button";
import { useAuthContextProvider } from "./context/auth-context";

type AuthState = "loading" | "unauthenticated" | "authenticated" | "error";

export default function Login() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [error, setError] = useState<string | null>(null);
  const { setUserInfo, userInfo } = useAuthContextProvider();
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        console.log("Starting authentication initialization...");
        setAuthState("loading");
        setError(null);

        // First, check if we're already authenticated (from localStorage)
        if (isAuthenticated()) {
          console.log("Found existing authentication tokens");
          setAuthState("authenticated");
          setUserInfo(getUserInfo());
          return;
        }

        // Initialize Keycloak
        const authenticated = await initKeycloak();

        if (!mounted) return;

        if (authenticated) {
          console.log("User is authenticated after init");
          setAuthState("authenticated");
          setUserInfo(getUserInfo());
        } else {
          console.log("User is not authenticated");
          setAuthState("unauthenticated");
        }
      } catch (err) {
        console.error("Authentication initialization failed:", err);
        if (mounted) {
          setAuthState("error");
          setError(
            err instanceof Error ? err.message : "Authentication failed"
          );
        }
      }
    };

    // Listen for auth completion events
    const handleAuthComplete = () => {
      console.log("Auth complete event received in Login component");
      console.log("Current authentication state:", isAuthenticated());
      console.log("Current user info:", getUserInfo());

      if (mounted && isAuthenticated()) {
        console.log("Setting auth state to authenticated");
        setAuthState("authenticated");
        setUserInfo(getUserInfo());
      } else {
        console.log(
          "Auth complete event received but user is not authenticated"
        );
      }
    };

    const handleAuthFailed = (event: any) => {
      console.error(
        "Auth failed event received in Login component:",
        event.detail
      );
      if (mounted) {
        setAuthState("error");
        setError(event.detail?.message || "Authentication failed");
      }
    };

    // Listen for storage changes (for when auth completes in same window)
    const handleStorageChange = (e: StorageEvent) => {
      console.log("Storage event received:", e.key, e.newValue);
      if (e.key === "auth-status" && e.newValue === "authenticated") {
        console.log("Auth status changed via storage event");
        console.log("Current authentication state:", isAuthenticated());

        if (mounted && isAuthenticated()) {
          console.log("Setting auth state to authenticated via storage event");
          setAuthState("authenticated");
          setUserInfo(getUserInfo());
        }
      }
    };

    window.addEventListener("auth-complete", handleAuthComplete);
    window.addEventListener("auth-failed", handleAuthFailed);
    window.addEventListener("storage", handleStorageChange);

    // Add beforeunload event to clear auth when window closes (fallback)
    const handleBeforeUnload = () => {
      console.log("Window unloading, clearing authentication...");
      clearAuth();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    initAuth();

    // Cleanup function
    return () => {
      mounted = false;
      window.removeEventListener("auth-complete", handleAuthComplete);
      window.removeEventListener("auth-failed", handleAuthFailed);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanupKeycloak();
    };
  }, []);

  const handleLogin = async () => {
    try {
      setAuthState("loading");
      setError(null);
      console.log("Triggering manual login...");
      await login();
      // The actual authentication will be handled by the callback
    } catch (err) {
      console.error("Login failed:", err);
      setAuthState("error");
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleRetry = () => {
    setAuthState("loading");
    setError(null);
    // Re-trigger initialization
    initKeycloak()
      .then((authenticated) => {
        if (authenticated) {
          setAuthState("authenticated");
          setUserInfo(getUserInfo());
        } else {
          setAuthState("unauthenticated");
        }
      })
      .catch((err) => {
        setAuthState("error");
        setError(err instanceof Error ? err.message : "Authentication failed");
      });
  };

  const handleLogout = async () => {
    try {
      setAuthState("loading");
      await logout();
      setAuthState("unauthenticated");
      setUserInfo(null);
    } catch (err) {
      console.error("Logout failed:", err);
      // Even if logout fails, clear the local state
      setAuthState("unauthenticated");
      setUserInfo(null);
    }
  };
  useEffect(() => {
    const token = localStorage.getItem("kc-token");
    console.log("Token in localStorage:", token);
  }, []);
  // Show loading state
  if (authState === "loading") {
    return <LoginLoader />;
  }

  // Show error state
  if (authState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Authentication Error
            </h3>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <Button
              onClick={handleRetry}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show login form
  if (authState === "unauthenticated" && !userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to VOX App
            </h2>
            <p className="text-gray-600 mb-6">Please sign in to continue</p>
            <Button
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
            >
              Sign In with Keycloak
            </Button>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-gray-600 text-sm">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Secured by Keycloak
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show authenticated app
  return (
    <div className="flex h-screen flex-col bg-gray-200 p-3 dark:bg-background">
      <div className="flex-1 overflow-auto rounded-xl bg-card">
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 w-full border-b">
            <AppHeaderUI handleLogout={handleLogout} />
          </div>
          {<Outlet />}
        </div>
      </div>
    </div>
  );
}

// import React from "react";
// import { UploadStreamingProvider } from "./context/upload-streaming";

// const Login = () => {
//   return (
//     <div>
//       {" "}
//       <UploadStreamingProvider>
//         <FiltersProvider>
//           <UploadStatusProvider>
//             <UploadRecordForm />
//           </UploadStatusProvider>
//         </FiltersProvider>
//       </UploadStreamingProvider>
//     </div>
//   );
// };

// export default Login;
