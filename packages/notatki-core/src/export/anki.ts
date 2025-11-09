import type { NoteList } from "../note.js";

export type ExportAnkiOptions = {
  signal?: AbortSignal;
};

export async function exportAnki(
  col: NoteList,
  { signal = new AbortController().signal }: Readonly<ExportAnkiOptions> = {},
): Promise<Buffer> {
  if (signal.aborted) {
    throw new Error("Aborted");
  }
  return Buffer.of();
}
