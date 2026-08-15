import { type MarkedExtension, type TokenizerAndRendererExtension, type Tokens } from "marked";
import { type MathRenderer, renderTex } from "./math-renderer.ts";

const DISPLAY_START_RE = /\\\[/;
const DISPLAY_RE = /^\\\[([\s\S]+?)\\\]/;

const INLINE_START_RE = /\\\(/;
const INLINE_RE = /^\\\((.+?)\\\)/;

const DISPLAY_ALT_START_RE = /\$\$(?!\$)/;
const DISPLAY_ALT_RE = /^\$\$(?!\$)([\s\S]+?)\$\$/;

const INLINE_ALT_START_RE = /\$(?![\s$])/;
const INLINE_ALT_RE = /^\$(?![\s$])(.+?)(?<!\s)\$/;

export function mathExtension(renderer: MathRenderer = renderTex()): MarkedExtension {
  // Common syntax.

  type LatexToken = Tokens.Generic & {
    type: "displayLatex" | "inlineLatex";
    code: string;
  };

  // Display LaTeX: \[ ... \]
  const displayLatex: TokenizerAndRendererExtension = {
    name: "displayLatex",
    level: "inline",
    start(src) {
      return DISPLAY_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_RE.exec(src);
      if (m) {
        return { type: "displayLatex", raw: m[0], code: m[1] } as LatexToken;
      }
      return undefined;
    },
    renderer(token) {
      return renderer.display((token as LatexToken).code);
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
        return { type: "inlineLatex", raw: m[0], code: m[1] } as LatexToken;
      }
      return undefined;
    },
    renderer(token) {
      return renderer.inline((token as LatexToken).code);
    },
  };

  // Alternate syntax.

  type LatexTokenAlt = Tokens.Generic & {
    type: "displayAltLatex" | "inlineAltLatex";
    code: string;
  };

  // Display LaTeX: $$ ... $$
  const displayAltLatex: TokenizerAndRendererExtension = {
    name: "displayAltLatex",
    level: "inline",
    start(src) {
      return DISPLAY_ALT_START_RE.exec(src)?.index ?? -1;
    },
    tokenizer(src) {
      const m = DISPLAY_ALT_RE.exec(src);
      if (m) {
        return { type: "displayAltLatex", raw: m[0], code: m[1] } as LatexTokenAlt;
      }
      return undefined;
    },
    renderer(token) {
      return renderer.display((token as LatexTokenAlt).code);
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
        return { type: "inlineAltLatex", raw: m[0], code: m[1] } as LatexTokenAlt;
      }
      return undefined;
    },
    renderer(token) {
      return renderer.inline((token as LatexTokenAlt).code);
    },
  };

  return {
    extensions: [
      displayLatex, //
      inlineLatex,
      displayAltLatex,
      inlineAltLatex,
    ],
  };
}
