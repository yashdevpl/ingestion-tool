import { ReactNode } from "react";

import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuthContextProvider } from "../context/auth-context";

export function UserNav({ children, handleLogout }: { children?: ReactNode, handleLogout: () => void }) {
  const router = useNavigate();
  const { userInfo } = useAuthContextProvider();

  if (!children) {
    children = (
      <div className="relative size-8 rounded-full">
        <Avatar className="size-8">
          {/* <AvatarImage src={session?.user?.avatar} alt={session?.user?.name} /> */}
          <AvatarFallback
            className="text-[#1D4ED8] uppercase"
            style={{ background: "#DBEAFE" }}
          >
            {userInfo?.name ? userInfo.name.charAt(0)?.toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">{userInfo?.name}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {userInfo?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {/* <DropdownMenuItem onClick={() => router("/settings")}>
              Setting
            </DropdownMenuItem> */}
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
