import { type Model } from "@notatki/core";
import {
  type ReviveState,
  type SelectMessage,
  type ToExtensionMessage,
  type UpdateMessage,
} from "@notatki/vscode-protocol";
import vscode from "vscode";
import {
  ankiNotes,
  cmdShowLockedPreviewToTheSide,
  cmdShowPreview,
  cmdShowPreviewToTheSide,
  viewType,
} from "./constants.ts";
import { type ModelManager } from "./models.ts";
import { reportError, revealRange } from "./util.ts";

class Preview {
  static viewType = viewType;
  static title = "Anki Notes";

  readonly #panel: vscode.WebviewPanel;
  #uri: string = "";
  #locked: boolean = false;

  constructor(manager: PreviewManager, panel: vscode.WebviewPanel) {
    this.#panel = panel;
    this.#panel.onDidChangeViewState(this.#onDidChangeViewState); // TODO Dispose.
    this.#panel.webview.onDidReceiveMessage(this.#onDidReceiveMessage); // TODO Dispose.
    manager.setWebviewContent(this.#panel.webview);
  }

  get panel(): vscode.WebviewPanel {
    return this.#panel;
  }

  get uri(): string {
    return this.#uri;
  }

  set uri(value: string) {
    this.#uri = value;
  }

  get locked(): boolean {
    return this.#locked;
  }

  set locked(value: boolean) {
    this.#locked = value;
  }

  render(text: string, models: Model[]) {
    this.#panel.title = this.#getTitle();
    this.#panel.webview.postMessage({
      type: "update",
      uri: this.#uri,
      locked: this.#locked,
      text,
      models,
    } satisfies UpdateMessage);
  }

  select(start: number, end: number) {
    this.#panel.webview.postMessage({
      type: "select",
      start,
      end,
    } satisfies SelectMessage);
  }

  #getTitle() {
    const name = this.#uri.split("/").pop();
    if (this.#locked) {
      return `[${Preview.title}]: ${name}`;
    } else {
      return `${Preview.title}: ${name}`;
    }
  }

  #onDidChangeViewState = ({ webviewPanel }: vscode.WebviewPanelOnDidChangeViewStateEvent): void => {};

  #onDidReceiveMessage = (message: ToExtensionMessage): void => {
    switch (message.type) {
      case "reveal-range": {
        const { uri, start, end } = message;
        revealRange(vscode.Uri.parse(uri), vscode.ViewColumn.One, start, end).catch(reportError);
        break;
      }
    }
  };

  dispose() {
    this.#panel.dispose();
  }
}

export class PreviewManager implements vscode.WebviewPanelSerializer {
  readonly #context: vscode.ExtensionContext;
  readonly #models: ModelManager;
  readonly #previews = new Set<Preview>();

  constructor(context: vscode.ExtensionContext, models: ModelManager) {
    this.#context = context;
    this.#models = models;
    this.#context.subscriptions.push(this);
    this.#context.subscriptions.push(vscode.window.registerWebviewPanelSerializer(Preview.viewType, this));
    this.#context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor != null && editor.document.languageId === ankiNotes) {
          this.#updateDocumentPreviews(editor.document);
        }
      }),
    );
    this.#context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(({ document }) => {
        if (document.languageId === ankiNotes) {
          this.#updateDocumentPreviews(document);
        }
      }),
    );
    this.#context.subscriptions.push(
      vscode.window.onDidChangeTextEditorSelection(({ textEditor: { document }, selections }) => {
        if (document.languageId === ankiNotes && selections.length > 0) {
          this.#updateDocumentSelections(document, selections[0]!);
        }
      }),
    );
    this.#context.subscriptions.push(
      vscode.commands.registerCommand(cmdShowPreview, () =>
        this.showPreview(/* sideBySide = */ false, /* locked= */ false),
      ),
    );
    this.#context.subscriptions.push(
      vscode.commands.registerCommand(cmdShowPreviewToTheSide, () =>
        this.showPreview(/* sideBySide = */ true, /* locked= */ false),
      ),
    );
    this.#context.subscriptions.push(
      vscode.commands.registerCommand(cmdShowLockedPreviewToTheSide, () =>
        this.showPreview(/* sideBySide = */ true, /* locked= */ true),
      ),
    );
  }

  showPreview(sideBySide: boolean, locked: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (editor != null && editor.document.languageId === ankiNotes) {
      const { document } = editor;
      const uri = String(document.uri);
      for (const preview of this.#previews) {
        if (preview.uri === uri && preview.locked === locked) {
          const editorColumn = editor.viewColumn ?? vscode.ViewColumn.One;
          const previewColumn = preview.panel.viewColumn ?? vscode.ViewColumn.One;
          if (sideBySide === editorColumn < previewColumn) {
            preview.panel.reveal();
            return;
          }
        }
      }
      const panel = vscode.window.createWebviewPanel(
        Preview.viewType,
        Preview.title,
        {
          viewColumn: sideBySide ? vscode.ViewColumn.Beside : (editor.viewColumn ?? vscode.ViewColumn.One),
          preserveFocus: true,
        },
        {
          retainContextWhenHidden: true,
        },
      );
      const preview = this.#createPreview(panel);
      preview.uri = uri;
      preview.locked = locked;
      preview.render(document.getText(), [...this.#models.build().types]);
    }
  }

  async deserializeWebviewPanel(panel: vscode.WebviewPanel, state: ReviveState) {
    if (state.type === "revive") {
      const { uri, locked } = state;
      const preview = this.#createPreview(panel);
      preview.uri = uri;
      preview.locked = locked;
      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
        preview.render(document.getText(), [...this.#models.build().types]);
      } catch (err) {
        reportError(err);
      }
    }
  }

  #createPreview(panel: vscode.WebviewPanel) {
    const preview = new Preview(this, panel);
    this.#previews.add(preview);
    preview.panel.onDidDispose(() => {
      this.#previews.delete(preview);
    });
    return preview;
  }

  #updateDocumentPreviews(document: vscode.TextDocument) {
    const uri = String(document.uri);
    for (const preview of this.#previews) {
      if (!preview.locked || preview.uri === uri) {
        preview.uri = uri;
        preview.render(document.getText(), [...this.#models.build().types]);
      }
    }
  }

  #updateDocumentSelections(document: vscode.TextDocument, selection: vscode.Selection) {
    const uri = String(document.uri);
    const start = document.offsetAt(selection.start);
    const end = document.offsetAt(selection.end);
    for (const preview of this.#previews) {
      if (preview.uri === uri) {
        preview.select(start, end);
      }
    }
  }

  setWebviewContent(webview: vscode.Webview) {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.#getAssetsPath("assets")],
    };
    webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Anki Cards Preview</title>
  <link rel="stylesheet" href="${webview.asWebviewUri(this.#getAssetsPath("assets", "preview.css"))}">
  <script src="${webview.asWebviewUri(this.#getAssetsPath("assets", "preview.js"))}" type="module"></script>
</head>
<body>
  <div id="main"></div>
</body>
</html>`;
  }

  #getAssetsPath(...segments: string[]): vscode.Uri {
    return vscode.Uri.joinPath(this.#context.extensionUri, ...segments);
  }

  dispose() {
    for (const preview of this.#previews) {
      preview.dispose();
    }
    this.#previews.clear();
  }
}
