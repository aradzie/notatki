import { generatePreview } from "@notatki/preview";
import vscode from "vscode";
import { Command } from "./command.js";
import { cmdExportPreview } from "./constants.js";
import { type ErrorChecker } from "./errors.js";
import { parseNoteFiles } from "./util.js";

export class ExportPreviewCommand extends Command {
  readonly #errors: ErrorChecker;
  readonly #log: vscode.LogOutputChannel;

  constructor(errors: ErrorChecker, log: vscode.LogOutputChannel) {
    super(cmdExportPreview);
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
        const out = vscode.Uri.joinPath(ws.uri, `notes.html`);
        const data = Buffer.from(generatePreview(notes));
        await vscode.workspace.fs.writeFile(out, data);
        vscode.window.showInformationMessage(`Exported ${notes.length} note preview(s) to "${out.fsPath}".`);
        this.#log.info(`Exported ${notes.length} note preview(s) to ${out.fsPath}`);
      } else {
        vscode.window.showWarningMessage(`No notes found in "${ws.uri.fsPath}".`);
        this.#log.warn(`No notes found in ${ws.uri.fsPath}`);
      }
    }
  }
}
