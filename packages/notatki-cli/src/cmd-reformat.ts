import { readFile, writeFile } from "node:fs/promises";
import { NoteParser, printModelNodes, printNoteNodes, reformatModelNodes, reformatNoteNodes } from "@notatki/core";
import { FileFinder } from "./io.ts";

export async function reformatCmd(paths: string[]): Promise<void> {
  const { notePaths, modelPaths } = await new FileFinder().find(paths);
  for (const path of modelPaths) {
    const parser = new NoteParser();
    console.log(`Parsing models file "${path}"...`);
    const text = await readFile(path, "utf8");
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
    const text = await readFile(path, "utf8");
    const nodes = parser.parseNoteNodes(path, text);
    if (parser.errors.length > 0) {
      console.error(`Parse error.`);
    } else {
      await writeFile(path, printNoteNodes(reformatNoteNodes(nodes)));
    }
  }
}
