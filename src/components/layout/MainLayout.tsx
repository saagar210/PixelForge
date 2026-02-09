import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  onOpenFile: () => void;
  children: ReactNode;
}

export function MainLayout({ onOpenFile, children }: MainLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <Header onOpenFile={onOpenFile} />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 relative overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
