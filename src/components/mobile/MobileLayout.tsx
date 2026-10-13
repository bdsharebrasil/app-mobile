import React from "react";
import { MobileTabBar } from "./MobileTabBar";

interface MobileLayoutProps {
  children: React.ReactNode;
  hideTabBar?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, hideTabBar }) => {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pt-[env(safe-area-inset-top)]">
      <div className="flex-1 overflow-y-auto pb-24">
        {children}
      </div>
      {!hideTabBar && <MobileTabBar />}
    </div>
  );
};
