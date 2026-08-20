import { test } from "node:test";
import { Marked } from "marked";
import { equal } from "rich-assert";
import { mathExtension } from "./marked-math.ts";

test("smoke test", () => {
  equal(render(""), "");
});

test("ignored in html comments", () => {
  equal(render("<!-- \\(x\\) -->"), "<!-- \\(x\\) -->");
  equal(render("<!-- \\[x\\] -->"), "<!-- \\[x\\] -->");
  equal(render("<!-- $x$ -->"), "<!-- $x$ -->");
  equal(render("<!-- $$x$$ -->"), "<!-- $$x$$ -->");
});

test("ignored in html elements", () => {
  equal(render("<div>\\(x\\)</div>"), "<div>\\(x\\)</div>");
  equal(render("<div>\\[x\\]</div>"), "<div>\\[x\\]</div>");
  equal(render("<div>$x$</div>"), "<div>$x$</div>");
  equal(render("<div>$$x$$</div>"), "<div>$$x$$</div>");
});

test.todo("ignored in indented code blocks", () => {
  // todo indented code blocks
});

test("ignored in fenced code blocks", () => {
  equal(render("```\n\\(x\\)\n```"), "<pre><code>\\(x\\)\n</code></pre>");
  equal(render("```\n\\[x\\]\n```"), "<pre><code>\\[x\\]\n</code></pre>");
  equal(render("```\n$x$\n```"), "<pre><code>$x$\n</code></pre>");
  equal(render("```\n$$x$$\n```"), "<pre><code>$$x$$\n</code></pre>");
});

test("ignored in code spans", () => {
  equal(render("`\\(x\\)`"), "<p><code>\\(x\\)</code></p>");
  equal(render("`\\[x\\]`"), "<p><code>\\[x\\]</code></p>");
  equal(render("`$x$`"), "<p><code>$x$</code></p>");
  equal(render("`$$x$$`"), "<p><code>$$x$$</code></p>");
});

test("parsed inside headers", () => {
  equal(render("# a \\(x\\) b"), "<h1>a <im>x</im> b</h1>");
  equal(render("# a \\[x\\] b"), "<h1>a <dm>x</dm> b</h1>");
  equal(render("# a $x$ b"), "<h1>a <im>x</im> b</h1>");
  equal(render("# a $$x$$ b"), "<h1>a <dm>x</dm> b</h1>");
});

test("parsed inside paragraphs", () => {
  equal(render("a \\(x\\) b"), "<p>a <im>x</im> b</p>");
  equal(render("a \\[x\\] b"), "<p>a <dm>x</dm> b</p>");
  equal(render("a $x$ b"), "<p>a <im>x</im> b</p>");
  equal(render("a $$x$$ b"), "<p>a <dm>x</dm> b</p>");
});

test("parsed inside lists", () => {
  equal(render("- a \\(x\\) b"), "<ul>\n<li>a <im>x</im> b</li>\n</ul>");
  equal(render("- a \\[x\\] b"), "<ul>\n<li>a <dm>x</dm> b</li>\n</ul>");
  equal(render("- a $x$ b"), "<ul>\n<li>a <im>x</im> b</li>\n</ul>");
  equal(render("- a $$x$$ b"), "<ul>\n<li>a <dm>x</dm> b</li>\n</ul>");
});

test("parsed inside blockquotes", () => {
  equal(render("> a \\(x\\) b"), "<blockquote>\n<p>a <im>x</im> b</p>\n</blockquote>");
  equal(render("> a \\[x\\] b"), "<blockquote>\n<p>a <dm>x</dm> b</p>\n</blockquote>");
  equal(render("> a $x$ b"), "<blockquote>\n<p>a <im>x</im> b</p>\n</blockquote>");
  equal(render("> a $$x$$ b"), "<blockquote>\n<p>a <dm>x</dm> b</p>\n</blockquote>");
});

test("inline math", () => {
  equal(render("\\(x\\)"), "<p><im>x</im></p>");
  equal(render("a\\(x\\)b"), "<p>a<im>x</im>b</p>");
  equal(render("a\\(x\\)\\(y\\)b"), "<p>a<im>x</im><im>y</im>b</p>");
});

test("inline alt math", () => {
  equal(render("$x$"), "<p><im>x</im></p>");
  equal(render("a$x$b"), "<p>a<im>x</im>b</p>");
  equal(render("a$x$$y$b"), "<p>a<im>x</im><im>y</im>b</p>");
});

test("inline alt math rejects surrounding whitespace", () => {
  equal(render("$ x $"), "<p>$ x $</p>");
  equal(render("$x $"), "<p>$x $</p>");
  equal(render("$ x$"), "<p>$ x$</p>");
  equal(render("$ $"), "<p>$ $</p>");
  equal(render("the $ symbol and the $ sign"), "<p>the $ symbol and the $ sign</p>");
});

test("display math", () => {
  equal(render("\\[x\\]"), "<p><dm>x</dm></p>");
  equal(render("a\\[x\\]b"), "<p>a<dm>x</dm>b</p>");
  equal(render("a\\[x\\]\\[y\\]b"), "<p>a<dm>x</dm><dm>y</dm>b</p>");
});

test("display alt math", () => {
  equal(render("$$x$$"), "<p><dm>x</dm></p>");
  equal(render("a$$x$$b"), "<p>a<dm>x</dm>b</p>");
  equal(render("a$$x$$$$y$$b"), "<p>a<dm>x</dm><dm>y</dm>b</p>");
});

