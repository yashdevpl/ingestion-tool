import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { IUserDetails } from "../types/auth";
import { ENV } from "../utils/constants";

type AuthContextProps = {
  setUserInfo: (userInfo: IUserDetails | null) => void;
  setWebProxyUrl: Dispatch<SetStateAction<string>>;
  userInfo: IUserDetails | null;
  webProxyUrl: string;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userInfo, setUserInfo] = useState<IUserDetails | null>(null);
  const [webProxyUrl, setWebProxyUrl] = useState(ENV.WEB_APP_PROXY_URL);
  useEffect(() => {
    const fetchWebProxyUrl = async () => {
      const url = await window.electronAPI.get("server-url");
      setWebProxyUrl(url || ENV.WEB_APP_PROXY_URL);
    };
    fetchWebProxyUrl();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        setWebProxyUrl,
        webProxyUrl,
        setUserInfo,
        userInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContextProvider = () => {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContextProvider must be used within AuthProvider");
  return ctx;
};
