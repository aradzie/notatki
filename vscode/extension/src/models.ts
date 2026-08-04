import { ModelMap, type NoteError, NoteList, NoteParser } from "@notatki/core";
import vscode from "vscode";
import { ankiModels, excludeSearchPath, modelsSearchPath } from "./constants.ts";
import { reportError } from "./util.ts";

export class ModelManager {
  readonly #context: vscode.ExtensionContext;
  readonly #log: vscode.LogOutputChannel;
  readonly #onDidChange = new vscode.EventEmitter<null>();
  readonly #documentState = new Map<string, DocumentState>();
  #combinedState: CombinedState | null = null;

  constructor(context: vscode.ExtensionContext, log: vscode.LogOutputChannel) {
    this.#context = context;
    this.#log = log;
    this.#context.subscriptions.push(this);
    this.#context.subscriptions.push(this.#onDidChange);
    this.#context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(this.#handleDidOpenTextDocument));
    this.#context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(this.#handleDidSaveTextDocument));
    this.#context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(this.#handleDidCloseTextDocument));
    const watcher = vscode.workspace.createFileSystemWatcher(modelsSearchPath);
    this.#context.subscriptions.push(watcher);
    this.#context.subscriptions.push(watcher.onDidChange(this.#handleDidChange));
    this.#context.subscriptions.push(watcher.onDidCreate(this.#handleDidCreate));
    this.#context.subscriptions.push(watcher.onDidDelete(this.#handleDidDelete));
  }

  async reload() {
    this.#documentState.clear();
    this.#combinedState = null;
    for (const uri of await vscode.workspace.findFiles(modelsSearchPath, excludeSearchPath)) {
      this.#log.info("Found models file", uri.fsPath);
      this.#addDocument(await vscode.workspace.openTextDocument(uri));
    }
  }

  #handleDidOpenTextDocument = (document: vscode.TextDocument) => {
    this.#addDocument(document);
  };

  #handleDidSaveTextDocument = (document: vscode.TextDocument) => {
    this.#addDocument(document);
  };

  #handleDidCloseTextDocument = (document: vscode.TextDocument) => {};

  #handleDidChange = (uri: vscode.Uri) => {
    this.#log.info("File was changed", uri.fsPath);
    vscode.workspace.openTextDocument(uri).then(this.#addDocument, reportError);
  };

  #handleDidCreate = (uri: vscode.Uri) => {
    this.#log.info("File was created", uri.fsPath);
    vscode.workspace.openTextDocument(uri).then(this.#addDocument, reportError);
  };

  #handleDidDelete = (uri: vscode.Uri) => {
    this.#log.info("File was deleted", uri.fsPath);
    this.#documentState.delete(uri.fsPath);
    this.#notify();
  };

  #addDocument = (document: vscode.TextDocument) => {
    if (document.languageId === ankiModels) {
      const data = this.#documentState.get(pathOf(document));
      if (data == null || data.version !== document.version) {
        this.#documentState.set(pathOf(document), this.#parseDocument(document));
        this.#notify();
      }
    }
  };

  #parseDocument(document: vscode.TextDocument): DocumentState {
    this.#log.info("Parse models file", document.uri.fsPath);
    const { version } = document;
    const types = new ModelMap([]);
    const notes = new NoteList(types);
    const parser = new NoteParser(notes);
    parser.parseModels(pathOf(document), document.getText());
    const { errors } = parser;
    return { document, version, types, errors };
  }

  #notify() {
    this.#combinedState = null;
    this.#onDidChange.fire(null);
  }

  get onDidChange(): vscode.Event<null> {
    return this.#onDidChange.event;
  }

  build(): CombinedState {
    let state = this.#combinedState;
    if (state == null) {
      const types = new ModelMap();
      const errors = [];
      for (const state of this.#documentState.values()) {
        for (const type of state.types) {
          types.add(type);
        }
        for (const error of state.errors) {
          errors.push(error);
        }
      }
      this.#combinedState = state = { types, errors };
    }
    return state;
  }

  dispose() {
    this.#documentState.clear();
    this.#combinedState = null;
  }
}

function pathOf(document: vscode.TextDocument): string {
  return document.uri.fsPath;
}

type DocumentState = {
  readonly document: vscode.TextDocument;
  readonly version: number;
  readonly types: ModelMap;
  readonly errors: readonly NoteError[];
};

type CombinedState = {
  readonly types: ModelMap;
  readonly errors: readonly NoteError[];
};
