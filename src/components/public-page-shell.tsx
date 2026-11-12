import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { PublicFooter } from "@/components/public-footer";

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="public-page-shell">
      <Navbar />
      {children}
      <PublicFooter />
    </main>
  );
}
