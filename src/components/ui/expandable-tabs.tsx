import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Tab {
  title: string;
  icon: LucideIcon;
  href: string;
}

interface ExpandableTabsProps {
  tabs: Tab[];
  className?: string;
  activeColor?: string;
  onChange?: (index: number | null) => void;
}

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-[#0abf53]",
  onChange,
}: ExpandableTabsProps) {
  const location = useLocation();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find the active tab based on current route
  const currentTabIndex = tabs.findIndex((tab) => {
    if (tab.href === "/") return location.pathname === "/";
    return location.pathname.startsWith(tab.href);
  });

  const handleClick = (index: number) => {
    // If already active, navigate
    if (activeIndex === index) {
      onChange?.(index);
      return;
    }

    // Expand tab
    setActiveIndex(index);

    // Auto-collapse after delay
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 3000);

    // Navigate immediately
    onChange?.(index);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex items-center justify-around rounded-2xl px-2 py-2",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = currentTabIndex === index;
        const isExpanded = activeIndex === index;

        return (
          <button
            key={tab.href}
            onClick={() => handleClick(index)}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
              isActive ? activeColor : "text-white/60",
              isExpanded && "bg-white/10"
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={1.8} />
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden whitespace-nowrap text-xs"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
            {isActive && !isExpanded && (
              <motion.div
                layoutId="activeIndicator"
                className={cn("absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full", activeColor.replace("text-", "bg-"))}
                transition={{ duration: 0.3 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
