import type { NoteList } from "../note.js";

export async function exportAnki(col: NoteList): Promise<Buffer> {
  return Buffer.of();
}

exportAnki.ext = "apkg";
