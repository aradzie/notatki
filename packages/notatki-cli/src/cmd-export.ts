import { readFile, writeFile } from "node:fs/promises";
import { exportAnki, exportCsv, exportJson, NoteParser } from "@notatki/core";
import { generatePreview } from "@notatki/preview";
import { findNoteFiles, withExt } from "./io.js";

export async function exportCmd({
  dir,
  out,
  preview,
  csv,
  json,
}: {
  dir: string;
  out: string;
  preview: boolean;
  csv: boolean;
  json: boolean;
}): Promise<void> {
  const parser = new NoteParser();
  console.log(`Scanning directory "${dir}"...`);
  const { notePaths, modelPaths } = await findNoteFiles(dir);
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
  const { notes } = parser;
  console.log(`Parsed ${notes.length} note(s).`);
  if (notes.length > 0) {
    if (!(csv || json)) {
      const path = withExt(out, ".apkg");
      await writeFile(path, await exportAnki(notes));
      console.log(`Exported notes to "${path}".`);
    }
    if (csv) {
      const path = withExt(out, ".csv");
      await writeFile(path, await exportCsv(notes));
      console.log(`Exported notes to "${path}" in CSV format.`);
    }
    if (json) {
      const path = withExt(out, ".json");
      await writeFile(path, await exportJson(notes));
      console.log(`Exported notes to "${path}" in JSON format.`);
    }
    if (preview) {
      const path = withExt(out, ".html");
      await writeFile(path, generatePreview(notes));
      console.log(`Generated HTML preview to "${path}".`);
    }
  } else {
    console.warn(`No notes found in "${dir}".`);
  }
}
