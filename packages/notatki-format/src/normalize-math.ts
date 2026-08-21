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
  const trimmedCode = trimMathCode(code, kind);
  switch (options.delimiterStyle) {
    case "unchanged":
      return isDollarType(type) ? wrapDollar(trimmedCode, kind) : wrapLatex(trimmedCode, kind);
    case "latex":
      return wrapLatex(trimmedCode, kind);
    case "dollar":
      return wrapDollar(trimmedCode, kind);
  }
}

/**
 * Trims math source text, preserving the indentation of multiline block content.
 *
 * Only "block" math can span multiple lines, so other kinds are trimmed normally. For block
 * content, the steps are: strip all trailing whitespace (including newlines) from the whole
 * text; split into lines; strip trailing spaces from each line; drop leading empty lines. This
 * leaves each line's own leading indentation untouched, which is what actually distinguishes a
 * multi-line formula's structure (e.g. an `align` environment's body vs. its `\begin`/`\end`).
 */
function trimMathCode(code: string, kind: MathKind): string {
  if (kind !== "block") {
    return code.trim();
  }

  const result = code
    .trimEnd()
    .split("\n")
    .map((line) => line.trimEnd())
    .reduce((prev, curr) => (prev ? prev + "\n" + curr : curr), "");

  // Content that's only ever one substantive line (just surrounded by blank padding lines)
  // isn't really multi-line at all; collapse it the same way as any other single-line math.
  return result.includes("\n") ? result : result.trim();
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
