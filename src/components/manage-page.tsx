import type { ReactNode } from "react";

export function ManagePage({ children }: { children: ReactNode }) {
  return <main className="manage-main">{children}</main>;
}
