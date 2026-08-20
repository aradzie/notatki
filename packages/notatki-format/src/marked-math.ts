import { type MarkedExtension, type TokenizerAndRendererExtension, type Tokens } from "marked";
import { type MathAltType, type MathRenderer, type MathType } from "./math-renderer.ts";

const DISPLAY_START_RE = /\\\[/;
const DISPLAY_RE = /^\\\[(.+?)\\\]/;
// Unlike DISPLAY_START_RE, anchored to a line start (`\n`, since this is only ever searched
// within the *remainder* of the source, never at its very beginning -- see displayMathBlock).
// This is what stops marked's paragraph-clipping (the `startBlock` mechanism) from breaking a
// paragraph mid-line: without the anchor, any occurrence of `\[` anywhere in an in-progress
// paragraph -- even mid-line -- would prematurely end it.
const DISPLAY_BLOCK_START_RE = /\n\\\[/;
// The closing delimiter must end its own line -- only horizontal whitespace, then a newline or
// end of input, may follow it -- otherwise this isn't a standalone block.
const DISPLAY_BLOCK_RE = /^\\\[([\s\S]+?)\\\][ \t]*(?:\n|$)/;

const INLINE_START_RE = /\\\(/;
const INLINE_RE = /^\\\((.+?)\\\)/;

const DISPLAY_ALT_START_RE = /\$\$(?!\$)/;
const DISPLAY_ALT_RE = /^\$\$(?!\$)(.+?)\$\$/;
// See DISPLAY_BLOCK_START_RE.
const DISPLAY_ALT_BLOCK_START_RE = /\n\$\$(?!\$)/;
// See DISPLAY_BLOCK_RE.
const DISPLAY_ALT_BLOCK_RE = /^\$\$(?!\$)([\s\S]+?)\$\$[ \t]*(?:\n|$)/;

const INLINE_ALT_START_RE = /\$(?![\s$])/;
const INLINE_ALT_RE = /^\$(?![\s$])(.+?)(?<!\s)\$/;

export function mathExtension(renderer: MathRenderer): MarkedExtension {
  // Common syntax.

  type MathToken = Tokens.Generic & {
    type: MathType;
    code: string;
  };

  // Display LaTeX: \[ ... \], spanning multiple lines. Must be given top priority at the block
  // level so it claims its whole span before any built-in block rule (heading/list/blockquote/
  // etc.) can tear it apart on an embedded line that looks like the start of another block.
  const displayMathBlock: TokenizerAndRendererExtension = {
    name: "displayMathBlock",
    level: "block",
    start(src) {
      return DISPLAY_BLOCK_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_BLOCK_RE.exec(src);
      if (m) {
        return { type: "displayMathBlock", raw: m[0]!, code: m[1]! } satisfies MathToken;
      }
      return undefined;
    },
    renderer({ code }) {
      return `<p>${renderer.display(code)}</p>`;
    },
  };

  // Display LaTeX: \[ ... \] (single line only; multi-line spans are handled by displayMathBlock)
  const displayMath: TokenizerAndRendererExtension = {
    name: "displayMath",
    level: "inline",
    start(src) {
      return DISPLAY_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_RE.exec(src);
      if (m) {
        return { type: "displayMath", raw: m[0]!, code: m[1]! } satisfies MathToken;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.display(code);
    },
  };

  // Inline LaTeX: \( ... \)
  const inlineMath: TokenizerAndRendererExtension = {
    name: "inlineMath",
    level: "inline",
    start(src) {
      return INLINE_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = INLINE_RE.exec(src);
      if (m) {
        return { type: "inlineMath", raw: m[0]!, code: m[1]! } satisfies MathToken;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.inline(code);
    },
  };

  // Alternate syntax.

  type MathTokenAlt = Tokens.Generic & {
    type: MathAltType;
    code: string;
  };

  // Display LaTeX: $$ ... $$, spanning multiple lines. See displayMathBlock for why this needs
  // to be a top-priority block extension rather than an inline one.
  const displayAltMathBlock: TokenizerAndRendererExtension = {
    name: "displayAltMathBlock",
    level: "block",
    start(src) {
      return DISPLAY_ALT_BLOCK_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_ALT_BLOCK_RE.exec(src);
      if (m) {
        return { type: "displayAltMathBlock", raw: m[0]!, code: m[1]! } satisfies MathTokenAlt;
      }
      return undefined;
    },
    renderer({ code }) {
      return `<p>${renderer.display(code)}</p>`;
    },
  };

  // Display LaTeX: $$ ... $$ (single line only; multi-line spans are handled by
  // displayAltMathBlock)
  const displayAltMath: TokenizerAndRendererExtension = {
    name: "displayAltMath",
    level: "inline",
    start(src) {
      return DISPLAY_ALT_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_ALT_RE.exec(src);
      if (m) {
        return { type: "displayAltMath", raw: m[0]!, code: m[1]! } satisfies MathTokenAlt;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.display(code);
    },
  };

  // Inline LaTeX: $ ... $
  const inlineAltMath: TokenizerAndRendererExtension = {
    name: "inlineAltMath",
    level: "inline",
    start(src) {
      return INLINE_ALT_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = INLINE_ALT_RE.exec(src);
      if (m) {
        return { type: "inlineAltMath", raw: m[0]!, code: m[1]! } satisfies MathTokenAlt;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.inline(code);
    },
  };

  return {
    extensions: [
      displayMathBlock, //
      displayMath,
      inlineMath,
      displayAltMathBlock,
      displayAltMath,
      inlineAltMath,
    ],
  };
}
