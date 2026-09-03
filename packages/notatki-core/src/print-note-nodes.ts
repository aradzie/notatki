import { type NoteListItemNode, type NoteNode, type TombstoneNode } from "@notatki/parser";
import { Output } from "./output.ts";

export function printNoteNodes(nodes: Iterable<NoteListItemNode>): string {
  const out = new Output();
  for (const node of nodes) {
    switch (node.type) {
      case "note":
        printNote(out, node);
        break;
      case "tombstone":
        printTombstone(out, node);
        break;
    }
  }
  return String(out);
}

function printNote(out: Output, { properties, fields, end }: NoteNode): void {
  out.separate();
  for (const { name, value } of properties) {
    if (value.text) {
      out.print(`!${name.text}: ${value.text}`);
    } else {
      out.print(`!${name.text}:`);
    }
  }
  out.separate();
  for (const { name, value } of fields) {
    if (value.text) {
      if (value.text.includes("\n")) {
        out.print(`!${name.text}:`);
        out.print(value.text);
      } else {
        out.print(`!${name.text}: ${value.text}`);
      }
    } else {
      out.print(`!${name.text}:`);
    }
  }
  out.print(end.text);
}

function printTombstone(out: Output, { id }: TombstoneNode): void {
  out.separate();
  out.print(id.text ? `!delete: ${id.text}` : `!delete:`);
}
