import { test } from "node:test";
import { type ModelNode } from "@notatki/parser";
import { equal } from "rich-assert";
import { loc } from "./nodes.ts";
import { printModelNodes } from "./print-model-nodes.ts";

test("printModelNodes prints a full model structure", () => {
  const nodes: ModelNode[] = [
    {
      name: { text: "Basic Math", loc },
      cloze: { text: "cloze", loc },
      fields: [
        { name: { text: "Front", loc }, required: true, loc },
        { name: { text: "Back", loc }, required: true, loc },
        { name: { text: "Extra", loc }, required: false, loc },
      ],
      cards: [
        {
          name: { text: "Card 1", loc },
          front: { text: "<div>F</div>", loc },
          back: { text: "<div>B</div>", loc },
          loc,
        },
      ],
      styles: { text: ".c { color: red; }", loc },
      loc,
    },
  ];

  equal(
    printModelNodes(nodes),
    [
      "model Basic Math",
      "",
      "cloze",
      "",
      "field Front",
      "field Back",
      "field Extra?",
      "",
      "card Card 1",
      "",
      "front",
      "<div>F</div>",
      "~~~",
      "",
      "back",
      "<div>B</div>",
      "~~~",
      "",
      "styles",
      ".c { color: red; }",
      "~~~",
      "",
    ].join("\n"),
  );
});
