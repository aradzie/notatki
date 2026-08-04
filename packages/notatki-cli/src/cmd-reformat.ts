import { readFile, writeFile } from "node:fs/promises";
import { NoteParser, printModelNodes, printNoteNodes, reformatModelNodes, reformatNoteNodes } from "@notatki/core";
import { findNoteFiles } from "./io.ts";

export async function reformatCmd({ dir }: { dir: string }): Promise<void> {
  console.log(`Scanning directory "${dir}"...`);
  const { notePaths, modelPaths } = await findNoteFiles(dir);
  for (const path of modelPaths) {
    const parser = new NoteParser();
    console.log(`Parsing models file "${path}"...`);
    const text = await readFile(path, "utf-8");
    const nodes = parser.parseModelNodes(path, text);
    if (parser.errors.length > 0) {
      console.error(`Parse error.`);
    } else {
      await writeFile(path, printModelNodes(reformatModelNodes(nodes)));
    }
  }
  for (const path of notePaths) {
    const parser = new NoteParser();
    console.log(`Parsing notes file "${path}"...`);
    const text = await readFile(path, "utf-8");
    const nodes = parser.parseNoteNodes(path, text);
    if (parser.errors.length > 0) {
      console.error(`Parse error.`);
    } else {
      await writeFile(path, printNoteNodes(reformatNoteNodes(nodes)));
    }
  }
}
