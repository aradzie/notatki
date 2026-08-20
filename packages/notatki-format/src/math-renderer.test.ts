import { test } from "node:test";
import { equal } from "rich-assert";
import { renderMathInHtml } from "./math-renderer.ts";

test("renderMathInHtml escapes html special chars", () => {
  const math = renderMathInHtml();
  equal(math("a & b > c", "inlineMath"), "\\( a &amp; b &gt; c \\)");
  equal(math("a & b > c", "displayMath"), "\\[ a &amp; b &gt; c \\]");
});
