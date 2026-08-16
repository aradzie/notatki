import { test } from "node:test";
import { like } from "rich-assert";
import { parseCloze } from "./parser.js";

test("plain text", () => {
  like(parseCloze(""), []);
  like(parseCloze("plain text"), ["plain text"]);
});

test("single cloze", () => {
  like(parseCloze("{{c1::answer}}"), [{ type: "cloze", id: 1, answer: ["answer"], hint: null }]);
  like(parseCloze("{{c1::answer::hint}}"), [{ type: "cloze", id: 1, answer: ["answer"], hint: "hint" }]);
});

test("cloze id", () => {
  like(parseCloze("{{c9::a}}"), [{ type: "cloze", id: 9 }]);
  like(parseCloze("{{c10::a}}"), [{ type: "cloze", id: 10 }]);
  like(parseCloze("{{c99::a}}"), [{ type: "cloze", id: 99 }]);
});

test("surrounding and interleaved text", () => {
  like(parseCloze("ambient {{c1::answer::hint}} surrounding"), [
    "ambient ",
    { type: "cloze", id: 1, answer: ["answer"], hint: "hint" },
    " surrounding",
  ]);
  like(parseCloze("{{c1::a}}mid{{c2::b}}"), [
    { type: "cloze", id: 1, answer: ["a"], hint: null },
    "mid",
    { type: "cloze", id: 2, answer: ["b"], hint: null },
  ]);
});

test("first :: separates answer from hint", () => {
  like(parseCloze("{{c1::3::4 ratio}}"), [{ type: "cloze", id: 1, answer: ["3"], hint: "4 ratio" }]);
});

test("hint is opaque, not parsed for nested clozes", () => {
  // The hint's own "}}" (from the unparsed "{{" text) closes the outer cloze,
  // since hints are scanned as raw text up to the first "}}", with no
  // awareness of brace nesting.
  like(parseCloze("{{c1::answer::hint with {{ a brace}}"), [
    { type: "cloze", id: 1, answer: ["answer"], hint: "hint with {{ a brace" },
  ]);
});

test("nested clozes inside answer", () => {
  like(parseCloze("{{c1::outer {{c2::inner}} text}}"), [
    {
      type: "cloze",
      id: 1,
      answer: ["outer ", { type: "cloze", id: 2, answer: ["inner"], hint: null }, " text"],
      hint: null,
    },
  ]);
  like(parseCloze("{{c1::outer {{c2::inner::inner hint}} text::outer hint}}"), [
    {
      type: "cloze",
      id: 1,
      answer: ["outer ", { type: "cloze", id: 2, answer: ["inner"], hint: "inner hint" }, " text"],
      hint: "outer hint",
    },
  ]);
});

test("malformed clozes fall back to ambient text", () => {
  like(parseCloze("{{"), ["{{"]);
  like(parseCloze("{{c}}"), ["{{c}}"]);
  like(parseCloze("{{c::}}"), ["{{c::}}"]);
  like(parseCloze("{{c0::a}}"), ["{{c0::a}}"]);
  like(parseCloze("{{c123::a}}"), ["{{c123::a}}"]);
  like(parseCloze("{{c1:a}}"), ["{{c1:a}}"]);
  like(parseCloze("{{c1::a"), ["{{c1::a"]);
});

test("empty hint is allowed", () => {
  like(parseCloze("{{c1::answer::}}"), [{ type: "cloze", id: 1, answer: ["answer"], hint: "" }]);
});
