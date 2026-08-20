import { parseCloze } from "@notatki/parser";
import { type KatexOptions } from "katex";
import { katexDisplay, katexInline } from "./katex.ts";

export type MathType = "displayMathBlock" | "displayMath" | "inlineMath";
export type MathAltType = "displayAltMathBlock" | "displayAltMath" | "inlineAltMath";
export type MathRenderer = {
  display: (code: string) => string;
  inline: (code: string) => string;
};

// Formats math for notes that will be imported into Anki as pre-rendered HTML (e.g. CSV export),
// where Anki's own MathJax integration still runs at review time. Both delimiter conventions
// (`$ $`/`$$ $$` and `\( \)`/`\[ \]`) are normalized to Anki's native `\( \)`/`\[ \]` form, but the
// LaTeX source itself is left otherwise untouched -- it's Anki, not this function, that typesets it.
// Contrast with `renderMathAsHtml`, which fully pre-renders math to KaTeX HTML for contexts with no
// Anki add-on to do that later (e.g. the static preview).
export const renderMathInHtml = (format: (code: string) => string = (code) => code): MathRenderer => {
  return {
    display: (code) => {
      return `\\[ ${escapeHtml(format(code.trim()))} \\]`;
    },
    inline: (code) => {
      return `\\( ${escapeHtml(format(code.trim()))} \\)`;
    },
  };
};

// Formats math for output with no Anki add-on around to typeset it later (e.g. the static preview):
// fully pre-renders the LaTeX to KaTeX HTML server-side via `katexDisplay`/`katexInline`, so the
// result is self-contained, finished markup rather than source text for something else to interpret.
// Contrast with `renderMathInHtml`, which normalizes delimiters but leaves the math source itself
// untouched for Anki's own MathJax integration to render at review time.
export const renderMathAsHtml = (
  options: KatexOptions = {},
  format: (code: string) => string = (code) => code,
): MathRenderer => {
  return {
    display: (code) => {
      return katexDisplay(format(code), options);
    },
    inline: (code) => {
      return katexInline(format(code), options);
    },
  };
};

// Anki's cloze syntax (`{{c1::answer::hint}}`) uses the same characters as LaTeX, so a cloze deletion
// written inside math would otherwise blend invisibly into the surrounding formula. Meant to be passed
// as the `format` callback to a `MathRenderer`, this wraps each cloze answer in LaTeX markup that makes
// it stand out from the rest of the formula.
export const showClozeDeletions = (code: string): string => {
  const parts = [];
  for (const item of parseCloze(code)) {
    if (typeof item === "string") {
      parts.push(item);
    } else {
      const id = `\\textcolor{blue}{\\text{C${item.id}}}`;
      const answer = `\\fcolorbox{blue}{none}{ $${item.answer.join("")}$ }`;
      parts.push(`\\underset{ ${id} }{ ${answer} }`);
    }
  }
  return parts.join("");
};

// Escapes characters that a browser's HTML tokenizer would otherwise interpret as markup
// (e.g. "<L" starting a tag) when this raw LaTeX source is spliced into document HTML for
// MathJax/KaTeX auto-render to pick up later.
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
