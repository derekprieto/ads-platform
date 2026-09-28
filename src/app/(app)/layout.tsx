import type { ReactNode } from "react";
import { AppProvider } from "@/components/AppProvider";
import { Header } from "@/components/Header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="relative box-border flex h-dvh min-h-[560px] flex-col overflow-hidden bg-white text-fg">
        <Header />
        {children}
      </div>
    </AppProvider>
  );
}
