import { describe, expect, it } from "vitest";
import { getNoteFileType, sanitizeNoteFileName } from "@/lib/notes/files";

describe("note file validation", () => {
  it("accepts PDF, DOC, and DOCX signatures only with matching extensions", () => {
    expect(
      getNoteFileType("notes.pdf", new TextEncoder().encode("%PDF-1.7")),
    ).toEqual({ extension: ".pdf", contentType: "application/pdf" });
    expect(
      getNoteFileType(
        "notes.doc",
        Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      )?.extension,
    ).toBe(".doc");
    expect(
      getNoteFileType(
        "notes.docx",
        Uint8Array.from([0x50, 0x4b, 0x03, 0x04]),
      )?.extension,
    ).toBe(".docx");
    expect(
      getNoteFileType("notes.pdf", new TextEncoder().encode("<html>")),
    ).toBeNull();
    expect(
      getNoteFileType("notes.docx", new TextEncoder().encode("%PDF-")),
    ).toBeNull();
  });

  it("strips path components and control characters from download names", () => {
    expect(sanitizeNoteFileName("../../notes\n.pdf")).toBe("notes_.pdf");
  });
});
