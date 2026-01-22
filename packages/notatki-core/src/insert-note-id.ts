import { type NoteNode } from "@notatki/parser";
import { loc } from "./nodes.js";
import { Note } from "./note.js";
import { type IdGenerator, idGenerator } from "./note-id.js";

export function insertNoteId(nodes: NoteNode[], gen: IdGenerator = idGenerator): boolean {
  let changed = false;
  for (const node of nodes) {
    let field = node.fields.find(({ name }) => Note.isIdField(name.text));
    if (field == null) {
      node.fields.unshift((field = { name: { text: "id", loc }, value: { text: "", loc }, loc }));
    }
    const { value } = field;
    if (!value.text) {
      value.text = gen();
      changed = true;
    }
  }
  return changed;
}
