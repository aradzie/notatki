import { Marked, type MarkedToken, type Token, type Tokens } from "marked";
import { mathExtension } from "./marked-math.ts";

/**
 * A rendering override for one Markdown token type. Returns the replacement
 * text for `token`, or `false`/`undefined` to leave it unchanged, mirroring
 * the convention of Marked's own `RendererObject` methods.
 */
export type RendererExtension = {
  [K in MarkedToken["type"]]?: (token: Extract<MarkedToken, { type: K }>) => string | false | undefined;
};

/**
 * Renders `text` back to Markdown, applying `extensions` to selectively
 * rewrite specific tokens.
 *
 * Any token with no matching override, and no descendant changed by an
 * override, is emitted as its original source text (`token.raw`) verbatim —
 * with no extensions applied, `renderMarkdown(text)` reproduces `text`
 * exactly. A container token (paragraph, link, list item, ...) is only ever
 * reconstructed when a descendant actually changed, by locating each child's
 * original text within the container's own source text and splicing in the
 * updated version; everything around it (delimiters, indentation, list
 * markers, ...) is left as-is. If a change occurs inside a token type this
 * mechanism can't safely reconstruct (e.g. a multi-line blockquote, or a
 * table cell), it throws rather than emit something subtly wrong.
 */
export function renderMarkdown(text: string, extensions: RendererExtension[] = []): string {
  const marked = new Marked();
  marked.use(mathExtension());
  const tokens = marked.lexer(text);
  let out = "";
  for (const token of tokens) {
    out += render(token, extensions).text;
  }
  return out;
}

type Rendered = { text: string; changed: boolean };

function render(token: Token, extensions: RendererExtension[]): Rendered {
  const overridden = applyExtensions(token, extensions);
  if (overridden !== undefined) {
    return { text: overridden, changed: true };
  }

  const children = childTokens(token);
  if (children == null) {
    return { text: token.raw, changed: false };
  }

  const rendered = children.map((child) => render(child, extensions));
  if (rendered.every((r) => !r.changed)) {
    return { text: token.raw, changed: false };
  }

  if (token.type === "table") {
    throw new Error(`renderMarkdown: cannot rewrite content nested inside a table cell`);
  }
  return { text: splice(token.raw, children, rendered), changed: true };
}

function applyExtensions(token: Token, extensions: RendererExtension[]): string | undefined {
  const type = token.type as MarkedToken["type"];
  for (let i = extensions.length - 1; i >= 0; i -= 1) {
    const handler = (extensions[i] as Record<string, (token: Token) => string | false | undefined>)[type];
    if (handler == null) {
      continue;
    }
    const result = handler(token);
    if (result !== false && result !== undefined) {
      return result;
    }
  }
  return undefined;
}

/** Every token type that carries nested tokens, whichever shape they're stored in. */
function childTokens(token: Token): Token[] | undefined {
  if (token.type === "table") {
    const table = token as Tokens.Table;
    return [...table.header, ...table.rows.flat()].flatMap((cell) => cell.tokens);
  }
  const withItems = token as { items?: unknown };
  if (Array.isArray(withItems.items)) {
    return withItems.items as Token[];
  }
  const withTokens = token as { tokens?: unknown };
  if (Array.isArray(withTokens.tokens)) {
    return withTokens.tokens as Token[];
  }
  return undefined;
}

/**
 * Reconstructs `raw` by finding each of `children`'s original text within it,
 * in order, and replacing the ones that changed. Everything between and
 * around the children (delimiters, prefixes, whitespace, ...) is copied
 * through unchanged. Throws if a child's original text can't be located,
 * which happens when `raw` doesn't contain each child's text as a
 * contiguous, in-order substring (e.g. a multi-line blockquote, where every
 * line carries its own "> " prefix interleaved with the content).
 */
function splice(raw: string, children: Token[], rendered: Rendered[]): string {
  let cursor = 0;
  let out = "";
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i]!;
    const at = raw.indexOf(child.raw, cursor);
    if (at < 0) {
      throw new Error(`renderMarkdown: cannot rewrite content nested inside a "${child.type}" token here`);
    }
    out += raw.slice(cursor, at) + rendered[i]!.text;
    cursor = at + child.raw.length;
  }
  out += raw.slice(cursor);
  return out;
}
