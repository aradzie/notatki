import { type ModelMap } from "@notatki/core";
import vscode from "vscode";
import { ankiNotes } from "./constants.ts";
import { type ModelManager } from "./models.ts";

export class Completer implements vscode.CompletionItemProvider {
  readonly #context: vscode.ExtensionContext;
  readonly #completions: Completions;

  constructor(context: vscode.ExtensionContext, completions: Completions) {
    this.#context = context;
    this.#completions = completions;
    this.#context.subscriptions.push(this);
    this.#context.subscriptions.push(vscode.languages.registerCompletionItemProvider(ankiNotes, this));
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const list = [];
    if (position.character === 0) {
      // Complete property names.
      // list.push(new vscode.CompletionItem({ label: `!type:`, description: "Property name" }));
      // list.push(new vscode.CompletionItem({ label: `!deck:`, description: "Property name" }));
      // list.push(new vscode.CompletionItem({ label: `!tags:`, description: "Property name" }));
      // Complete field names.
      const fields = new Set();
      for (const type of this.#completions.types()) {
        for (const field of type.fields) {
          fields.add(field.name.toLowerCase());
        }
      }
      for (const field of fields) {
        list.push(new vscode.CompletionItem({ label: `!${field}:`, description: "Field name" }));
      }
    } else {
      // Complete property values.
      const line = document.lineAt(position);
      switch (true) {
        case /^!type:/i.test(line.text): {
          for (const type of this.#completions.types()) {
            list.push(new vscode.CompletionItem({ label: type.name, description: "Type name" }));
          }
          break;
        }
        case /^!deck:/i.test(line.text): {
          for (const deck of this.#completions.decks()) {
            list.push(new vscode.CompletionItem({ label: deck, description: "Deck name" }));
          }
          break;
        }
        case /^!tags:/i.test(line.text): {
          for (const tag of this.#completions.tags()) {
            list.push(new vscode.CompletionItem({ label: tag, description: "Tag name" }));
          }
          break;
        }
      }
    }
    return list;
  }

  dispose() {}
}

export class Completions {
  #models: ModelManager;

  constructor(models: ModelManager) {
    this.#models = models;
  }

  types(): ModelMap {
    return this.#models.build().types;
  }

  decks(): string[] {
    return [];
  }

  tags(): string[] {
    return [];
  }
}
