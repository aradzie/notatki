import { Marked } from "marked";
import { imageExtension, type ImageResolverCallback } from "./marked-image.ts";
import { mathExtension } from "./marked-math.ts";
import { type MathRenderer } from "./math-renderer.ts";

export function formatField(value: string, renderer?: MathRenderer, resolver?: ImageResolverCallback): string {
  const parser = new Marked();
  parser.use(mathExtension(renderer));
  parser.use(imageExtension(resolver));
  return parser.parse(value.trim(), { async: false }).trim();
}
