import { test } from "node:test";
import { ModelMap, Note, NoteList } from "@notatki/core";
import { match } from "rich-assert";
import { generatePreview } from "./preview.ts";

test("generate preview", () => {
  const notes = new NoteList();
  const note = new Note(ModelMap.basic);
  note.set("front", "QUESTION");
  note.set("back", "ANSWER");
  notes.add(note);
  const html = generatePreview(notes, {
    title: "Test Preview",
    showDetails: true,
    showFront: true,
    showBack: true,
  });
  match(html, /Test Preview/);
  match(html, /QUESTION/);
  match(html, /ANSWER/);
});
