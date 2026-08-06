import { readFile } from "node:fs/promises";
import { type NoteList, NoteParser } from "@notatki/core";
import { FileFinder } from "./io.ts";

export async function loadNotes(paths: string[]): Promise<NoteList> {
  const parser = new NoteParser();
  const { notePaths, modelPaths } = await new FileFinder().find(paths);
  for (const path of modelPaths) {
    console.log(`Parsing models file "${path}"...`);
    const text = await readFile(path, "utf-8");
    parser.parseModels(path, text);
  }
  for (const path of notePaths) {
    console.log(`Parsing notes file "${path}"...`);
    const text = await readFile(path, "utf-8");
    parser.parseNotes(path, text);
  }
  parser.checkDuplicates();
  parser.checkErrors();
  console.log(`Parsed ${parser.notes.length} note(s).`);
  return parser.notes;
}
