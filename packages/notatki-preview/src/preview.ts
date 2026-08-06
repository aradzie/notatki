import { type NoteList, Output } from "@notatki/core";
import { CardTemplates } from "./card-templates.ts";
import { type ImageResolver } from "./image-resolver.ts";
import { expandPreviewOptions, type PreviewOptions } from "./preview-options.ts";
import { PreviewRenderer } from "./preview-renderer.ts";

export function generatePreview(
  notes: NoteList,
  resolver: ImageResolver,
  options: Partial<Readonly<PreviewOptions>> = {},
): string {
  const renderer = new PreviewRenderer();
  const templates = new CardTemplates(notes.types);
  const out = new Output();
  renderer.render({ options: expandPreviewOptions(options), templates, notes, out, resolver });
  return String(out);
}
