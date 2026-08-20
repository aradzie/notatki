import { type MathAltType, type MathType } from "./math-renderer.ts";

export type DelimiterStyle = "unchanged" | "latex" | "dollar";

export type NormalizeMathOptions = {
  delimiterStyle: DelimiterStyle;
};

export const DEFAULT_NORMALIZE_MATH_OPTIONS: NormalizeMathOptions = {
  delimiterStyle: "unchanged",
};

type MathKind = "block" | "display" | "inline";

/**
 * Normalizes a parsed math span back to delimited LaTeX source text, according to `options`.
 */
export function normalizeMath(
  code: string,
  type: MathType | MathAltType,
  options: NormalizeMathOptions = DEFAULT_NORMALIZE_MATH_OPTIONS,
): string {
  const kind = kindOf(type);
  switch (options.delimiterStyle) {
    case "unchanged":
      return isDollarType(type) ? wrapDollar(code.trim(), kind) : wrapLatex(code.trim(), kind);
    case "latex":
      return wrapLatex(code.trim(), kind);
    case "dollar":
      return wrapDollar(code.trim(), kind);
  }
}

function kindOf(type: MathType | MathAltType): MathKind {
  switch (type) {
    case "displayMathBlock":
    case "displayAltMathBlock":
      return "block";
    case "displayMath":
    case "displayAltMath":
      return "display";
    case "inlineMath":
    case "inlineAltMath":
      return "inline";
  }
}

function isDollarType(type: MathType | MathAltType): boolean {
  return type === "displayAltMathBlock" || type === "displayAltMath" || type === "inlineAltMath";
}

function wrapLatex(code: string, kind: MathKind): string {
  switch (kind) {
    case "block":
      // A block whose content is a single line is written on one line, like the display form; only
      // genuinely multi-line content is wrapped onto its own lines between the delimiters.
      return code.includes("\n") ? `\\[\n${code}\n\\]` : `\\[ ${code} \\]`;
    case "display":
      return `\\[ ${code} \\]`;
    case "inline":
      return `\\( ${code} \\)`;
  }
}

function wrapDollar(code: string, kind: MathKind): string {
  switch (kind) {
    case "block":
      // A block whose content is a single line is written on one line, like the display form; only
      // genuinely multi-line content is wrapped onto its own lines between the delimiters.
      return code.includes("\n") ? `$$\n${code}\n$$` : `$$${code}$$`;
    case "display":
      return `$$${code}$$`;
    case "inline":
      // The dollar-style single-line forms (`$x$`, `$$x$$`) never get inner padding:
      // the grammar forbids whitespace immediately inside `$` delimiters, so padding
      // them would make the result fail to re-parse as math.
      return `$${code}$`;
  }
}
