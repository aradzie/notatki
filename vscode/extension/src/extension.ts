import vscode from "vscode";
import { Completer, Completions } from "./completions.ts";
import { ErrorChecker } from "./errors.ts";
import { ExportNotesCommand } from "./export-notes.ts";
import { ExportPreviewCommand } from "./export-preview.ts";
import { ModelsFormatter, NotesFormatter } from "./format.ts";
import { ModelManager } from "./models.ts";
import { InsertIdCommand, insertIdOnSave } from "./note-id.ts";
import { PreviewManager } from "./preview.ts";

export async function activate(context: vscode.ExtensionContext) {
  const log = vscode.window.createOutputChannel("Anki Notes", { log: true });
  context.subscriptions.push(log);
  const models = new ModelManager(context, log);
  await models.reload();
  const errors = new ErrorChecker(context, models);
  new Completer(context, new Completions(models));
  new NotesFormatter(context);
  new ModelsFormatter(context);
  new PreviewManager(context, models);
  new ExportNotesCommand("csv", errors, log).attach(context);
  new ExportPreviewCommand(errors, log).attach(context);
  new InsertIdCommand().attach(context);
  context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(insertIdOnSave));
}

export async function deactivate() {}
