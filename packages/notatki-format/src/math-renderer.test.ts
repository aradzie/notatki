import { test } from "node:test";
import { equal } from "rich-assert";
import { renderMathInHtml } from "./math-renderer.ts";

test("renderMathInHtml escapes html special chars", () => {
  const math = renderMathInHtml();
  equal(math.inline("a & b > c"), "\\( a &amp; b &gt; c \\)");
  equal(math.display("a & b > c"), "\\[ a &amp; b &gt; c \\]");
});
