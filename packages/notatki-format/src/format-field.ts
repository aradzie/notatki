import { Marked } from "marked";
import { imageExtension, type ImageResolverCallback } from "./marked-image.ts";
import { mathExtension } from "./marked-math.ts";
import { type MathRenderer } from "./math-renderer.ts";

export function formatField(value: string, math: MathRenderer, image: ImageResolverCallback = (href) => href): string {
  return new Marked().use(mathExtension(math)).use(imageExtension(image)).parse(value.trim(), { async: false }).trim();
}
