import type { ReactNode } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function ManageLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  await requireAdmin({ allowBeforeMfa: true });

  return children;
}
