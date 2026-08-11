import { type Tokens } from "marked";
import { type ImageResolverCallback } from "./marked-image.ts";
import { type RendererExtension } from "./render-markdown.ts";

/**
 * A `renderMarkdown` extension that rewrites `![alt](href)` image references
 * via `resolver`, leaving everything else — including images whose `href`
 * `resolver` returns unchanged — untouched. Raw HTML `<img>` tags aren't
 * covered by this: `renderMarkdown`'s lexer only recognizes Markdown image
 * syntax as an `image` token.
 */
export function imageHrefExtension(resolver: ImageResolverCallback): RendererExtension {
  return {
    image(token) {
      const href = resolver(token.href);
      if (href === token.href) {
        return false;
      }
      return imageRaw({ ...token, href });
    },
  };
}

function imageRaw({ text, href, title }: Tokens.Image): string {
  const titlePart = title != null ? ` "${title}"` : "";
  return `![${text}](${href}${titlePart})`;
}
