export const MAX_NOTE_FILE_BYTES = 20 * 1024 * 1024;

export type NoteFileType = {
  extension: ".pdf" | ".doc" | ".docx";
  contentType: string;
};

const fileTypes: Record<string, NoteFileType> = {
  ".pdf": { extension: ".pdf", contentType: "application/pdf" },
  ".doc": { extension: ".doc", contentType: "application/msword" },
  ".docx": {
    extension: ".docx",
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
};

export function getNoteFileType(
  fileName: string,
  bytes: Uint8Array,
): NoteFileType | null {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  const fileType = fileTypes[extension];
  if (!fileType) {
    return null;
  }

  const isPdf =
    extension === ".pdf" &&
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  const isDoc =
    extension === ".doc" &&
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1;
  const isDocx =
    extension === ".docx" &&
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  return isPdf || isDoc || isDocx ? fileType : null;
}

export function sanitizeNoteFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? "note";
  const sanitized = baseName
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .trim()
    .slice(0, 120);
  return sanitized || "note";
}
