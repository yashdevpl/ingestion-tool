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
import type { ReactNode } from "react";

export function UserNav({ children }: { children?: ReactNode }) {
  // const router = useRouter();

  if (!children) {
    children = (
      <div className="relative size-8 rounded-full">
        <Avatar className="size-8">
          {/* <AvatarImage src={session?.user?.avatar} alt={session?.user?.name} /> */}
          <AvatarFallback
            className="text-[#1D4ED8] uppercase"
            style={{ background: "#DBEAFE" }}
          >
            J
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
              <p className="text-sm leading-none font-medium">Jane Doe</p>
              <p className="text-xs leading-none text-muted-foreground">
                jane.doe@example.com
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Setting</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
