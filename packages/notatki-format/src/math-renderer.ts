import { type KatexOptions } from "katex";
import { katexDisplay, katexInline } from "./katex.ts";

export type MathRenderer = {
  display: (code: string) => string;
  inline: (code: string) => string;
};

export const renderTex = (): MathRenderer => {
  return {
    display: (code) => {
      return `\\[ ${code.trim()} \\]`;
    },
    inline: (code) => {
      return `\\( ${code.trim()} \\)`;
    },
  };
};

export const renderHtml = (options: KatexOptions = {}): MathRenderer => {
  return {
    display: (code) => {
      return katexDisplay(code, options);
    },
    inline: (code) => {
      return katexInline(code, options);
    },
  };
};
