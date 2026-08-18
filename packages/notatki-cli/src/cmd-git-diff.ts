import { readFile } from "node:fs/promises";
import { styleText } from "node:util";
import { type DiffNote, diffNoteFiles, type NoteFileDiff, NoteParser } from "@notatki/core";
import type { NoteNode } from "@notatki/parser";

export async function gitDiffCmd(
  path: string,
  oldFile: string,
  _oldHex: string,
  _oldMode: string,
  newFile: string,
  _newHex: string,
  _newMode: string,
): Promise<void> {
  const oldNodes = await parseSide(path, oldFile);
  const newNodes = await parseSide(path, newFile);
  printDiff(path, diffNoteFiles(oldNodes, newNodes));
}

async function parseSide(path: string, file: string): Promise<NoteNode[]> {
  if (file === "/dev/null") {
    return [];
  }
  const parser = new NoteParser();
  const text = await readFile(file, "utf8");
  const nodes = parser.parseNoteNodes(path, text);
  parser.checkErrors();
  return nodes;
}

function printDiff(path: string, diff: NoteFileDiff): void {
  console.log(styleText("bold", path));
  printSection("Added", "green", diff.added.map(formatEntry));
  printSection("Removed", "red", diff.removed.map(formatEntry));
  printSection(
    "Changed",
    "yellow",
    diff.changed.map((note) => `${note.id} "${note.preview}" [${note.changes.join(", ")}]`),
  );
}

function printSection(title: string, color: Parameters<typeof styleText>[0], lines: string[]): void {
  console.log(styleText(color, `  ${title} (${lines.length})`));
  for (const line of lines) {
    console.log(styleText(color, `    ${line}`));
  }
}

function formatEntry(note: DiffNote): string {
  return note.hasId ? `${note.id} "${note.preview}"` : `"${note.preview}"`;
}
