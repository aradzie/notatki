import { type MarkedExtension, type TokenizerAndRendererExtension, type Tokens } from "marked";
import { type MathRenderer, renderTex } from "./math-renderer.ts";

const DISPLAY_START_RE = /\\\[/;
const DISPLAY_RE = /^\\\[(.+?)\\\]/;
// Unlike DISPLAY_START_RE, anchored to a line start (`\n`, since this is only ever searched
// within the *remainder* of the source, never at its very beginning -- see displayLatexBlock).
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

export function mathExtension(renderer: MathRenderer = renderTex()): MarkedExtension {
  // Common syntax.

  type LatexToken = Tokens.Generic & {
    type: "displayLatexBlock" | "displayLatex" | "inlineLatex";
    code: string;
  };

  // Display LaTeX: \[ ... \], spanning multiple lines. Must be given top priority at the block
  // level so it claims its whole span before any built-in block rule (heading/list/blockquote/
  // etc.) can tear it apart on an embedded line that looks like the start of another block.
  const displayLatexBlock: TokenizerAndRendererExtension = {
    name: "displayLatexBlock",
    level: "block",
    start(src) {
      return DISPLAY_BLOCK_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_BLOCK_RE.exec(src);
      if (m) {
        return { type: "displayLatexBlock", raw: m[0]!, code: m[1]! } satisfies LatexToken;
      }
      return undefined;
    },
    renderer({ code }) {
      return `<p>${renderer.display(code)}</p>`;
    },
  };

  // Display LaTeX: \[ ... \] (single line only; multi-line spans are handled by displayLatexBlock)
  const displayLatex: TokenizerAndRendererExtension = {
    name: "displayLatex",
    level: "inline",
    start(src) {
      return DISPLAY_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_RE.exec(src);
      if (m) {
        return { type: "displayLatex", raw: m[0]!, code: m[1]! } satisfies LatexToken;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.display(code);
    },
  };

  // Inline LaTeX: \( ... \)
  const inlineLatex: TokenizerAndRendererExtension = {
    name: "inlineLatex",
    level: "inline",
    start(src) {
      return INLINE_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = INLINE_RE.exec(src);
      if (m) {
        return { type: "inlineLatex", raw: m[0]!, code: m[1]! } satisfies LatexToken;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.inline(code);
    },
  };

  // Alternate syntax.

  type LatexTokenAlt = Tokens.Generic & {
    type: "displayAltLatexBlock" | "displayAltLatex" | "inlineAltLatex";
    code: string;
  };

  // Display LaTeX: $$ ... $$, spanning multiple lines. See displayLatexBlock for why this needs
  // to be a top-priority block extension rather than an inline one.
  const displayAltLatexBlock: TokenizerAndRendererExtension = {
    name: "displayAltLatexBlock",
    level: "block",
    start(src) {
      return DISPLAY_ALT_BLOCK_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_ALT_BLOCK_RE.exec(src);
      if (m) {
        return { type: "displayAltLatexBlock", raw: m[0]!, code: m[1]! } satisfies LatexTokenAlt;
      }
      return undefined;
    },
    renderer({ code }) {
      return `<p>${renderer.display(code)}</p>`;
    },
  };

  // Display LaTeX: $$ ... $$ (single line only; multi-line spans are handled by
  // displayAltLatexBlock)
  const displayAltLatex: TokenizerAndRendererExtension = {
    name: "displayAltLatex",
    level: "inline",
    start(src) {
      return DISPLAY_ALT_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_ALT_RE.exec(src);
      if (m) {
        return { type: "displayAltLatex", raw: m[0]!, code: m[1]! } satisfies LatexTokenAlt;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.display(code);
    },
  };

  // Inline LaTeX: $ ... $
  const inlineAltLatex: TokenizerAndRendererExtension = {
    name: "inlineAltLatex",
    level: "inline",
    start(src) {
      return INLINE_ALT_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = INLINE_ALT_RE.exec(src);
      if (m) {
        return { type: "inlineAltLatex", raw: m[0]!, code: m[1]! } satisfies LatexTokenAlt;
      }
      return undefined;
    },
    renderer({ code }) {
      return renderer.inline(code);
    },
  };

  return {
    extensions: [
      displayLatexBlock, //
      displayLatex,
      inlineLatex,
      displayAltLatexBlock,
      displayAltLatex,
      inlineAltLatex,
    ],
  };
}
