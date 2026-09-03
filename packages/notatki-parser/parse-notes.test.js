import { test } from "node:test";
import { like, throws } from "rich-assert";
import { parseNoteList } from "./parser.js";

test("parse whitespace", () => {
  like(parseNoteList(""), []);
  like(parseNoteList(" "), []);
  like(parseNoteList("\t"), []);
  like(parseNoteList(" \n"), []);
  like(parseNoteList("\t\n"), []);
  like(parseNoteList(" \n \n \n "), []);
  like(parseNoteList("\t\n\t\n\t\n\t"), []);
  like(parseNoteList("!a:1\n~~~\n"), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("!a:1\n~~~\n\n"), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("!a:1\n~~~ \n \n"), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("!a:1\n~~~ \n \n "), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("!a:1\n~~~\t\n\t\n\t"), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("\n!a:1\n~~~\t\n\t\n\t"), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("\n \n!a:1\n~~~\t\n\t\n\t"), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("\n\t\n!a:1\n~~~\t\n\t\n\t"), [{ fields: [{ name: { text: "a" } }] }]);
  like(parseNoteList("\n\t\n!a:1\n~~~\n!a:2\n~~~\t\n\t\n\t"), [
    { fields: [{ name: { text: "a" }, value: { text: "1" } }] },
    { fields: [{ name: { text: "a" }, value: { text: "2" } }] },
  ]);
  like(parseNoteList("\n\t\n!a:1\n~~~ \t \n!a: \t 1 \t \n \t \n \t 2 \t \n \t \n\n~~~\t\n\t\n\t"), [
    { fields: [{ name: { text: "a" }, value: { text: "1" } }] },
    { fields: [{ name: { text: "a" }, value: { text: "1\n\n \t 2" } }] },
  ]);
});

test("parse cr lf", () => {
  like(parseNoteList("\r\n!a:1\r\n!b:2\r\n~~~\r\n"), [
    {
      fields: [
        { name: { text: "a" }, value: { text: "1" } },
        { name: { text: "b" }, value: { text: "2" } },
      ],
    },
  ]);
});

test("parse properties", () => {
  like(parseNoteList("!tags:x\n!a:1\n~~~\n"), [
    {
      properties: [{ name: { text: "tags" }, value: { text: "x" } }],
      fields: [{ name: { text: "a" } }],
    },
  ]);
  like(parseNoteList("!Tags:x\n!a:1\n~~~\n"), [
    {
      properties: [{ name: { text: "tags" }, value: { text: "x" } }],
      fields: [{ name: { text: "a" } }],
    },
  ]);
  like(parseNoteList("!TAGS:x\n!a:1\n~~~\n"), [
    {
      properties: [{ name: { text: "tags" }, value: { text: "x" } }],
      fields: [{ name: { text: "a" } }],
    },
  ]);
  like(parseNoteList("!deck:a\n \n!tags:b\n \n!a:1\n~~~\n"), [
    {
      properties: [
        { name: { text: "deck" }, value: { text: "a" } },
        { name: { text: "tags" }, value: { text: "b" } },
      ],
      fields: [{ name: { text: "a" } }],
    },
  ]);
});

test("parse field names", () => {
  like(parseNoteList("!a:1\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a", loc: { start: { offset: 0 }, end: { offset: 3 } } },
          value: { text: "1" },
        },
      ],
    },
  ]);
  like(parseNoteList("!a b:1\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a b", loc: { start: { offset: 0 }, end: { offset: 5 } } },
          value: { text: "1" },
        },
      ],
    },
  ]);
  like(parseNoteList("!A_B \t C \t 0-9:1\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "A_B C 0-9", loc: { start: { offset: 0 }, end: { offset: 15 } } },
          value: { text: "1" },
        },
      ],
    },
  ]);
});

test("parse field values", () => {
  like(parseNoteList("!a:\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a" },
          value: { text: "", loc: { start: { offset: 3 }, end: { offset: 3 } } },
        },
      ],
    },
  ]);
  like(parseNoteList("!a: \t \n\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a" },
          value: { text: "", loc: { start: { offset: 6 }, end: { offset: 7 } } },
        },
      ],
    },
  ]);
  like(parseNoteList("!a:abc\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a" },
          value: { text: "abc", loc: { start: { offset: 3 }, end: { offset: 6 } } },
        },
      ],
    },
  ]);
  like(parseNoteList("!a: \t abc \n\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a" },
          value: { text: "abc", loc: { start: { offset: 6 }, end: { offset: 11 } } },
        },
      ],
    },
  ]);
  like(parseNoteList("!a:abc\nxyz\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a" },
          value: { text: "abc\nxyz", loc: { start: { offset: 3 }, end: { offset: 10 } } },
        },
      ],
    },
  ]);
  like(parseNoteList("!a: \t abc\nxyz \n\n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a" },
          value: { text: "abc\nxyz", loc: { start: { offset: 6 }, end: { offset: 15 } } },
        },
      ],
    },
  ]);
  like(parseNoteList("!a: \t abc\nxyz \n \n~~~\n"), [
    {
      fields: [
        {
          name: { text: "a" },
          value: { text: "abc\nxyz", loc: { start: { offset: 6 }, end: { offset: 16 } } },
        },
      ],
    },
  ]);
});

test("report errors", () => {
  throws(
    () => {
      parseNoteList(" x");
    },
    { message: 'Expected end of input or newline but "x" found.' },
  );
  throws(
    () => {
      parseNoteList(" \n x");
    },
    { message: 'Expected end of input or newline but "x" found.' },
  );
  throws(
    () => {
      parseNoteList("!a:abc");
    },
    { message: "Expected newline but end of input found." },
  );
  throws(
    () => {
      parseNoteList("!a:abc\n x");
    },
    { message: "Expected newline but end of input found." },
  );
  throws(
    () => {
      parseNoteList("!a:abc\n");
    },
    { message: 'Expected "~~~", field, or newline but end of input found.' },
  );
  throws(
    () => {
      parseNoteList("!a:abc\n~~~x");
    },
    { message: 'Expected newline but "x" found.' },
  );
});

test("parse tombstones", () => {
  like(parseNoteList("!delete:abc\n"), [{ type: "tombstone", id: { text: "abc" } }]);
  like(parseNoteList("!DELETE:abc\n"), [{ type: "tombstone", id: { text: "abc" } }]);
  like(parseNoteList("!delete: abc \n"), [{ type: "tombstone", id: { text: "abc" } }]);
  like(parseNoteList("!delete:a\n!delete:b\n"), [
    { type: "tombstone", id: { text: "a" } },
    { type: "tombstone", id: { text: "b" } },
  ]);
  // A tombstone is interchangeable with a note: it can stand between two notes with no `~~~` of its own.
  like(parseNoteList("!type:Basic\n!id:1\n!front:A\n~~~\n\n!delete:2\n\n!id:3\n!front:B\n~~~\n"), [
    {
      properties: [{ name: { text: "type" }, value: { text: "Basic" } }],
      fields: [
        { name: { text: "id" }, value: { text: "1" } },
        { name: { text: "front" }, value: { text: "A" } },
      ],
    },
    { type: "tombstone", id: { text: "2" } },
    {
      fields: [
        { name: { text: "id" }, value: { text: "3" } },
        { name: { text: "front" }, value: { text: "B" } },
      ],
    },
  ]);
});

