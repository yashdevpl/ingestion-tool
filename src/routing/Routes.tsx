import { HashRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";
import FileUploadsTable from "../pages/upload-files";
import UploadHistory from "../pages/upload-history";
import UploadRecords from "../pages/upload-records";

export const Routing = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />}>
          <Route index element={<UploadRecords />} /> {/* default child */}
          <Route path="/history" element={<UploadHistory />} />
          <Route
            path="/file-uploads/:contextId"
            element={<FileUploadsTable />}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
};
