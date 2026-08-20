import { test } from "node:test";
import { equal } from "rich-assert";
import { formatField } from "./format-field.ts";
import { renderMathAsHtml } from "./math-renderer.ts";
import { prettyPrintField } from "./pretty-print-field.ts";

test("smoke test", () => {
  equal(prettyPrintField(""), "");
  equal(prettyPrintField("\t\r\n"), "");
});

test("idempotent for already-normalized non-math markdown", () => {
  for (const text of [
    "Hello world.",
    "# Heading",
    "a *em* b",
    "a **strong** b",
    "a ~~del~~ b",
    "> quoted text",
    "- item one\n- item two",
    "| a | b |\n| - | - |\n| 1 | 2 |",
    "[a link](http://example.com)",
    "![alt](http://example.com/x.png)",
    "```\ncode\n```",
    "`inline code`",
  ]) {
    equal(prettyPrintField(text), text);
  }
});

test("idempotent for already-normalized math", () => {
  equal(prettyPrintField("a \\( x \\) b"), "a \\( x \\) b");
  equal(prettyPrintField("a \\[ x \\] b"), "a \\[ x \\] b");
  equal(prettyPrintField("a $x$ b"), "a $x$ b");
  equal(prettyPrintField("a$$x$$b"), "a$$x$$b");
  equal(prettyPrintField("\\[ x \\]"), "\\[ x \\]");
  equal(prettyPrintField("$$x$$"), "$$x$$");
  equal(prettyPrintField("\\[\nx\ny\n\\]"), "\\[\nx\ny\n\\]");
  equal(prettyPrintField("$$\nx\ny\n$$"), "$$\nx\ny\n$$");
});

test("rewrites each math type while leaving surrounding text untouched", () => {
  equal(prettyPrintField("a \\(  x  \\) b"), "a \\( x \\) b");
  equal(prettyPrintField("a \\[  x  \\] b"), "a \\[ x \\] b");
  equal(prettyPrintField("a $  x  $ b"), "a $  x  $ b"); // rejected: whitespace inside $ $ is not math
  equal(prettyPrintField("a$  x  $b"), "a$  x  $b"); // same
  equal(prettyPrintField("a$x$b"), "a$x$b");
  equal(prettyPrintField("a$$  x  $$b"), "a$$x$$b");
  equal(prettyPrintField("\\[\n  x  \n\\]"), "\\[ x \\]");
  equal(prettyPrintField("$$\n  x  \n$$"), "$$x$$");
});

test("multi-line block math keeps its content wrapped onto its own lines", () => {
  equal(prettyPrintField("\\[\n  x  \n  y  \n\\]"), "\\[\nx  \n  y\n\\]");
  equal(prettyPrintField("$$\n  x  \n  y  \n$$"), "$$\nx  \n  y\n$$");
});

test("rewrites math nested in headings, emphasis, strong, del", () => {
  equal(prettyPrintField("# Heading \\(  x  \\)"), "# Heading \\( x \\)");
  equal(prettyPrintField("a *em \\(  x  \\) text* b"), "a *em \\( x \\) text* b");
  equal(prettyPrintField("a **strong \\(  x  \\) text** b"), "a **strong \\( x \\) text** b");
  equal(prettyPrintField("a ~~del \\(  x  \\) text~~ b"), "a ~~del \\( x \\) text~~ b");
});

test("rewrites math in blockquotes", () => {
  equal(prettyPrintField("> quoted \\(  x  \\) math"), "> quoted \\( x \\) math");
  equal(prettyPrintField("> line1 \\(  x  \\)\n> line2"), "> line1 \\( x \\)\n> line2");
});

test("file-format.md: single-line \\[x\\] falls back to inline math", () => {
  equal(prettyPrintField("\\[x\\] omg"), "\\[ x \\] omg");
});

test("file-format.md: multi-line \\[ \\] with trailing prose matches neither form and stays untouched", () => {
  equal(prettyPrintField("\\[\nx\n\\] omg"), "\\[\nx\n\\] omg");
});

