import { test } from "node:test";
import { equal } from "rich-assert";
import { resolveWithBaseUri } from "./marked-image.ts";
import { renderMarkdown } from "./render-markdown.ts";
import { imageHrefExtension } from "./render-markdown-image.ts";

test("relative image path is resolved against the base uri", () => {
  const extension = imageHrefExtension(resolveWithBaseUri("https://example.test/notes/"));
  equal(
    renderMarkdown("before ![alt](foo.png) after", [extension]),
    "before ![alt](https://example.test/notes/foo.png) after",
  );
});

test("an image whose href the resolver leaves unchanged is left byte-exact", () => {
  const extension = imageHrefExtension(() => "foo.png");
  equal(renderMarkdown("![alt](foo.png)", [extension]), "![alt](foo.png)");
});

test("a title is preserved when the href is rewritten", () => {
  const extension = imageHrefExtension(() => "new.png");
  equal(renderMarkdown('![alt](foo.png "a title")', [extension]), '![alt](new.png "a title")');
});

test("non-image tokens are untouched", () => {
  const extension = imageHrefExtension(() => "new.png");
  equal(renderMarkdown("# Heading\n\nSome **bold** text.", [extension]), "# Heading\n\nSome **bold** text.");
});

test("images with a scheme are passed through unchanged", () => {
  const extension = imageHrefExtension(resolveWithBaseUri("https://example.test/notes/"));
  equal(renderMarkdown("![alt](https://cdn.test/foo.png)", [extension]), "![alt](https://cdn.test/foo.png)");
});
