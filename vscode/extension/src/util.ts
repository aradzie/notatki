import { NoteParser } from "@notatki/core";
import vscode from "vscode";
import { allSearchPath, excludeSearchPath, modelExt, noteExt } from "./constants.js";

export async function revealRange(uri: vscode.Uri, column: vscode.ViewColumn, start: number, end: number) {
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, column);
  const range = new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end));
  editor.selection = new vscode.Selection(range.start, range.start);
  editor.revealRange(range);
}

export function replaceDocument(document: vscode.TextDocument, newText: string): vscode.TextEdit[] {
  const { length } = document.getText();
  const start = document.positionAt(0);
  const end = document.positionAt(length);
  const range = new vscode.Range(start, end);
  return [vscode.TextEdit.replace(range, newText)];
}

export function reportError(err: unknown) {
  console.error(err);
}

export async function parseNoteFiles(): Promise<NoteParser> {
  const parser = new NoteParser();
  const { notePaths, modelPaths } = await findNoteFiles();
  for (const path of modelPaths) {
    const data = await vscode.workspace.fs.readFile(path);
    const text = Buffer.from(data).toString("utf-8");
    parser.parseModels(path.fsPath, text);
  }
  for (const path of notePaths) {
    const data = await vscode.workspace.fs.readFile(path);
    const text = Buffer.from(data).toString("utf-8");
    parser.parseNotes(path.fsPath, text);
  }
  return parser;
}

export async function findNoteFiles(): Promise<{
  modelPaths: vscode.Uri[];
  notePaths: vscode.Uri[];
}> {
  const modelPaths: vscode.Uri[] = [];
  const notePaths: vscode.Uri[] = [];
  for (const uri of await vscode.workspace.findFiles(allSearchPath, excludeSearchPath)) {
    switch (true) {
      case uri.fsPath.endsWith(modelExt):
        modelPaths.push(uri);
        break;
      case uri.fsPath.endsWith(noteExt):
        notePaths.push(uri);
        break;
    }
  }
  modelPaths.sort(sortPaths);
  notePaths.sort(sortPaths);
  return { modelPaths, notePaths };
}

function sortPaths(a: vscode.Uri, b: vscode.Uri): number {
  if (a.fsPath > b.fsPath) {
    return +1;
  }
  if (a.fsPath < b.fsPath) {
    return -1;
  }
  return 0;
}
