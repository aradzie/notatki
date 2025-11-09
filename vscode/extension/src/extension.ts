import vscode from "vscode";
import { Completer, Completions } from "./completions.js";
import { ErrorChecker } from "./errors.js";
import { ExportCommand } from "./export-notes.js";
import { ModelsFormatter, NotesFormatter } from "./format.js";
import { ModelManager } from "./models.js";
import { InsertIdCommand, insertIdOnSave } from "./note-id.js";
import { PreviewManager } from "./preview.js";

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
  new ExportCommand("json", errors, log).attach(context);
  new InsertIdCommand().attach(context);
  context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(insertIdOnSave));
}

export async function deactivate() {}
