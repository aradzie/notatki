import { type FieldNode, type NoteNode, type PropertyNode, type Token } from "@notatki/parser";
import { loc } from "./nodes.ts";

export function reformatNoteNodes(
  nodes: Iterable<NoteNode>,
  formatField: (text: string) => string = (text) => text,
): NoteNode[] {
  function mapNoteNode(node: NoteNode): NoteNode {
    return {
      properties: node.properties.map(mapPropertyNode),
      fields: node.fields.map(mapFieldNode),
      end: { text: "~~~", loc },
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

  return [...nodes].map(mapNoteNode);
}

function nameOf({ text }: Token): Token {
  return { text: text.toLowerCase(), loc };
}
