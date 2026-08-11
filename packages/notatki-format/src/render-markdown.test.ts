import { test } from "node:test";
import { equal, throws } from "rich-assert";
import { type RendererExtension, renderMarkdown } from "./render-markdown.ts";

test("no extensions reproduces the input exactly", () => {
  const inputs = [
    "Hello, *world*!",
    "# Heading\n\nSome __bold__ and _italic_ text, and `code`.",
    "> a quote\n> spanning two lines\n",
    "- one\n- two\n- three\n",
    "1. one\n2. two\n",
    "[a link](https://example.test)",
    '![alt](foo.png "a title")',
    "```js\nconst x = 1;\n```\n",
    "a | b\n--- | ---\n1 | 2\n",
    "$x + y$ and \\[ z \\]",
  ];
  for (const input of inputs) {
    equal(renderMarkdown(input), input);
  }
});

test("an override on a top-level token replaces it", () => {
  const shout: RendererExtension = {
    text(token) {
      return token.text.toUpperCase();
    },
  };
  equal(renderMarkdown("hello", [shout]), "HELLO");
});

test("an override deep inside a paragraph only touches that token", () => {
  const rewriteHref: RendererExtension = {
    image(token) {
      return `![${token.text}](new.png)`;
    },
  };
  equal(renderMarkdown("before ![alt](old.png) after", [rewriteHref]), "before ![alt](new.png) after");
});

test("an override inside a link is spliced back in, preserving the link", () => {
  const rewriteHref: RendererExtension = {
    image(token) {
      return `![${token.text}](new.png)`;
    },
  };
  equal(renderMarkdown("[![alt](old.png)](target.html)", [rewriteHref]), "[![alt](new.png)](target.html)");
});

test("an override inside a single-line list item preserves the list markers", () => {
  const rewriteHref: RendererExtension = {
    image(token) {
      return `![${token.text}](new.png)`;
    },
  };
  equal(renderMarkdown("- one ![alt](old.png)\n- two\n", [rewriteHref]), "- one ![alt](new.png)\n- two\n");
});

test("an override inside a single-line blockquote preserves the quote marker", () => {
  const rewriteHref: RendererExtension = {
    image(token) {
      return `![${token.text}](new.png)`;
    },
  };
  equal(renderMarkdown("> quote ![alt](old.png) text\n", [rewriteHref]), "> quote ![alt](new.png) text\n");
});

test("an unhandled override returning false leaves the token unchanged", () => {
  const noop: RendererExtension = {
    image() {
      return false;
    },
  };
  equal(renderMarkdown("![alt](old.png)", [noop]), "![alt](old.png)");
});

test("a change nested inside a multi-line blockquote throws", () => {
  const rewriteHref: RendererExtension = {
    image(token) {
      return `![${token.text}](new.png)`;
    },
  };
  throws(() => renderMarkdown("> line one\n> line two ![alt](old.png)\n", [rewriteHref]));
});

test("a change nested inside a table cell throws", () => {
  const rewriteHref: RendererExtension = {
    image(token) {
      return `![${token.text}](new.png)`;
    },
  };
  throws(() => renderMarkdown("a | b\n--- | ---\n![alt](old.png) | 2\n", [rewriteHref]));
});

test("later extensions take priority over earlier ones for the same token type", () => {
  const first: RendererExtension = { text: () => "first" };
  const second: RendererExtension = { text: () => "second" };
  equal(renderMarkdown("x", [first, second]), "second");
});
