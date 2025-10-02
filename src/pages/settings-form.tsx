import { useFormik } from "formik";
import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuthContextProvider } from "../context/auth-context";

const validationSchema = Yup.object({
  serverUrl: Yup.string().required("Server URL is required"),
});

export const ServerUrlForm: React.FC<{ onClose?: () => void }> = ({
  onClose,
}) => {
  const [initialUrl, setInitialUrl] = useState("");
  const { setWebProxyUrl, webProxyUrl } = useAuthContextProvider();

  useEffect(() => {
    window.electronAPI.get("server-url").then((url: string) => {
      setInitialUrl(url || "");
    });
  }, []);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { serverUrl: webProxyUrl },
    validationSchema,
    onSubmit: (values) => {
      window.electronAPI.set("server-url", values.serverUrl);
      setWebProxyUrl(values.serverUrl);
      alert("Server URL saved successfully!");
      if (onClose) onClose();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="serverUrl">Server URL</Label>
        <Input
          id="serverUrl"
          name="serverUrl"
          type="url"
          placeholder="https://example.com"
          value={formik.values.serverUrl}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={
            formik.touched.serverUrl && formik.errors.serverUrl
              ? "border-red-500"
              : ""
          }
        />
        {formik.touched.serverUrl && formik.errors.serverUrl && (
          <p className="text-sm text-red-500 mt-1">{formik.errors.serverUrl}</p>
        )}
      </div>
      <Button type="submit" className="w-full">
        Save
      </Button>
    </form>
  );
};
