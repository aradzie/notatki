import { test } from "node:test";
import { match } from "rich-assert";
import { katexDisplay, katexInline } from "./katex.ts";

test("errors", () => {
  // Sometimes KaTeX throws errors even if throwOnError is false.
  // In such a case we should handle the errors ourselves.
  match(katexDisplay(`\\begin{ }`, { throwOnError: false }), /KaTeX parse error: No such environment/);
  match(katexInline(`\\begin{ }`, { throwOnError: false }), /KaTeX parse error: No such environment/);
});
