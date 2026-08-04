import { test } from "node:test";
import { match } from "rich-assert";
import { katexBlock, katexInline } from "./katex.ts";

test("errors", () => {
  // Sometimes KaTeX throws errors even if throwOnError is false.
  // In such a case we should handle the errors ourselves.
  match(
    katexBlock(`\\begin{ }`, { throwOnError: false }),
    /Expected node of type textord, but got node of type spacing/,
  );
  match(
    katexInline(`\\begin{ }`, { throwOnError: false }),
    /Expected node of type textord, but got node of type spacing/,
  );
});
