import { exportAnki, exportCsv, exportJson, NoteParser } from "@notatki/core";
import vscode from "vscode";
import { Command } from "./command.js";
import { allSearchPath, cmdExportNotes, excludeSearchPath, modelExt, noteExt } from "./constants.js";
import { type ErrorChecker } from "./errors.js";

type Format = "anki" | "csv" | "json";

export class ExportCommand extends Command {
  readonly #format: Format;
  readonly #errors: ErrorChecker;
  readonly #log: vscode.LogOutputChannel;

  constructor(format: Format, errors: ErrorChecker, log: vscode.LogOutputChannel) {
    super(cmdExportNotes);
    this.#format = format;
    this.#errors = errors;
    this.#log = log;
  }

  override async execute() {
    this.#log.show(true);
    const [ws = null] = vscode.workspace.workspaceFolders ?? [];
    if (ws != null) {
      await this.#executeInWorkspace(ws);
    } else {
      vscode.window.showErrorMessage("No workspace folder found.");
      this.#log.error("No workspace folder found.");
    }
  }

  async #executeInWorkspace(ws: vscode.WorkspaceFolder) {
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
    parser.checkDuplicates();
    const { notes, errors } = parser;
    if (errors.length > 0) {
      this.#errors.showAllErrors(errors);
      vscode.window.showErrorMessage(`Error parsing notes in "${ws.uri.fsPath}".`);
      this.#log.error(`Error parsing notes in ${ws.uri.fsPath}`);
    } else {
      this.#errors.clearAllErrors();
      if (notes.length > 0) {
        let out: vscode.Uri;
        let data: Buffer;
        switch (this.#format) {
          case "anki":
            out = vscode.Uri.joinPath(ws.uri, "notes.apkg");
            data = Buffer.from(await exportAnki(notes));
            break;
          case "csv":
            out = vscode.Uri.joinPath(ws.uri, "notes.csv");
            data = Buffer.from(await exportCsv(notes));
            break;
          case "json":
            out = vscode.Uri.joinPath(ws.uri, "notes.json");
            data = Buffer.from(await exportJson(notes));
            break;
        }
        await vscode.workspace.fs.writeFile(out, data);
        vscode.window.showInformationMessage(`Exported ${notes.length} note(s) to "${out.fsPath}".`);
        this.#log.info(`Exported ${notes.length} note(s) to ${out.fsPath}`);
      } else {
        vscode.window.showWarningMessage(`No notes found in "${ws.uri.fsPath}".`);
        this.#log.warn(`No notes found in ${ws.uri.fsPath}`);
      }
    }
  }
}

async function findNoteFiles() {
  const notePaths: vscode.Uri[] = [];
  const modelPaths: vscode.Uri[] = [];
  for (const uri of await vscode.workspace.findFiles(allSearchPath, excludeSearchPath)) {
    switch (true) {
      case uri.fsPath.endsWith(noteExt):
        notePaths.push(uri);
        break;
      case uri.fsPath.endsWith(modelExt):
        modelPaths.push(uri);
        break;
    }
  }
  notePaths.sort(sortPaths);
  modelPaths.sort(sortPaths);
  return { notePaths, modelPaths };
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
