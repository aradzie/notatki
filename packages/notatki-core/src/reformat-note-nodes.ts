import {
  type FieldNode,
  type NoteListItemNode,
  type NoteNode,
  type PropertyNode,
  type Token,
  type TombstoneNode,
} from "@notatki/parser";
import { loc } from "./nodes.ts";

export function reformatNoteNodes(
  nodes: Iterable<NoteListItemNode>,
  formatField: (text: string) => string = (text) => text,
): NoteListItemNode[] {
  function mapNode(node: NoteListItemNode): NoteListItemNode {
    switch (node.type) {
      case "note":
        return mapNoteNode(node);
      case "tombstone":
        return mapTombstoneNode(node);
    }
  }

  function mapNoteNode(node: NoteNode): NoteNode {
    return {
      type: "note",
      properties: node.properties.map(mapPropertyNode),
      fields: node.fields.map(mapFieldNode),
      end: { text: "~~~", loc },
      loc,
    };
  }

  function mapTombstoneNode(node: TombstoneNode): TombstoneNode {
    return {
      type: "tombstone",
      id: { text: node.id.text, loc },
      loc,
    };
  }

  function mapPropertyNode({ name, value }: PropertyNode): PropertyNode {
    return {
      name: nameOf(name),
      value: { text: value.text, loc },
      loc,
    };
  }
  function mapFieldNode({ name, value }: FieldNode): FieldNode {
    return {
      name: nameOf(name),
      value: { text: formatField(value.text), loc },
      loc,
    };
  }

  return [...nodes].map(mapNode);
}

function nameOf({ text }: Token): Token {
  return { text: text.toLowerCase(), loc };
}
