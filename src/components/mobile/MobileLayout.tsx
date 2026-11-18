import React from "react";
import { MobileTabBar } from "./MobileTabBar";

interface MobileLayoutProps {
  children: React.ReactNode;
  hideTabBar?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, hideTabBar }) => {
  return (
    <div className="mobile-layout min-h-[100dvh] bg-background flex flex-col pt-[env(safe-area-inset-top)]">
      <div className={`mobile-layout__content min-w-0 flex-1 overflow-x-clip ${hideTabBar ? "pb-[env(safe-area-inset-bottom)]" : "pb-[calc(88px+env(safe-area-inset-bottom))]"}`}>
        {children}
      </div>
      {!hideTabBar && <MobileTabBar />}
    </div>
  );
};
