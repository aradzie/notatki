import { exportAnki, exportCsv } from "@notatki/core";
import vscode from "vscode";
import { Command } from "./command.ts";
import { cmdExportCsv } from "./constants.ts";
import { type ErrorChecker } from "./errors.ts";
import { parseNoteFiles } from "./util.ts";

type Format = "apkg" | "csv";

export class ExportNotesCommand extends Command {
  readonly #format: Format;
  readonly #errors: ErrorChecker;
  readonly #log: vscode.LogOutputChannel;

  constructor(format: Format, errors: ErrorChecker, log: vscode.LogOutputChannel) {
    super(cmdExportCsv);
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
    const parser = await parseNoteFiles();
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
          case "apkg":
            out = vscode.Uri.joinPath(ws.uri, `notes.${exportAnki.ext}`);
            data = Buffer.from(await exportAnki(notes));
            break;
          case "csv":
            out = vscode.Uri.joinPath(ws.uri, `notes.${exportCsv.ext}`);
            data = Buffer.from(await exportCsv(notes));
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
