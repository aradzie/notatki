import { writeFile } from "node:fs/promises";
import { generatePreview } from "@notatki/preview";
import { withExt } from "./io.ts";
import { loadNotes } from "./notes.ts";

export async function previewCmd(paths: string[], { out }: { out: string }): Promise<void> {
  const notes = await loadNotes(paths);
  if (notes.length > 0) {
    const path = withExt(out, ".html");
    await writeFile(path, generatePreview(notes));
    console.log(`Generated HTML preview to "${path}".`);
  } else {
    console.warn(`No notes found.`);
  }
}
