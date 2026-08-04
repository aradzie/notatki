import { type MarkedExtension, type TokenizerAndRendererExtension, type Tokens } from "marked";
import { type MathRenderer, renderTex } from "./math-renderer.ts";

/**
 * Tests if the given text begins with "\[".
 */
function isBlockStart(src: string): boolean {
  return (
    src.length >= 4 && //
    src.charCodeAt(0) === /* "\" */ 0x005c &&
    src.charCodeAt(1) === /* "[" */ 0x005b
  );
}

/**
 * Finds the position of the opening "\[" in the given text.
 */
function findBlockStart(src: string, start: number): number {
  for (let i = start; i < src.length - 1; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      if (src.charCodeAt(i + 1) === /* "[" */ 0x005b) {
        return i;
      }
      i += 1; // Skip the escaped character.
    }
  }
  return -1;
}

/**
 * Finds the position of the closing "\]" in the given text.
 */
function findBlockEnd(src: string, start: number): number {
  let braceLevel = 0;
  for (let i = start; i < src.length - 1; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      if (
        braceLevel <= 0 && //
        src.charCodeAt(i + 1) === /* "]" */ 0x005d
      ) {
        return i;
      }
      i += 1; // Skip the escaped character.
      continue;
    }
    if (src.charCodeAt(i) === /* "{" */ 0x007b) {
      braceLevel += 1;
      continue;
    }
    if (src.charCodeAt(i) === /* "}" */ 0x007d) {
      braceLevel -= 1;
      continue;
    }
  }
  return -1;
}

/**
 * Tests if the given text begins with "\(".
 */
function isInlineStart(src: string): boolean {
  return (
    src.length >= 4 && //
    src.charCodeAt(0) === /* "\" */ 0x005c &&
    src.charCodeAt(1) === /* "(" */ 0x0028
  );
}

/**
 * Finds the position of the opening "\(" in the given text.
 */
function findInlineStart(src: string, start: number): number {
  for (let i = start; i < src.length - 1; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      if (src.charCodeAt(i + 1) === /* "(" */ 0x0028) {
        return i;
      }
      i += 1; // Skip the escaped character.
    }
  }
  return -1;
}

/**
 * Finds the position of the closing "\)" in the given text.
 */
function findInlineEnd(src: string, start: number): number {
  let braceLevel = 0;
  for (let i = start; i < src.length - 1; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      if (
        braceLevel <= 0 && //
        src.charCodeAt(i + 1) === /* ")" */ 0x0029
      ) {
        return i;
      }
      i += 1; // Skip the escaped character.
      continue;
    }
    if (src.charCodeAt(i) === /* "{" */ 0x007b) {
      braceLevel += 1;
      continue;
    }
    if (src.charCodeAt(i) === /* "}" */ 0x007d) {
      braceLevel -= 1;
      continue;
    }
  }
  return -1;
}

/**
 * Tests if the given text begins with "$$".
 */
function isBlockStartAlt(src: string): boolean {
  return (
    src.length >= 5 && // $$x$$
    src.charCodeAt(0) === /* "$" */ 0x0024 &&
    src.charCodeAt(1) === /* "$" */ 0x0024 &&
    src.charCodeAt(2) !== /* "$" */ 0x0024
  );
}

/**
 * Finds the position of the opening "$$" in the given text.
 */