test("file-format.md: block math survives embedded block-syntax-like lines", () => {
  // Single-line content collapses to the single-line form regardless of what it looks like; the
  // math content itself is still preserved literally, not re-parsed as markdown.
  equal(prettyPrintField("\\[\n- x\n\\]"), "\\[ - x \\]");
  equal(prettyPrintField("\\[\n> x\n\\]"), "\\[ > x \\]");
  // Genuinely multi-line content stays wrapped onto its own lines.
  equal(prettyPrintField("\\[\nx\n=\ny\n\\]"), "\\[\nx\n=\ny\n\\]");
  equal(prettyPrintField("\\[\n- x\n- y\n\\]"), "\\[\n- x\n- y\n\\]");
  equal(prettyPrintField("\\[\n> x\n> y\n\\]"), "\\[\n> x\n> y\n\\]");
});

test("file-format.md: currency text is never misread as math", () => {
  equal(prettyPrintField("the $ symbol"), "the $ symbol");
  equal(prettyPrintField("$5 and $10"), "$5 and $10");
});

test("rewrites math nested in a list item", () => {
  equal(prettyPrintField("- item \\(  x  \\)"), "- item \\( x \\)");
});

test("math nested in a table cell is left untouched", () => {
  equal(prettyPrintField("| a |\n| - |\n| \\(  x  \\) |"), "| a |\n| - |\n| \\(  x  \\) |");
});

test("math nested in a link label or image alt text is left untouched", () => {
  equal(prettyPrintField("[a \\(  x  \\) link](http://example.com)"), "[a \\(  x  \\) link](http://example.com)");
  equal(
    prettyPrintField("![a \\(  x  \\) alt](http://example.com/x.png)"),
    "![a \\(  x  \\) alt](http://example.com/x.png)",
  );
});

test("preserves whitespace between math blocks", () => {
  equal(prettyPrintField("\\[u\nv\\]\n\n\\[x\ny\\]"), "\\[\nu\nv\n\\]\n\n\\[\nx\ny\n\\]");
});

test("rewrites em, strong, del", () => {
  equal(prettyPrintField("*em \\(  x  \\) x*"), "*em \\( x \\) x*");
  equal(prettyPrintField("_em \\(  x  \\) x_"), "*em \\( x \\) x*");
  equal(prettyPrintField("**strong \\(  x  \\) x**"), "**strong \\( x \\) x**");
  equal(prettyPrintField("__strong \\(  x  \\) x__"), "**strong \\( x \\) x**");
  equal(prettyPrintField("~~del \\(  x  \\) x~~"), "~~del \\( x \\) x~~");
});

test("rewrites headers", () => {
  equal(prettyPrintField("#  Heading \\(  x  \\)"), "# Heading \\( x \\)");
  equal(prettyPrintField("Heading \\(  x  \\)   \n==="), "# Heading \\( x \\)");
  equal(prettyPrintField("#  Heading \\(  x  \\)  #"), "# Heading \\( x \\)");
});

test("rewrites blockquotes", () => {
  equal(prettyPrintField("> line1 \\(  x  \\)\n"), "> line1 \\( x \\)");
  equal(prettyPrintField("> line1 \\(  x  \\)\n>> line2"), "> line1 \\( x \\)\n" + "> > line2");
});

test("collapses runs of blank lines between blocks to exactly one", () => {
  equal(prettyPrintField("a\n\n\nb"), "a\n\nb");
  equal(prettyPrintField("a\n\n\n\n\nb"), "a\n\nb");
  equal(prettyPrintField("# Heading\n\n\n\nparagraph"), "# Heading\n\nparagraph");
  equal(prettyPrintField("para one\n\n\n> quoted"), "para one\n\n> quoted");
  equal(prettyPrintField("- item one\n\n\n\nparagraph"), "- item one\n\nparagraph");
});

test("does not introduce a blank line where a block was directly adjacent", () => {
  equal(prettyPrintField("> line1 \\(  x  \\)\n>> line2"), "> line1 \\( x \\)\n" + "> > line2");
});

