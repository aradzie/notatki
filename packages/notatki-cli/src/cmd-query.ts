import { writeFile } from "node:fs/promises";
import { TagFilter } from "@notatki/core";
import { imageHrefExtension, renderMarkdown } from "@notatki/format";
import { ImageResolver } from "@notatki/preview";
import { withExt } from "./io.ts";
import { loadNotes } from "./notes.ts";

export async function queryCmd(paths: string[], { out, tags }: { out: string; tags: string[] }): Promise<void> {
  const filter = TagFilter.fromCliTags(tags);
  const notes = (await loadNotes(paths)).filter((note) => filter.matches(note));
  if (notes.length > 0) {
    const path = withExt(out, ".md");
    const resolver = new ImageResolver("link", path);
    const text = [];
    for (const note of notes) {
      if (text.length > 0) {
        text.push("\n---\n\n");
      }
      const source = note.first.node?.loc.source;
      const extensions = typeof source === "string" ? [imageHrefExtension(resolver.forSource(source))] : [];
      text.push(renderMarkdown(note.first.value, extensions) + "\n");
    }
    const content = text.join("");
    await writeFile(path, content);
    for (const warning of resolver.warnings) {
      console.warn(warning);
    }
    console.log(`Wrote ${notes.length} note(s) to "${path}".`);
  } else {
    console.warn("No notes found.");
  }
}
