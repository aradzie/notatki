import { test } from "node:test";
import { type NoteListItemNode } from "@notatki/parser";
import { equal } from "rich-assert";
import { loc } from "./nodes.ts";
import { printNoteNodes } from "./print-note-nodes.ts";

test("printNoteNodes prints a full note list structure", () => {
  const nodes: NoteListItemNode[] = [
    {
      type: "note",
      properties: [{ name: { text: "type", loc }, value: { text: "Basic", loc }, loc }],
      fields: [
        { name: { text: "front", loc }, value: { text: "Euler's Formula", loc }, loc },
        { name: { text: "back", loc }, value: { text: "line1\nline2", loc }, loc },
      ],
      end: { text: "~~~", loc },
      loc,
    },
    { type: "tombstone", id: { text: "abc123", loc }, loc },
  ];

  equal(
    printNoteNodes(nodes),
    [
      "!type: Basic",
      "",
      "!front: Euler's Formula",
      "!back:",
      "line1\nline2",
      "~~~",
      "",
      "!delete: abc123",
      "",
    ].join("\n"),
  );
});
