import { test } from "node:test";
import { like } from "rich-assert";
import { ModelMap } from "./model.js";
import { Note, NoteList } from "./note.js";
import { NoteParser } from "./note-parser.js";

test("parse models", () => {
  const parser = new NoteParser();

  parser.parseModels(
    "example.model",
    `
model Equation
id 123
field Front
field Back
field Extra?
card Card 1
front
~~~
back
~~~
styles
~~~
`,
  );

  like([...parser.errors], []);

  like(
    [...parser.notes.types],
    [
      { name: "Basic" },
      { name: "Basic (and reversed card)" },
      { name: "Basic (optional reversed card)" },
      { name: "Basic (type in the answer)" },
      { name: "Cloze" },
      {
        name: "Equation",
        id: 123,
        fields: [
          { name: "Front", required: true },
          { name: "Back", required: true },
          { name: "Extra", required: false },
        ],
      },
    ],
  );
});

test("model parsing error: syntax", () => {
  const parser = new NoteParser();

  parser.parseModels("example.model", ` omg`);

  like([...parser.errors], [{ message: 'Expected end of input or newline but "o" found.' }]);
});

test("model parsing error: duplicate model", () => {
  const parser = new NoteParser();

  parser.parseModels("example.model", `model One\nid 1\nmodel One\nid 2\n`);

  like([...parser.errors], [{ message: 'Duplicate model: "One"' }]);
});

test("model parsing error: duplicate field", () => {
  const parser = new NoteParser();

  parser.parseModels("example.model", `model One\nid 1\nfield Front\nfield Front\n`);

  like([...parser.errors], [{ message: 'Duplicate field: "Front"' }]);
});

test("parse notes", () => {
  const parser = new NoteParser();

  parser.parseNotes(
    "example.notes",
    `
!TYPE: basic
!DECK: example
!TAGS: tag1 tag2
!ID: 123
!BACK: 123-xyz
!FRONT: 123-abc
~~~
!id: 456
!back: 456-xyz
!front: 456-abc
~~~
`,
  );

  like([...parser.errors], []);
  like(
    [...parser.notes].map((note) => ({
      type: note.type,
      deck: note.deck,
      tags: note.tags,
      id: note.id,
      fields: [...note],
    })),
    [
      {
        type: { name: "Basic" },
        deck: "example",
        tags: "tag1 tag2",
        id: "123",
        fields: [
          { name: "Front", value: "123-abc" },
          { name: "Back", value: "123-xyz" },
        ],
      },
      {
        type: { name: "Basic" },
        deck: "example",
        tags: "tag1 tag2",
        id: "456",
        fields: [
          { name: "Front", value: "456-abc" },
          { name: "Back", value: "456-xyz" },
        ],
      },
    ],
  );
});

test("note parsing error: syntax", () => {
  const parser = new NoteParser();

  parser.parseNotes("example.notes", `!type: basic\n!front:1`);

  like([...parser.errors], [{ message: "Expected newline but end of input found." }]);
});

test("note parsing error: unknown note type", () => {
  const parser = new NoteParser();

  parser.parseNotes("example.notes", `!type: haha\n!a:1\n!b:2\n~~~\n`);

  like([...parser.errors], [{ message: 'Unknown note type: "haha"' }]);
});

test("note parsing error: unknown field", () => {
  const parser = new NoteParser();

  parser.parseNotes("example.notes", `!type: basic\n!a:1\n!b:2\n~~~\n`);

  like([...parser.errors], [{ message: 'Unknown field: "a"' }]);
});

test("note parsing error: duplicate field", () => {
  const parser = new NoteParser();

  parser.parseNotes("example.notes", `!type: basic\n!front:1\n!front:2\n~~~\n`);

  like([...parser.errors], [{ message: 'Duplicate field: "front"' }]);
});

test("note parsing error: duplicate id", () => {
  const a = new Note(ModelMap.basic);
  a.id = "123";
  a.set("front", "a b c");
  const b = new Note(ModelMap.basic);
  b.id = "123";
  b.set("front", " a  b  c ");
  const list = new NoteList();
  list.add(a);
  list.add(b);
  const parser = new NoteParser(list);

  parser.checkDuplicates();

  like(
    [...parser.errors],
    [
      { message: 'Duplicate ID: "123"' },
      { message: 'Duplicate ID: "123"' },
      { message: 'Duplicate note: "a b c"' },
      { message: 'Duplicate note: "a b c"' },
    ],
  );
});
