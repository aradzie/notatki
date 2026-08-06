import { generatePreview, ImageResolver } from "@notatki/preview";
import vscode from "vscode";
import { Command } from "./command.ts";
import { cmdExportPreview } from "./constants.ts";
import { type ErrorChecker } from "./errors.ts";
import { parseNoteFiles } from "./util.ts";

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
    const rootUri = ws.uri;
    const outUri = vscode.Uri.joinPath(rootUri, `notes.html`);
    const parser = await parseNoteFiles();
    parser.checkDuplicates();
    const { notes, errors } = parser;
    if (errors.length > 0) {
      this.#errors.showAllErrors(errors);
      vscode.window.showErrorMessage(`Error parsing notes in "${rootUri.fsPath}".`);
      this.#log.error(`Error parsing notes in ${rootUri.fsPath}`);
    } else {
      this.#errors.clearAllErrors();
      if (notes.length > 0) {
        const resolver = new ImageResolver("link", outUri.fsPath);
        const data = Buffer.from(generatePreview(notes, resolver));
        await vscode.workspace.fs.writeFile(outUri, data);
        vscode.window.showInformationMessage(`Exported ${notes.length} note preview(s) to "${outUri.fsPath}".`);
        this.#log.info(`Exported ${notes.length} note preview(s) to ${outUri.fsPath}`);
      } else {
        vscode.window.showWarningMessage(`No notes found in "${rootUri.fsPath}".`);
        this.#log.warn(`No notes found in ${rootUri.fsPath}`);
      }
    }
  }
}
