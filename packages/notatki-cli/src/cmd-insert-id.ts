import { readFile, writeFile } from "node:fs/promises";
import { insertNoteId, NoteParser, printNoteNodes } from "@notatki/core";
import { findNoteFiles } from "./io.ts";

export async function insertIdCmd({ dir }: { dir: string }): Promise<void> {
  console.log(`Scanning directory "${dir}"...`);
  const { notePaths } = await findNoteFiles(dir);
  for (const path of notePaths) {
    const parser = new NoteParser();
    console.log(`Parsing notes file "${path}"...`);
    const text = await readFile(path, "utf-8");
    const nodes = parser.parseNoteNodes(path, text);
    if (parser.errors.length > 0) {
      console.error(`Parse error.`);
    } else {
      if (insertNoteId(nodes)) {
        await writeFile(path, printNoteNodes(nodes));
      }
    }
  }
}
