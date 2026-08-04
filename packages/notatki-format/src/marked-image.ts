import { type MarkedExtension } from "marked";

/**
 * Rewrites relative image `src` paths in Markdown to resolve against
 * `baseUri`, the directory containing the note file being rendered.
 * The `baseUri` can also be a full path to the note file itself.
 */
export function imageExtension(baseUri: string): MarkedExtension {
  return {
    renderer: {
      image(token) {
        token.href = String(new URL(token.href, baseUri));
        return false;
      },
    },
  };
}
