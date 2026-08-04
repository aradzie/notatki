import { Marked } from "marked";
import { mathExtension } from "./marked-math.ts";
import { type MathRenderer } from "./math-renderer.ts";

export function formatField(value: string, renderer?: MathRenderer): string {
  const parser = new Marked();
  parser.use(mathExtension(renderer));
  return parser.parse(value.trim(), { async: false }).trim();
}
