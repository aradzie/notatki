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
  equal(formatField("- Hello"), "<ul>\n<li>Hello</li>\n</ul>");
});
