import { StrictMode, useEffect, useState } from "react";
import { getKeycloak, initKeycloak } from "./auth/keycloak";
import LoginLoader from "./components/LoginLoader";
import { FiltersProvider } from "./context/filters-context";
import { UploadStatusProvider } from "./context/upload-status-context";
import UploadRecordForm from "./components/upload-record-form";

export default function Login() {
  const [authenticated, setAuthenticated] = useState(false);
  const keycloak = getKeycloak(); // always same instance

  useEffect(() => {
    initKeycloak()
      .then((auth) => {
        setAuthenticated(auth);
        if (auth) {
          console.log("Token:", keycloak.token);

          // Refresh token before it expires
          const interval = setInterval(() => {
            keycloak.updateToken(30).then((refreshed) => {
              if (refreshed) console.log("Token refreshed", keycloak.token);
            });
          }, 10000);

          return () => clearInterval(interval); // cleanup on unmount
        }
      })
      .catch(console.error);
  }, [keycloak]);

  return (
    <div>
      {authenticated ? (
        <p>
          <StrictMode>
            <FiltersProvider>
              <UploadStatusProvider>
                <UploadRecordForm />
              </UploadStatusProvider>
            </FiltersProvider>
          </StrictMode>
        </p>
      ) : (
        <LoginLoader />
      )}
    </div>
  );
}
