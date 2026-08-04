import { insertNoteId, NoteParser, printNoteNodes } from "@notatki/core";
import vscode from "vscode";
import { Command } from "./command.ts";
import { ankiNotes, cmdInsertId } from "./constants.ts";
import { replaceDocument } from "./util.ts";

export class InsertIdCommand extends Command {
  constructor() {
    super(cmdInsertId);
  }

  async execute() {
    const editor = vscode.window.activeTextEditor;
    if (editor != null && editor.document.languageId === ankiNotes) {
      const { document } = editor;
      const edit = new vscode.WorkspaceEdit();
      for (const { range, newText } of editDocument(document)) {
        edit.replace(document.uri, range, newText);
      }
      if (await vscode.workspace.applyEdit(edit)) {
        if (document.isDirty) {
          await document.save();
        }
      }
    }
  }
}

export function insertIdOnSave(event: vscode.TextDocumentWillSaveEvent) {
  const { document } = event;
  if (document.languageId === ankiNotes) {
    if (vscode.workspace.getConfiguration(ankiNotes).get("insertIdOnSave", true)) {
      event.waitUntil(Promise.resolve(editDocument(document)));
    }
  }
}

function editDocument(document: vscode.TextDocument): vscode.TextEdit[] {
  const parser = new NoteParser();
  const nodes = parser.parseNoteNodes(document.uri.fsPath, document.getText());
  if (parser.errors.length > 0 || !insertNoteId(nodes)) {
    return [];
  } else {
    return replaceDocument(document, printNoteNodes(nodes));
  }
}
