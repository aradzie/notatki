import { parseCloze } from "@notatki/parser";
import { type KatexOptions } from "katex";
import { katexDisplay, katexInline } from "./katex.ts";

export type MathRenderer = {
  display: (code: string) => string;
  inline: (code: string) => string;
};

export const renderTex = (format: (code: string) => string = (code) => code): MathRenderer => {
  return {
    display: (code) => {
      return `\\[ ${format(code.trim())} \\]`;
    },
    inline: (code) => {
      return `\\( ${format(code.trim())} \\)`;
    },
  };
};

export const renderHtml = (
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

export function showClozeDeletions(code: string): string {
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
}
