import { type MarkedExtension } from "marked";

export type ImageResolverCallback = (href: string) => string;

/**
 * Runs every Markdown image `src` through `resolver`, replacing it with
 * whatever `resolver` returns.
 */
export function imageExtension(resolver: ImageResolverCallback = (href) => href): MarkedExtension {
  return {
    renderer: {
      image(token) {
        token.href = resolver(token.href);
        return false;
      },
    },
  };
}

/**
 * Returns a resolver that resolves a relative image `href` against `baseUri`,
 * the directory containing the note file being rendered. The `baseUri` can also be
 * a full path to the note file itself. An `href` that already carries
 * its own scheme (an absolute URL, a `data:` URL, ...) is returned unchanged.
 */
export function resolveWithBaseUri(baseUri: string): ImageResolverCallback {
  return (href) => {
    try {
      return String(new URL(href, baseUri));
    } catch {
      return href;
    }
  };
}
