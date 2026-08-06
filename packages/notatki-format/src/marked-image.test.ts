import { test } from "node:test";
import { equal } from "rich-assert";
import { formatField } from "./format-field.ts";
import { resolveWithBaseUri } from "./marked-image.ts";

test("image without a resolver is left as-is", () => {
  equal(formatField("![alt](foo.png)"), '<p><img src="foo.png" alt="alt"></p>');
});

test("relative image path is resolved against base uri", () => {
  equal(
    formatField("![alt](foo.png)", undefined, resolveWithBaseUri("https://example.test/notes/")),
    '<p><img src="https://example.test/notes/foo.png" alt="alt"></p>',
  );
  equal(
    formatField("![alt](./images/foo.png)", undefined, resolveWithBaseUri("https://example.test/notes/")),
    '<p><img src="https://example.test/notes/images/foo.png" alt="alt"></p>',
  );
  equal(
    formatField("![alt](../assets/foo.png)", undefined, resolveWithBaseUri("https://example.test/notes/sub/")),
    '<p><img src="https://example.test/notes/assets/foo.png" alt="alt"></p>',
  );
});

test("base uri is a full path to the note file", () => {
  equal(
    formatField("![alt](foo.png)", undefined, resolveWithBaseUri("https://example.test/notes/example.note")),
    '<p><img src="https://example.test/notes/foo.png" alt="alt"></p>',
  );
});

test("filesystem-absolute image path is resolved against the base uri origin", () => {
  equal(
    formatField("![alt](/assets/foo.png)", undefined, resolveWithBaseUri("https://example.test/notes/sub/")),
    '<p><img src="https://example.test/assets/foo.png" alt="alt"></p>',
  );
});

test("images with a scheme are passed through unchanged", () => {
  equal(
    formatField("![alt](https://cdn.test/foo.png)", undefined, resolveWithBaseUri("https://example.test/notes/")),
    '<p><img src="https://cdn.test/foo.png" alt="alt"></p>',
  );
  equal(
    formatField("![alt](data:image/png;base64,AAAA)", undefined, resolveWithBaseUri("https://example.test/notes/")),
    '<p><img src="data:image/png;base64,AAAA" alt="alt"></p>',
  );
});

test("custom resolve callback is used as-is", () => {
  equal(
    formatField("![alt](foo.png)", undefined, () => "resolved.png"),
    '<p><img src="resolved.png" alt="alt"></p>',
  );
});
