import { Marked, type Token, type Tokens } from "marked";
import { mathExtension } from "./marked-math.ts";
import { DEFAULT_NORMALIZE_MATH_OPTIONS, normalizeMath, type NormalizeMathOptions } from "./normalize-math.ts";

/**
 * Reformats a Markdown field value: LaTeX math fragments are rewritten to a normalized form (per
 * `options`, see `normalizeTex`).
 */
export function prettyPrintField(
  value: string,
  options: NormalizeMathOptions = DEFAULT_NORMALIZE_MATH_OPTIONS,
): string {
  const tokens = new Marked().use(mathExtension(normalizeMath)).lexer(value.trim());
  return createSerializer(options).serializeBlocks(tokens).trim();
}

function createSerializer(options: NormalizeMathOptions) {
  function serializeBlocks(tokens: Token[]): string {
    return joinBlocks(tokens, serializeBlock);
  }

  function serializeBlock(token: Token): string {
    switch (token.type) {
      case "displayMathBlock":
      case "displayAltMathBlock":
        return normalizeMath(token.code, token.type, options);
      case "text":
        return reconstructText(token as Tokens.Text);
      case "paragraph":
        return reconstructParagraph(token as Tokens.Paragraph);
      case "heading":
        return reconstructHeading(token as Tokens.Heading);
      case "blockquote":
        return reconstructBlockquote(token as Tokens.Blockquote);
      case "list":
        return reconstructList(token as Tokens.List);
      default:
        return token.raw;
    }
  }

  function serializeInline(token: Token): string {
    switch (token.type) {
      case "inlineMath":
      case "displayMath":
      case "inlineAltMath":
      case "displayAltMath":
        return normalizeMath(token.code, token.type, options);
      case "text":
        return reconstructText(token as Tokens.Text);
      case "em":
        return reconstructWrapped(token as Tokens.Em, "*");
      case "strong":
        return reconstructWrapped(token as Tokens.Strong, "**");
      case "del":
        return reconstructWrapped(token as Tokens.Del, "~~");

      default:
        return token.raw;
    }
  }

  function reconstructText(token: Tokens.Text): string {
    return token.tokens ? token.tokens.map(serializeInline).join("") : token.raw;
  }

  function reconstructParagraph(token: Tokens.Paragraph): string {
    return token.tokens.map(serializeInline).join("");
  }

  function reconstructHeading(token: Tokens.Heading): string {
    return `${"#".repeat(token.depth)} ` + token.tokens.map(serializeInline).join("");
  }

  function reconstructBlockquote(token: Tokens.Blockquote): string {
    return applyPrefix(serializeBlocks(token.tokens), "> ");
  }

  function reconstructList(token: Tokens.List): string {
    const start = token.ordered ? (typeof token.start === "number" ? token.start : 1) : 0;
    const items = token.items.map((item, i) => reconstructListItem(item, token.ordered ? `${start + i}. ` : "- "));
    return items.join(token.loose ? "\n\n" : "\n");
  }

  function reconstructListItem(item: Tokens.ListItem, marker: string): string {
    const contentTokens = item.task ? stripTaskCheckbox(item.tokens) : item.tokens;
    const checkboxText = item.task ? (item.checked ? "[x] " : "[ ] ") : "";
    return indentListItem(checkboxText + serializeBlocks(contentTokens), marker);
  }

  function reconstructWrapped(token: Tokens.Em | Tokens.Strong | Tokens.Del, wrapper: string): string {
    return wrapper + token.tokens.map(serializeInline).join("") + wrapper;
  }

  return { serializeBlocks };
}

function joinBlocks(tokens: Token[], render: (token: Token) => string): string {
  const parts: string[] = [];
  let separator = "\n";
  for (const token of tokens) {
    if (token.type === "space") {
      // Collapse any run of blank lines between blocks down to exactly one blank line.
      separator = "\n\n";
      continue;
    }
    if (parts.length > 0) {
      parts.push(separator);
    }
    parts.push(render(token));
    separator = "\n";
  }
  return parts.join("");
}

function applyPrefix(content: string, prefix: string): string {
  return content
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
}

// Unlike `applyPrefix`, the marker only occupies the first line; continuation lines get a space-only
// indent of the same width, and genuinely blank lines (from loose multi-block item content) are left
// untouched rather than padded.
function indentListItem(content: string, marker: string): string {
  const continuation = " ".repeat(marker.length);
  return content
    .split("\n")
    .map((line, i) => (line === "" ? line : (i === 0 ? marker : continuation) + line))
    .join("\n");
}

// Strips the synthesized `checkbox` token out of a task list item's content tokens so it isn't
// double-rendered alongside the `[ ] `/`[x] ` prefix built from `item.task`/`item.checked`. It shows
// up in two shapes depending on looseness: a standalone leading token for tight items, or spliced into
// the leading paragraph's own inline tokens for loose items.
function stripTaskCheckbox(tokens: Token[]): Token[] {
  const [first, ...rest] = tokens;
  if (first?.type === "checkbox") {
    return rest;
  }
  if (
    (first?.type === "paragraph" || first?.type === "text") &&
    (first as Tokens.Paragraph | Tokens.Text).tokens?.[0]?.type === "checkbox"
  ) {
    const withoutCheckbox = (first as Tokens.Paragraph | Tokens.Text).tokens!.slice(1);
    return [{ ...first, tokens: withoutCheckbox }, ...rest];
  }
  return tokens;
}
