import { createRoot } from "react-dom/client";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./context/auth-context";
import { Routing } from "./routing/Routes";

createRoot(document.body).render(
  <>
    <AuthProvider>
      <Toaster />
      <Routing />
    </AuthProvider>
  </>
);
