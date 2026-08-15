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
  equal(render("$$x$$$"), "<p><dm>x</dm>$</p>");
  equal(render("$$$x$$$"), "<p>$<dm>x</dm>$</p>");
  equal(render("$$$$x$$$$"), "<p>$$<dm>x</dm>$$</p>");
});

test("display math spans newlines", () => {
  equal(render("a \\[x\ny\\] b"), "<p>a <dm>x\ny</dm> b</p>");
  equal(render("a $$x\ny$$ b"), "<p>a <dm>x\ny</dm> b</p>");
});

test("inline math does not span newlines", () => {
  equal(render("a \\(x\ny\\) b"), "<p>a (x\ny) b</p>");
  equal(render("a $x\ny$ b"), "<p>a $x\ny$ b</p>");
});

function render(markdown: string): string {
  return new Marked()
    .use(
      mathExtension({
        display: (code) => `<dm>${code.trim()}</dm>`,
        inline: (code) => `<im>${code.trim()}</im>`,
      }),
    )
    .parse(markdown, { async: false })
    .trim();
}
