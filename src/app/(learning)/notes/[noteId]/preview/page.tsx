import type { Metadata } from "next";
import { NotePdfPreview } from "@/components/note-pdf-preview";

export const metadata: Metadata = {
  title: "PDF preview | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default async function NotePdfPreviewPage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return <NotePdfPreview noteId={noteId} />;
}
