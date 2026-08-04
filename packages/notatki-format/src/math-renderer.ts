import { type KatexOptions } from "katex";
import { katexBlock, katexInline } from "./katex.ts";

export type MathRenderer = {
  block: (code: string) => string;
  inline: (code: string) => string;
};

export const renderTex = (): MathRenderer => {
  return {
    block: (code) => {
      return `\\[ ${code.trim()} \\]\n`;
    },
    inline: (code) => {
      return `\\( ${code.trim()} \\)`;
    },
  };
};

export const renderHtml = (options: KatexOptions = {}): MathRenderer => {
  return {
    block: (code) => {
      return katexBlock(code, options);
    },
    inline: (code) => {
      return katexInline(code, options);
    },
  };
};
