import { test } from "node:test";
import { equal } from "rich-assert";
import { renderTex } from "./math-renderer.ts";

test("renderTex escapes html special chars", () => {
  const renderer = renderTex();
  equal(renderer.inline("a & b > c"), "\\( a &amp; b &gt; c \\)");
  equal(renderer.display("a & b > c"), "\\[ a &amp; b &gt; c \\]");
});
