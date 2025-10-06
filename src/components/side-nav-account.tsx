import { ReactNode, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuthContextProvider } from "../context/auth-context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ServerUrlForm } from "../pages/settings-form";

export function UserNav({
  children,
  handleLogout,
}: {
  children?: ReactNode;
  handleLogout: () => void;
}) {
  const router = useNavigate();
  const { userInfo } = useAuthContextProvider();
  const [open, setOpen] = useState(false);

  if (!children) {
    children = (
      <div className="relative size-8 rounded-full">
        <Avatar className="size-8">
          <AvatarFallback
            className="text-[#1D4ED8] uppercase"
            style={{ background: "#DBEAFE" }}
          >
            {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : "U"}
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
              <p className="text-sm leading-none font-medium">
                {userInfo?.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {userInfo?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog for Server URL Form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Server Configuration</DialogTitle>
          </DialogHeader>
          <ServerUrlForm onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
