import { NoteParser, printModelNodes, printNoteNodes, reformatModelNodes, reformatNoteNodes } from "@notatki/core";
import { type DelimiterStyle, prettyPrintField } from "@notatki/format";
import vscode from "vscode";
import { ankiModels, ankiNotes } from "./constants.ts";
import { replaceDocument } from "./util.ts";

export class NotesFormatter implements vscode.DocumentFormattingEditProvider {
  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(this);
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(ankiNotes, this));
  }

  provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    const parser = new NoteParser();
    const nodes = parser.parseNoteNodes(document.uri.fsPath, document.getText());
    if (parser.errors.length > 0) {
      return [];
    } else {
      const configuration = vscode.workspace.getConfiguration(ankiNotes);
      const formatNotes = configuration.get("formatNotes", true);
      const delimiterStyle = configuration.get<DelimiterStyle>("mathDelimiterStyle", "unchanged");
      const formatField = formatNotes ? (text: string) => prettyPrintField(text, { delimiterStyle }) : undefined;
      return replaceDocument(document, printNoteNodes(reformatNoteNodes(nodes, formatField)));
    }
  }

  dispose() {}
}

export class ModelsFormatter implements vscode.DocumentFormattingEditProvider {
  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(this);
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider(ankiModels, this));
  }

  provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    const parser = new NoteParser();
    const nodes = parser.parseModelNodes(document.uri.fsPath, document.getText());
    if (parser.errors.length > 0) {
      return [];
    } else {
      return replaceDocument(document, printModelNodes(reformatModelNodes(nodes)));
    }
  }

  dispose() {}
}