test("ignore escaped", () => {
  equal(render("\\\\(x\\)"), "<p>\\(x)</p>");
  equal(render("\\\\[x\\]"), "<p>\\[x]</p>");
  equal(render("\\\\(x\\\\)"), "<p>\\(x\\)</p>");
  equal(render("\\\\[x\\\\]"), "<p>\\[x\\]</p>");
});

test("ignore escaped alt", () => {
  equal(render("\\$x$"), "<p>$x$</p>");
  equal(render("\\$x\\$"), "<p>$x$</p>");
  equal(render("\\$\\$x$$"), "<p>$$x$$</p>");
  equal(render("\\$\\$x\\$\\$"), "<p>$$x$$</p>");
});

test("ambiguous alt", () => {
  equal(render("$"), "<p>$</p>");
  equal(render("$$"), "<p>$$</p>");
  equal(render("$$$"), "<p>$$$</p>");
  equal(render("$$$$"), "<p>$$$$</p>");
  equal(render("$$$$$"), "<p>$$$$$</p>");
  equal(render("$x"), "<p>$x</p>");
  equal(render("x$"), "<p>x$</p>");
  equal(render("$$x"), "<p>$$x</p>");
  equal(render("x$$"), "<p>x$$</p>");
  equal(render("$$x$"), "<p>$<im>x</im></p>");
  equal(render("$x$$"), "<p><im>x</im>$</p>");
  equal(render("$$$x$"), "<p>$$<im>x</im></p>");
  equal(render("$x$$$"), "<p><im>x</im>$$</p>");
  equal(render("$$$x$$"), "<p>$<dm>x</dm></p>");
  // A standalone line starting with `$$` is claimed by the top-priority display-math block rule
  // before the ambiguous dollar-counting inline logic ever runs. Since the block rule requires
  // its closing `$$` to be followed by nothing but whitespace, the only viable closing position
  // is the last two `$`s, pulling the middle `$` into the captured content.
  equal(render("$$x$$$"), "<p><dm>x$</dm></p>");
  equal(render("$$$x$$$"), "<p>$<dm>x</dm>$</p>");
  equal(render("$$$$x$$$$"), "<p>$$<dm>x</dm>$$</p>");
});

test("display math spans newlines", () => {
  equal(render("\\[x\ny\\]"), "<p><dm>x\ny</dm></p>");
  equal(render("$$x\ny$$"), "<p><dm>x\ny</dm></p>");
});

test("mid-line multiline display math is no longer parsed as math", () => {
  equal(render("a \\[x\ny\\] b"), "<p>a [x\ny] b</p>");
  equal(render("a $$x\ny$$ b"), "<p>a $$x\ny$$ b</p>");
});

test("multiline display math block survives embedded block-syntax lines", () => {
  equal(render("\\[\nx\n=\ny\n\\]"), "<p><dm>x\n=\ny</dm></p>");
  equal(render("\\[\n- x\n\\]"), "<p><dm>- x</dm></p>");
  equal(render("\\[\n> x\n\\]"), "<p><dm>> x</dm></p>");
});

test("multiline display math block interrupts a preceding paragraph without a blank line", () => {
  equal(render("intro\n\\[\nx\n\\]"), "<p>intro</p>\n<p><dm>x</dm></p>");
});

test("display math block requires only whitespace after the closing delimiter", () => {
  // Trailing whitespace on the closing line is fine.
  equal(render("\\[\nx\n\\]  "), "<p><dm>x</dm></p>");
  equal(render("$$\nx\n$$  "), "<p><dm>x</dm></p>");
  // Trailing non-whitespace text disqualifies it as a block. For a multi-line span, that means
  // no rule claims it at all (inline forbids newlines, block requires a clean closing line), so
  // it falls through to ordinary paragraph text.
  equal(render("\\[\nx\n\\] omg"), "<p>[\nx\n] omg</p>");
  equal(render("$$\nx\n$$ omg"), "<p>$$\nx\n$$ omg</p>");
  // For a single-line span, the (still newline-forbidding) inline rule picks it up instead.
  equal(render("\\[x\\] omg"), "<p><dm>x</dm> omg</p>");
  equal(render("$$x$$ omg"), "<p><dm>x</dm> omg</p>");
});

test("inline math does not span newlines", () => {
  equal(render("a \\(x\ny\\) b"), "<p>a (x\ny) b</p>");
  equal(render("a $x\ny$ b"), "<p>a $x\ny$ b</p>");
});

test("math content is not re-tokenized as markdown", () => {
  equal(render("\\(**bold**\\)"), "<p><im>**bold**</im></p>");
  equal(render("$**bold**$"), "<p><im>**bold**</im></p>");
  equal(render("\\[**bold**\\]"), "<p><dm>**bold**</dm></p>");
  equal(render("$$**bold**$$"), "<p><dm>**bold**</dm></p>");
  equal(render("\\[\n**bold**\n\\]"), "<p><dm>**bold**</dm></p>");
  equal(render("$$\n**bold**\n$$"), "<p><dm>**bold**</dm></p>");
  equal(
    render("\\[\n`code` and _em_ and [link](http://x)\n\\]"),
    "<p><dm>`code` and _em_ and [link](http://x)</dm></p>",
  );
});

function render(markdown: string): string {
  return new Marked()
    .use(
      mathExtension((code, type) => {
        switch (type) {
          case "displayMathBlock":
          case "displayAltMathBlock":
            return `<p><dm>${code.trim()}</dm></p>`;
          case "displayMath":
          case "displayAltMath":
            return `<dm>${code.trim()}</dm>`;
          case "inlineMath":
          case "inlineAltMath":
            return `<im>${code.trim()}</im>`;
        }
      }),
    )
    .parse(markdown, { async: false })
    .trim();
}
