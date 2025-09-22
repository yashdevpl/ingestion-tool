import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AudioLines,
  Bell,
  Info,
  Languages,
  Shapes,
  SquareLibrary,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { UserNav } from "./side-nav-account";
import { FileUploadStatus } from "./file-upload-status";

const COMPACT_WIDTH_THRESHOLD = 768;

const NAV_ITEMS = [
  { title: "Overview", href: "/", Icon: Activity },
  { title: "Insights", href: "/insights", Icon: AudioLines },
  { title: "Library", href: "/library", Icon: SquareLibrary },
  { title: "Search", href: "", Icon: Shapes },
];

export const AppHeader = () => {
  const [windowWidth, setWindowWidth] = useState<number>(
    Number.POSITIVE_INFINITY
  );
  const isCompactMode = windowWidth < COMPACT_WIDTH_THRESHOLD;

  const [open, setOpen] = useState(false);
  const handleDictionaryClick = () => setOpen(true);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverStyle, setHoverStyle] = useState({
    left: "0px",
    width: "0px",
    opacity: 0,
  });
  const [activeStyle, setActiveStyle] = useState({ left: "0px", width: "0px" });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, NAV_ITEMS.length);
  }, []);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        setHoverStyle({
          left: `${hoveredElement.offsetLeft}px`,
          width: `${hoveredElement.offsetWidth}px`,
          opacity: 1,
        });
      }
    } else {
      setHoverStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [hoveredIndex]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 p-3 px-6 pb-0">
        <div className="flex items-center gap-4">
          <div
            className="flex cursor-pointer pb-2.5"
            style={{ width: "auto", minWidth: 0, maxWidth: "48px" }}
            tabIndex={0}
            role="button"
          >
            {/* <SenseLogo className="h-3 w-auto max-w-full" /> */}
          </div>

          <div className="mb-2.5 h-4 w-px bg-accent-foreground/10" />

          <nav className="relative flex w-full flex-1 flex-row items-center gap-2 p-0 pb-2.5">
            {/* Hover Highlight */}
            <div
              className="pointer-events-none absolute flex h-9 items-center rounded-lg bg-accent transition-all duration-300 ease-out dark:bg-[#ffffff1a]"
              style={hoverStyle}
            />

            {/* Active Tab Highlight */}
            <div
              className="pointer-events-none absolute flex h-9 items-center rounded-lg bg-blue-50 transition-all duration-300 ease-out dark:bg-blue-300/20"
              style={activeStyle}
            />

            {/* Active Indicator */}
            <motion.div
              className="pointer-events-none absolute bottom-0 h-1 rounded-full bg-blue-400 transition-all duration-300 ease-out dark:bg-white"
              style={activeStyle}
              initial={false}
              animate={{
                left: activeStyle.left,
                width: activeStyle.width,
              }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            />

            {/* Tabs */}
            {NAV_ITEMS.map(({ title, href, Icon }, index) => {
              return (
                <button
                  key={index}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  className={cn(
                    "z-10 flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 transition-colors duration-300"
                  )}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  tabIndex={0}
                  aria-label={title}
                >
                  <Icon className={cn("size-4 shrink-0 transition-colors")} />
                  <AnimatePresence mode="wait">
                    {!isCompactMode && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs font-medium whitespace-nowrap"
                      >
                        {title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 pb-2.5">
          <FileUploadStatus />
          <Button variant="outline" size="icon" className="rounded-lg">
            <Bell className="text-muted-foreground" />
          </Button>

          <Button
            onClick={handleDictionaryClick}
            variant="outline"
            className="gap-1 rounded-lg px-3"
          >
            <Languages className="text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">
              Dictionary
            </p>
          </Button>
          <div className="h-4 w-px bg-accent-foreground/10" />
          <Button variant="outline" size="icon" className="rounded-lg">
            <Info className="text-muted-foreground" />
          </Button>
          <UserNav>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-lg bg-blue-100 text-xs font-medium text-blue-600 hover:bg-blue-200"
            >
              J
            </Button>
          </UserNav>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Global Dictionary</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
