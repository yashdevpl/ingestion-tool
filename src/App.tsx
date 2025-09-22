import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FiltersProvider } from "./context/filters-context";
import { UploadStatusProvider } from "./context/upload-status-context";
import Login from "./Login";

createRoot(document.body).render(
  <StrictMode>
    <FiltersProvider>
      <UploadStatusProvider>
        <Login />
      </UploadStatusProvider>
    </FiltersProvider>
  </StrictMode>
);
