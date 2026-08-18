import { test } from "node:test";
import { parseNoteList } from "@notatki/parser";
import { deepEqual } from "rich-assert";
import { diffNoteFiles } from "./note-diff.ts";

function diff(oldText: string, newText: string) {
  return diffNoteFiles(parseNoteList(oldText, "old.note"), parseNoteList(newText, "new.note"));
}

test("note-diff: unchanged note produces no diff", () => {
  const text = `
!type: Basic
!id: abc123
!front: Question
!back: Answer
~~~
`;
  deepEqual(diff(text, text), { added: [], removed: [], changed: [] });
});

test("note-diff: added note without id", () => {
  const result = diff(
    "",
    `
!type: Basic
!front: New question
!back: New answer
~~~
`,
  );
  deepEqual(result.removed, []);
  deepEqual(result.changed, []);
  deepEqual(result.added.length, 1);
  deepEqual(result.added[0]?.hasId, false);
  deepEqual(result.added[0]?.preview, "New question");
});

test("note-diff: removed note", () => {
  const result = diff(
    `
!type: Basic
!id: abc123
!front: Question
!back: Answer
~~~
`,
    "",
  );
  deepEqual(result.added, []);
  deepEqual(result.changed, []);
  deepEqual(result.removed.length, 1);
  deepEqual(result.removed[0]?.id, "abc123");
});

test("note-diff: matches notes by id and reports changed fields", () => {
  const result = diff(
    `
!type: Basic
!id: abc123
!front: Question
!back: Answer
~~~
`,
    `
!type: Basic
!id: abc123
!front: Question
!back: New answer
~~~
`,
  );
  deepEqual(result.added, []);
  deepEqual(result.removed, []);
  deepEqual(result.changed, [{ id: "abc123", preview: "Question", changes: ["back"] }]);
});

test("note-diff: notes without an id are never matched, even with identical content", () => {
  const text = `
!type: Basic
!front: Question
!back: Answer
~~~
`;
  const result = diff(text, text);
  deepEqual(result.changed, []);
  deepEqual(result.added.length, 1);
  deepEqual(result.removed.length, 1);
});

test("note-diff: reports inherited deck/tags/type changes on unedited notes", () => {
  const result = diff(
    `
!type: Basic
!deck: Math
!tags: Old

!id: abc123
!front: Question
!back: Answer
~~~
`,
    `
!type: Basic
!deck: History
!tags: New

!id: abc123
!front: Question
!back: Answer
~~~
`,
  );
  deepEqual(result.changed, [{ id: "abc123", preview: "Question", changes: ["deck", "tags"] }]);
});

test("note-diff: field removed entirely is reported as changed", () => {
  const result = diff(
    `
!type: Basic (optional reversed card)
!id: abc123
!front: Question
!back: Answer
!add reverse: y
~~~
`,
    `
!type: Basic (optional reversed card)
!id: abc123
!front: Question
!back: Answer
~~~
`,
  );
  deepEqual(result.changed, [{ id: "abc123", preview: "Question", changes: ["add reverse"] }]);
});

test("note-diff: preview normalizes whitespace and truncates long first-field values", () => {
  const result = diff(
    "",
    `
!type: Basic
!id: abc123
!front: Line one
  Line two, which together with line one is long enough to exceed the sixty character preview limit
!back: Answer
~~~
`,
  );
  deepEqual(result.added.length, 1);
  deepEqual(result.added[0]?.preview, "Line one Line two, which together with line one is long eno…");
});
