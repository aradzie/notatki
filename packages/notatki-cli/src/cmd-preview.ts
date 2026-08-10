import { writeFile } from "node:fs/promises";
import { TagFilter } from "@notatki/core";
import { generatePreview, type ImageMode, ImageResolver } from "@notatki/preview";
import { withExt } from "./io.ts";
import { loadNotes } from "./notes.ts";

export async function previewCmd(
  paths: string[],
  { out, images, tags }: { out: string; images: ImageMode; tags: string[] },
): Promise<void> {
  const filter = TagFilter.fromCliTags(tags);
  const notes = (await loadNotes(paths)).filter((note) => filter.matches(note));
  if (notes.length > 0) {
    const path = withExt(out, ".html");
    const resolver = new ImageResolver(images, path);
    await writeFile(path, generatePreview(notes, resolver));
    for (const warning of resolver.warnings) {
      console.warn(warning);
    }
    console.log(`Generated HTML preview to "${path}".`);
  } else {
    console.warn(`No notes found.`);
  }
}
