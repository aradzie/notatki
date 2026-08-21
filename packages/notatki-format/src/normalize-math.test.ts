import { test } from "node:test";
import { equal } from "rich-assert";
import { normalizeMath } from "./normalize-math.ts";

test("default options trim code and preserve the original delimiter convention", () => {
  equal(normalizeMath("  x  ", "inlineMath"), "\\( x \\)");
  equal(normalizeMath("  x  ", "displayMath"), "\\[ x \\]");
  equal(normalizeMath("  x  ", "displayMathBlock"), "\\[ x \\]");
  equal(normalizeMath("  x  ", "inlineAltMath"), "$x$");
  equal(normalizeMath("  x  ", "displayAltMath"), "$$x$$");
  equal(normalizeMath("  x  ", "displayAltMathBlock"), "$$x$$");
});

test('{ delimiterStyle: "unchanged" } behaves like the default options', () => {
  const options = { delimiterStyle: "unchanged" } as const;
  equal(normalizeMath("  x  ", "inlineMath", options), "\\( x \\)");
  equal(normalizeMath("  x  ", "inlineAltMath", options), "$x$");
});

test('{ delimiterStyle: "latex" } forces LaTeX-style delimiters, including for dollar-style input', () => {
  const options = { delimiterStyle: "latex" } as const;
  equal(normalizeMath("  x  ", "inlineMath", options), "\\( x \\)");
  equal(normalizeMath("  x  ", "displayMath", options), "\\[ x \\]");
  equal(normalizeMath("  x  ", "displayMathBlock", options), "\\[ x \\]");
  equal(normalizeMath("  x  ", "inlineAltMath", options), "\\( x \\)");
  equal(normalizeMath("  x  ", "displayAltMath", options), "\\[ x \\]");
  equal(normalizeMath("  x  ", "displayAltMathBlock", options), "\\[ x \\]");
});

test('{ delimiterStyle: "dollar" } forces dollar-style delimiters, including for LaTeX-style input', () => {
  const options = { delimiterStyle: "dollar" } as const;
  equal(normalizeMath("  x  ", "inlineMath", options), "$x$");
  equal(normalizeMath("  x  ", "displayMath", options), "$$x$$");
  equal(normalizeMath("  x  ", "displayMathBlock", options), "$$x$$");
  equal(normalizeMath("  x  ", "inlineAltMath", options), "$x$");
  equal(normalizeMath("  x  ", "displayAltMath", options), "$$x$$");
  equal(normalizeMath("  x  ", "displayAltMathBlock", options), "$$x$$");
});

test("block-level math with single-line content is written on one line, like the display form", () => {
  equal(normalizeMath("x", "displayMathBlock"), "\\[ x \\]");
  equal(normalizeMath("x", "displayAltMathBlock"), "$$x$$");
  equal(normalizeMath("  x  ", "displayMathBlock"), "\\[ x \\]");
  equal(normalizeMath("\n  x  \n", "displayMathBlock"), "\\[ x \\]");
});

test("block-level math with multi-line content is wrapped onto its own lines", () => {
  equal(normalizeMath("x\ny", "displayMathBlock"), "\\[\nx\ny\n\\]");
  equal(normalizeMath("x\ny", "displayAltMathBlock"), "$$\nx\ny\n$$");
});

test("block-level math preserves each line's own leading indentation", () => {
  equal(normalizeMath("\n\n   a = 1\n   b = 2\n", "displayMathBlock"), "\\[\n   a = 1\n   b = 2\n\\]");
  equal(normalizeMath("  x\ny  ", "displayMathBlock"), "\\[\n  x\ny\n\\]");
});

test("block-level math strips only trailing spaces from each line and drops leading blank lines", () => {
  equal(normalizeMath("x  \n  y  ", "displayMathBlock"), "\\[\nx\n  y\n\\]");
  equal(normalizeMath("\n\nx\n  y", "displayMathBlock"), "\\[\nx\n  y\n\\]");
});

test("block-level math leaves interior blank lines and other lines' indentation untouched", () => {
  equal(normalizeMath("x\n\n  y", "displayMathBlock"), "\\[\nx\n\n  y\n\\]");
});

test("single-line-vs-multi-line only applies to block-level math, not inline or single-line display", () => {
  equal(normalizeMath("x\ny", "inlineMath"), "\\( x\ny \\)");
  equal(normalizeMath("x\ny", "displayMath"), "\\[ x\ny \\]");
});