function findBlockStartAlt(src: string, start: number): number {
  for (let i = start; i < src.length - 4; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      i += 1; // Skip the escaped character.
      continue;
    }
    if (
      src.charCodeAt(i) === /* "$" */ 0x0024 &&
      src.charCodeAt(i + 1) === /* "$" */ 0x0024 &&
      src.charCodeAt(i + 2) !== /* "$" */ 0x0024
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds the position of the closing "$$" in the given text.
 */
function findBlockEndAlt(src: string, start: number): number {
  let braceLevel = 0;
  for (let i = start; i < src.length - 1; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      i += 1; // Skip the escaped character.
      continue;
    }
    if (src.charCodeAt(i) === /* "{" */ 0x007b) {
      braceLevel += 1;
      continue;
    }
    if (src.charCodeAt(i) === /* "}" */ 0x007d) {
      braceLevel -= 1;
      continue;
    }
    if (
      braceLevel <= 0 && //
      src.charCodeAt(i) === /* "$" */ 0x0024 &&
      src.charCodeAt(i + 1) === /* "$" */ 0x0024
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Tests if the given text begins with "$".
 */
function isInlineStartAlt(src: string): boolean {
  return (
    src.length >= 3 && // $x$
    src.charCodeAt(0) === /* "$" */ 0x0024 &&
    src.charCodeAt(1) !== /* "$" */ 0x0024
  );
}

/**
 * Finds the position of the opening "$" in the given text.
 */
function findInlineStartAlt(src: string, start: number): number {
  for (let i = start; i < src.length - 2; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      i += 1; // Skip the escaped character.
      continue;
    }
    if (
      src.charCodeAt(i) === /* "$" */ 0x0024 && //
      src.charCodeAt(i + 1) !== /* "$" */ 0x0024
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds the position of the closing "$" in the given text.
 */
function findInlineEndAlt(src: string, start: number): number {
  let braceLevel = 0;
  for (let i = 1; i < src.length; i += 1) {
    if (src.charCodeAt(i) === /* "\" */ 0x005c) {
      i += 1; // Skip the escaped character.
      continue;
    }
    if (src.charCodeAt(i) === /* "{" */ 0x007b) {
      braceLevel += 1;
      continue;
    }
    if (src.charCodeAt(i) === /* "}" */ 0x007d) {
      braceLevel -= 1;
      continue;
    }
    if (
      braceLevel <= 0 && //
      src.charCodeAt(i) === /* "$" */ 0x0024
    ) {
      return i;
    }
  }
  return -1;
}

export function mathExtension(renderer: MathRenderer = renderTex()): MarkedExtension {
  // Common syntax.

  type LatexToken = Tokens.Generic & {
    type: "blockLatex" | "inlineLatex";
    code: string;
  };

  // Block LaTeX: \[ ... \]
  const blockLatex: TokenizerAndRendererExtension = {
    name: "blockLatex",
    level: "block",
    start(src) {
      return findBlockStart(src, 0);
    },
    tokenizer(src) {
      if (isBlockStart(src)) {
        const end = findBlockEnd(src, 2);
        if (end >= 2) {
          return {
            type: "blockLatex",
            raw: src.substring(0, end + 2),
            code: src.substring(2, end),
          } as LatexToken;
        }
      }
      return undefined;
    },
    renderer(token) {
      return renderer.block((token as LatexToken).code);
    },
  };

  // Inline LaTeX: \( ... \)
  const inlineLatex: TokenizerAndRendererExtension = {
    name: "inlineLatex",
    level: "inline",
    start(src) {
      return findInlineStart(src, 0);
    },
    tokenizer(src) {
      if (isInlineStart(src)) {
        const end = findInlineEnd(src, 2);
        if (end >= 2) {
          return {
            type: "inlineLatex",
            raw: src.substring(0, end + 2),
            code: src.substring(2, end),
          } as LatexToken;
        }
      }
      return undefined;
    },
    renderer(token) {
      return renderer.inline((token as LatexToken).code);
    },
  };

  // Alternate syntax.

  type LatexTokenAlt = Tokens.Generic & {
    type: "blockLatexAlt" | "inlineLatexAlt";
    code: string;
  };

  // Block LaTeX: $$ ... $$
  const blockLatexAlt: TokenizerAndRendererExtension = {
    name: "blockLatexAlt",
    level: "block",
    start(src) {
      return findBlockStartAlt(src, 0);
    },
    tokenizer(src) {
      if (isBlockStartAlt(src)) {
        const end = findBlockEndAlt(src, 2);
        if (end >= 2) {
          return {
            type: "blockLatexAlt",
            raw: src.substring(0, end + 2),
            code: src.substring(2, end),
          } as LatexTokenAlt;
        }
      }
      return undefined;
    },
    renderer(token) {
      return renderer.block((token as LatexTokenAlt).code);
    },
  };

  // Inline LaTeX: $ ... $
  const inlineLatexAlt: TokenizerAndRendererExtension = {
    name: "inlineLatexAlt",
    level: "inline",
    start(src) {
      return findInlineStartAlt(src, 0);
    },
    tokenizer(src) {
      if (isInlineStartAlt(src)) {
        const end = findInlineEndAlt(src, 1);
        if (end >= 1) {
          return {
            type: "inlineLatexAlt",
            raw: src.substring(0, end + 1),
            code: src.substring(1, end),
          } as LatexTokenAlt;
        }
      }
      return undefined;
    },
    renderer(token) {
      return renderer.inline((token as LatexTokenAlt).code);
    },
  };

  return {
    extensions: [
      blockLatex, //
      inlineLatex,
      blockLatexAlt,
      inlineLatexAlt,
    ],
  };
}
