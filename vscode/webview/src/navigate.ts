import { type LocationRange } from "@notatki/parser";
import { type RevealRangeMessage } from "@notatki/vscode-protocol";
import { vscode } from "./vscode.ts";

export function revealRange({ source, start, end }: LocationRange): void {
  vscode.postMessage({
    type: "reveal-range",
    uri: String(source),
    start: start.offset,
    end: end.offset,
  } satisfies RevealRangeMessage);
}