test("options.delimiterStyle forces a single delimiter convention across the whole field", () => {
  const text = "a $x$ b \\( y \\) c\n\n> quoted \\( z \\) math";
  equal(prettyPrintField(text, { delimiterStyle: "latex" }), "a \\( x \\) b \\( y \\) c\n\n> quoted \\( z \\) math");
  equal(prettyPrintField(text, { delimiterStyle: "dollar" }), "a $x$ b $y$ c\n\n> quoted $z$ math");
  equal(prettyPrintField(text, { delimiterStyle: "unchanged" }), text);
  equal(prettyPrintField(text), text);
});

test("canonicalizes bullet markers to -", () => {
  equal(prettyPrintField("* item one\n* item two"), "- item one\n- item two");
  equal(prettyPrintField("+ item one\n+ item two"), "- item one\n- item two");
});

test("canonicalizes ordered delimiters to .", () => {
  equal(prettyPrintField("1) a\n2) b"), "1. a\n2. b");
});

test("ordered lists preserve a non-1 start", () => {
  equal(prettyPrintField("5. a\n6. b"), "5. a\n6. b");
});

test("ordered lists renumber irregular source numbering sequentially", () => {
  equal(prettyPrintField("1. a\n1. b\n1. c"), "1. a\n2. b\n3. c");
});

test("reconstructs nested lists", () => {
  equal(prettyPrintField("- a\n  - b\n  - c\n- d"), "- a\n  - b\n  - c\n- d");
  equal(prettyPrintField("* a\n  * b\n* c"), "- a\n  - b\n- c");
  equal(prettyPrintField("- a\n  1. b\n  2. c"), "- a\n  1. b\n  2. c");
  equal(prettyPrintField("1. a\n   - b\n   - c"), "1. a\n   - b\n   - c");
});

test("ordered list continuation indent widens for two-digit items", () => {
  equal(prettyPrintField("9. a\n10. b\n    - nested"), "9. a\n10. b\n    - nested");
});

test("preserves loose vs tight list spacing", () => {
  equal(prettyPrintField("- a\n- b"), "- a\n- b");
  equal(prettyPrintField("- a\n\n- b"), "- a\n\n- b");
});

test("reconstructs task list checkboxes", () => {
  equal(prettyPrintField("- [ ] a\n- [x] b"), "- [ ] a\n- [x] b");
  equal(prettyPrintField("- [ ] a\n\n- [x] b"), "- [ ] a\n\n- [x] b");
});

test("reconstructs multi-line block math inside a list item", () => {
  equal(prettyPrintField("- \\[\n  x\n  y\n  \\]"), "- \\[\n  x\n  y\n  \\]");
  equal(prettyPrintField("- $$\n  x\n  y\n  $$"), "- $$\n  x\n  y\n  $$");
});

test("collapses single-line block math inside a list item, normalizing padding", () => {
  equal(prettyPrintField("- \\[\n  x  \n  \\]"), "- \\[ x \\]");
  equal(prettyPrintField("- $$\n  x  \n  $$"), "- $$x$$");
});

test("rewrites math nested in a blockquote nested in a list item", () => {
  equal(prettyPrintField("- > quoted \\(  x  \\)\n  > line2\n- item2"), "- > quoted \\( x \\)\n  > line2\n- item2");
});

test("options.delimiterStyle applies to math nested in a list item", () => {
  equal(prettyPrintField("- \\( x \\)", { delimiterStyle: "dollar" }), "- $x$");
  equal(prettyPrintField("- $x$", { delimiterStyle: "latex" }), "- \\( x \\)");
});

test("pretty-printing never changes rendered HTML output", () => {
  const math = renderMathAsHtml();
  for (const text of [
    "Hello",
    "# Heading with \\(  x + 1  \\) math",
    "> quoted \\(  x + 1  \\) math",
    "a *em \\(x\\) text* b",
    "\\[\nx = 1\n\\]",
    "$$\nx = 1\n$$",
    "the $5 and $10",
    "\\[x\\] omg",
    "- item \\(x\\)",
    "- a\n  1. b\n  2. c",
    "- [ ] a\n- [x] b",
    "- \\[\nx\ny\n\\]",
    "| a |\n| - |\n| \\(x\\) |",
  ]) {
    equal(formatField(prettyPrintField(text), math), formatField(text, math));
  }
});
