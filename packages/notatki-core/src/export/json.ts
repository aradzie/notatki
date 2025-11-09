import { formatField } from "@notatki/format";
import type { NoteList } from "../note.js";

export type JCollection = {
  models: JModel[];
  notes: JNote[];
};

export type JModel = {
  id: number;
  name: string;
  cloze: boolean;
  fields: {
    name: string;
  }[];
  cards: {
    name: string;
    front: string;
    back: string;
  }[];
  styles: string;
};

export type JNote = {
  guid: string;
  type: string;
  deck: string;
  tags: string[];
  fields: Record<string, string>;
};

export async function exportJson(col: NoteList): Promise<string> {
  const models: JModel[] = [];
  const notes: JNote[] = [];
  for (const model of col.types) {
    models.push({
      id: model.id,
      name: model.name,
      cloze: model.cloze,
      fields: [...model.fields].map(
        ({
          name, //
        }) => ({
          name,
        }),
      ),
      cards: [...model.cards].map(
        ({
          name, //
          front,
          back,
        }) => ({
          name,
          front,
          back,
        }),
      ),
      styles: model.styles,
    });
  }
  for (const note of col) {
    const fields: Record<string, string> = {};
    for (const field of note) {
      fields[field.name] = formatField(field.value);
    }
    notes.push({
      guid: note.id,
      type: note.type.name,
      deck: note.deck,
      tags: note.tags.split(/\s+/),
      fields,
    });
  }
  return JSON.stringify({ models, notes } satisfies JCollection, null, 2);
}
