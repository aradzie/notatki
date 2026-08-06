import { writeFile } from "node:fs/promises";
import { exportAnki, exportCsv } from "@notatki/core";
import { withExt } from "./io.ts";
import { loadNotes } from "./notes.ts";

export async function exportCmd(
  paths: string[],
  { out, format }: { out: string; format: "apkg" | "csv" },
): Promise<void> {
  const notes = await loadNotes(paths);
  if (notes.length > 0) {
    switch (format) {
      case "apkg": {
        const path = withExt(out, `.${exportAnki.ext}`);
        await writeFile(path, await exportAnki(notes));
        console.log(`Exported notes to "${path}".`);
        break;
      }
      case "csv": {
        const path = withExt(out, `.${exportCsv.ext}`);
        await writeFile(path, await exportCsv(notes));
        console.log(`Exported notes to "${path}" in CSV format.`);
        break;
      }
    }
  } else {
    console.warn(`No notes found.`);
  }
}
