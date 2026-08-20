import { test } from "node:test";
import { equal } from "rich-assert";
import { formatField } from "./format-field.ts";
import { renderMathInHtml } from "./math-renderer.ts";

test("format", () => {
  const math = renderMathInHtml();
  equal(formatField("", math), "");
  equal(formatField("\t\r\n", math), "");
  equal(formatField("Hello", math), "<p>Hello</p>");
  equal(formatField("# Hello", math), "<h1>Hello</h1>");
  equal(formatField("- Hello", math), "<ul>\n<li>Hello</li>\n</ul>");
  equal(formatField("\\[x=1\\]", math), "<p>\\[ x=1 \\]</p>");
});
