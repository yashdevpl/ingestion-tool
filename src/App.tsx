import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FiltersProvider } from "./context/filters-context";
import { UploadStatusProvider } from "./context/upload-status-context";
import UploadRecordForm from "./components/upload-record-form";

createRoot(document.body).render(
  <StrictMode>
    <FiltersProvider>
      <UploadStatusProvider>
        <UploadRecordForm />
      </UploadStatusProvider>
    </FiltersProvider>
  </StrictMode>
);
