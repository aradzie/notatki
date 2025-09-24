import { type FieldNode, type LocationRange, type NoteNode, type PropertyNode } from "@notatki/parser";

export const loc = {
  source: "<unknown>",
  start: { offset: 0, line: 0, column: 0 },
  end: { offset: 0, line: 0, column: 0 },
} as const satisfies LocationRange;

export type NoteMaker = {
  type(type: string): NoteMaker;
  deck(deck: string): NoteMaker;
  tags(tags: string): NoteMaker;
  property(name: string, value: string): NoteMaker;
  id(id: string): NoteMaker;
  field(name: string, value: string): NoteMaker;
  make(): NoteNode;
};

export function newNote(): NoteMaker {
  const properties: PropertyNode[] = [];
  const fields: FieldNode[] = [];
  const maker: NoteMaker = {
    type(type: string): NoteMaker {
      maker.property("type", type);
      return maker;
    },
    deck(deck: string): NoteMaker {
      maker.property("deck", deck);
      return maker;
    },
    tags(tags: string): NoteMaker {
      maker.property("tags", tags);
      return maker;
    },
    property(name: string, value: string) {
      properties.push({
        name: { text: name, loc },
        value: { text: value, loc },
        loc,
      });
      return maker;
    },
    id(id: string) {
      maker.field("id", id);
      return maker;
    },
    field(name: string, value: string) {
      fields.push({
        name: { text: name, loc },
        value: { text: value, loc },
        loc,
      });
      return maker;
    },
    make(): NoteNode {
      return {
        properties: [...properties],
        fields: [...fields],
        end: { text: "~~~", loc },
        loc,
      };
    },
  };
  return maker;
}
