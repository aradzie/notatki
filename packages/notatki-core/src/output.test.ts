import { test } from "node:test";
import { deepEqual } from "rich-assert";
import { reindentLines } from "./output.ts";

test("reindentLines works on an empty list of lines", () => {
  deepEqual(reindentLines([], 2), []);
});

test("reindentLines works on a single line", () => {
  deepEqual(reindentLines(["    a"], 2), ["  a"]);
});

test("reindentLines dedents by the shortest common prefix, then applies the new indent", () => {
  deepEqual(reindentLines(["    a", "      b", "    c"], 2), ["  a", "    b", "  c"]);
});

test("reindentLines with indent 0 just dedents", () => {
  deepEqual(reindentLines(["    a", "      b", "    c"], 0), ["a", "  b", "c"]);
});

test("reindentLines ignores blank/whitespace-only lines when computing the common prefix, and leaves them empty", () => {
  deepEqual(reindentLines(["    a", "", "   ", "    b"], 2), ["  a", "", "", "  b"]);
});

test("reindentLines bails out and returns the lines unchanged if any leading whitespace has a tab", () => {
  const lines = ["\ta", "  b"];

  deepEqual(reindentLines(lines, 2), lines);
});
