import { test } from "node:test";
import { equal } from "rich-assert";
import { formatField } from "./format-field.ts";

test("format empty", () => {
  equal(formatField(""), "");
  equal(formatField("\t\r\n"), "");
});

test("format text", () => {
  equal(formatField("Hello"), "<p>Hello</p>");
  equal(formatField("# Hello"), "<h1>Hello</h1>");
});

test("find inline math", () => {
  equal(formatField("\\(x\\)"), "<p>\\( x \\)</p>");
  equal(formatField("a\\(x\\)b"), "<p>a\\( x \\)b</p>");
  equal(formatField("a\\(x\\)\\(y\\)b"), "<p>a\\( x \\)\\( y \\)b</p>");
  equal(formatField("\\({x\\)"), "<p>({x)</p>"); // Unbalanced "{".
});

test("find inline math alt", () => {
  equal(formatField("$x$"), "<p>\\( x \\)</p>");
  equal(formatField("a$x$b"), "<p>a\\( x \\)b</p>");
  equal(formatField("a$x$$y$b"), "<p>a\\( x \\)\\( y \\)b</p>");
  equal(formatField("${x$"), "<p>${x$</p>"); // Unbalanced "{".
});

test("find block math", () => {
  equal(formatField("\\[x\\]"), "\\[ x \\]");
  equal(formatField("a\\[x\\]b"), "<p>a</p>\n\\[ x \\]\n<p>b</p>");
  equal(formatField("a\\[x\\]\\[y\\]b"), "<p>a</p>\n\\[ x \\]\n\\[ y \\]\n<p>b</p>");
  equal(formatField("\\[{x\\]"), "<p>[{x]</p>"); // Unbalanced "{".
});

test("find block math alt", () => {
  equal(formatField("$$x$$"), "\\[ x \\]");
  equal(formatField("a$$x$$b"), "<p>a</p>\n\\[ x \\]\n<p>b</p>");
  equal(formatField("a$$x$$$$y$$b"), "<p>a</p>\n\\[ x \\]\n\\[ y \\]\n<p>b</p>");
  equal(formatField("$${x$$"), "<p>$${x$$</p>"); // Unbalanced "{".
});

test("escaped alt", () => {
  equal(formatField("\\$x$"), "<p>$x$</p>");
  equal(formatField("$x\\$"), "<p>$x$</p>");
  equal(formatField("\\$x\\$"), "<p>$x$</p>");
  equal(formatField("\\$\\$x$$"), "<p>$$x$$</p>");
  equal(formatField("$$x\\$\\$"), "<p>$$x$$</p>");
  equal(formatField("\\$\\$x\\$\\$"), "<p>$$x$$</p>");
});

test("ambiguous alt", () => {
  equal(formatField("$"), "<p>$</p>");
  equal(formatField("$$"), "<p>$$</p>");
  equal(formatField("$$$"), "<p>$$$</p>");
  equal(formatField("$$$$"), "<p>$$$$</p>");
  equal(formatField("$$$$$"), "<p>$$$$$</p>");
  equal(formatField("$x"), "<p>$x</p>");
  equal(formatField("x$"), "<p>x$</p>");
  equal(formatField("$$x"), "<p>$$x</p>");
  equal(formatField("x$$"), "<p>x$$</p>");
  equal(formatField("$$x$"), "<p>$\\( x \\)</p>");
  equal(formatField("$x$$"), "<p>\\( x \\)$</p>");
  equal(formatField("$$$x$"), "<p>$$\\( x \\)</p>");
  equal(formatField("$x$$$"), "<p>\\( x \\)$$</p>");
  equal(formatField("$$$x$$"), "<p>$</p>\n\\[ x \\]");
  equal(formatField("$$x$$$"), "\\[ x \\]\n<p>$</p>");
  equal(formatField("$$$x$$$"), "<p>$</p>\n\\[ x \\]\n<p>$</p>");
  equal(formatField("$$$$x$$$$"), "<p>$$</p>\n\\[ x \\]\n<p>$$</p>");
});
