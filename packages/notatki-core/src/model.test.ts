import { test } from "node:test";
import { equal, isFalse, isTrue, like } from "rich-assert";
import { ModelMap } from "./model.ts";

test("model list", () => {
  like([...new ModelMap([])], []);
  like([...new ModelMap([ModelMap.basic])], [{ name: "Basic" }]);

  const types = new ModelMap();
  like(
    [...types],
    [
      { name: "Basic" },
      { name: "Basic (and reversed card)" },
      { name: "Basic (optional reversed card)" },
      { name: "Basic (type in the answer)" },
      { name: "Cloze" },
    ],
  );
  isFalse(types.has("abc"));
  equal(types.get("abc"), null);
  isTrue(types.has("basic"));
  isTrue(types.has("BASIC"));
  equal(types.get("basic"), types.get("BASIC"));
});
