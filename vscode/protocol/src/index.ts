// These messages flow from the extension to the webview.

export type ToWebviewMessage = UpdateMessage | SelectMessage;

export type UpdateMessage = {
  readonly type: "update";
  readonly uri: string;
  readonly locked: boolean;
  readonly text: string;
  readonly models: readonly Model[];
};

export type SelectMessage = {
  readonly type: "select";
  readonly start: number;
  readonly end: number;
};

// These messages flow from the webview to the extension.

export type ToExtensionMessage = RevealRangeMessage;

export type RevealRangeMessage = {
  readonly type: "reveal-range";
  readonly uri: string;
  readonly start: number;
  readonly end: number;
};

/**
 * The shared preview state which allows reviving of the preview by the extension.
 */
export type ReviveState = {
  readonly type: "revive";
  readonly uri: string;
  readonly locked: boolean;
};

type Model = {
  readonly name: string;
  readonly id: number;
  readonly cloze: boolean;
  readonly fields: readonly ModelField[];
  readonly cards: readonly ModelCard[];
  readonly styles: string;
};

type ModelField = {
  readonly name: string;
  readonly required: boolean;
};

type ModelCard = {
  readonly name: string;
  readonly front: string;
  readonly back: string;
};
