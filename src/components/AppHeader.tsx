import {
  Activity,
  AudioLines,
  Bell,
  Info,
  Languages,
  Shapes,
  SquareLibrary,
} from "lucide-react";
import React from "react";

import { UserNav } from "./side-nav-account";
import { Button } from "./ui/button";
import { AppLogo } from "./AppLogo";
import { useNavigate } from "react-router-dom";
import { useAuthContextProvider } from "../context/auth-context";

const NAV_ITEMS = [
  { title: "Upload", Icon: Activity, path: "/" },
  { title: "History", Icon: AudioLines, path: "/history" },
];

export const AppHeaderUI = ({ handleLogout }: { handleLogout: () => void }) => {
  const router = useNavigate();
  const { userInfo } = useAuthContextProvider();
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-6 pb-0">
        {/* Left side - Logo + Nav */}
        <div className="flex items-center gap-4">
          <div
            className="flex cursor-pointer pb-2.5"
            style={{ width: "auto", minWidth: 0, maxWidth: "48px" }}
          >
            <AppLogo />
          </div>

          <div className="mb-2.5 h-4 w-px bg-accent-foreground/10" />

          <nav className="relative flex w-full flex-1 flex-row items-center gap-2 p-0 pb-2.5">
            {/* Nav Tabs */}
            {NAV_ITEMS.map(({ title, Icon, path }, index) => (
              <button
                key={index}
                onClick={() => router(path)}
                className="z-10 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 border hover:bg-accent"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium whitespace-nowrap">
                  {title}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 pb-2.5">
          {/* <Button variant="outline" size="icon" className="rounded-lg">
            <Bell className="text-muted-foreground" />
          </Button>

          <Button variant="outline" className="gap-1 rounded-lg px-3">
            <Languages className="text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Dictionary
            </p>
          </Button>

          <div className="h-4 w-px bg-accent-foreground/10" />

          <Button variant="outline" size="icon" className="rounded-lg">
            <Info className="text-muted-foreground" />
          </Button> */}

          <UserNav handleLogout={handleLogout}>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-lg bg-blue-100 text-xs font-medium text-blue-600 hover:bg-blue-200"
            >
              {userInfo?.name ? userInfo.name.charAt(0)?.toUpperCase() : "U"}
            </Button>
          </UserNav>
        </div>
      </div>
    </>
  );
};
