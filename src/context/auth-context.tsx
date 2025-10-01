import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { IUserDetails } from "../types/auth";

type AuthContextProps = {
  setUserInfo: (userInfo: IUserDetails | null) => void;
  userInfo: IUserDetails | null;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userInfo, setUserInfo] = useState<IUserDetails | null>(null);

  return (
    <AuthContext.Provider
      value={{
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
