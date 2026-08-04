import { type NoteError, NoteList, NoteParser } from "@notatki/core";
import vscode from "vscode";
import { ankiModels, ankiNotes } from "./constants.ts";
import { type ModelManager } from "./models.ts";

export class ErrorChecker {
  readonly #context: vscode.ExtensionContext;
  readonly #models: ModelManager;
  readonly #diagnostics: vscode.DiagnosticCollection;

  constructor(context: vscode.ExtensionContext, models: ModelManager) {
    this.#context = context;
    this.#models = models;
    this.#diagnostics = vscode.languages.createDiagnosticCollection(ankiNotes);
    this.#context.subscriptions.push(this);
    this.#context.subscriptions.push(this.#diagnostics);
    this.#context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(this.#checkErrors));
    this.#context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(this.#checkErrors));
    const checkOnChange = false;
    this.#context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(({ document }) => {
        if (checkOnChange) {
          this.#checkErrors(document);
        }
      }),
    );
  }

  #checkErrors = (document: vscode.TextDocument) => {
    if (document.languageId === ankiNotes) {
      this.#checkNotes(document);
    }
    if (document.languageId === ankiModels) {
      this.#checkModels(document);
    }
  };

  #checkNotes(document: vscode.TextDocument) {
    const parser = new NoteParser(new NoteList(this.#models.build().types));
    parser.parseNotes(document.uri.fsPath, document.getText());
    parser.checkDuplicates();
    this.#diagnostics.set(document.uri, parser.errors.map(asDiagnostic));
  }

  #checkModels(document: vscode.TextDocument) {
    const parser = new NoteParser();
    parser.parseModels(document.uri.fsPath, document.getText());
    this.#diagnostics.set(document.uri, parser.errors.map(asDiagnostic));
  }

  clearAllErrors() {
    this.#diagnostics.clear();
  }

  showAllErrors(errors: Iterable<NoteError>) {
    const map = new Map<string, vscode.Diagnostic[]>();
    for (const error of errors) {
      const path = String(error.location.source);
      let diagnostics = map.get(path);
      if (diagnostics == null) {
        map.set(path, (diagnostics = []));
      }
      diagnostics.push(asDiagnostic(error));
    }
    for (const [path, diagnostics] of map) {
      this.#diagnostics.set(vscode.Uri.file(path), diagnostics);
    }
  }

  dispose() {}
}

function asDiagnostic({ message, location: { start, end } }: NoteError) {
  return new vscode.Diagnostic(
    new vscode.Range(start.line - 1, start.column - 1, end.line - 1, end.column - 1),
    message,
    vscode.DiagnosticSeverity.Error,
  );
}
