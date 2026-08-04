import { Marked } from "marked";
import { imageExtension } from "./marked-image.ts";
import { mathExtension } from "./marked-math.ts";
import { type MathRenderer } from "./math-renderer.ts";

export function formatField(value: string, renderer?: MathRenderer, baseUri?: string | null): string {
  const parser = new Marked();
  parser.use(mathExtension(renderer));
  if (baseUri) {
    parser.use(imageExtension(baseUri));
  }
  return parser.parse(value.trim(), { async: false }).trim();
}
