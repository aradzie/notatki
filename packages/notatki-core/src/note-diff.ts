import type { NoteNode } from "@notatki/parser";

export type DiffNote = {
  id: string;
  hasId: boolean;
  preview: string;
  type: string;
  deck: string;
  tags: string;
  fields: Map<string, { name: string; value: string }>;
};

export type ChangedNote = {
  id: string;
  preview: string;
  changes: string[];
};

export type NoteFileDiff = {
  added: DiffNote[];
  removed: DiffNote[];
  changed: ChangedNote[];
};

export function diffNoteFiles(oldNodes: readonly NoteNode[], newNodes: readonly NoteNode[]): NoteFileDiff {
  const oldNotes = toDiffNotes(oldNodes);
  const newNotes = toDiffNotes(newNodes);

  const oldById = new Map<string, DiffNote>();
  for (const note of oldNotes) {
    if (note.hasId) {
      oldById.set(note.id, note);
    }
  }
  const newById = new Map<string, DiffNote>();
  for (const note of newNotes) {
    if (note.hasId) {
      newById.set(note.id, note);
    }
  }

  const added: DiffNote[] = [];
  const removed: DiffNote[] = [];
  const changed: ChangedNote[] = [];

  for (const note of oldNotes) {
    if (!note.hasId || !newById.has(note.id)) {
      removed.push(note);
    }
  }

  for (const note of newNotes) {
    const before = note.hasId ? oldById.get(note.id) : undefined;
    if (before == null) {
      added.push(note);
    } else {
      const changes = diffNote(before, note);
      if (changes.length > 0) {
        changed.push({ id: note.id, preview: note.preview, changes });
      }
    }
  }

  return { added, removed, changed };
}

function toDiffNotes(nodes: readonly NoteNode[]): DiffNote[] {
  const notes: DiffNote[] = [];
  let type = "";
  let deck = "";
  let tags = "";

  for (const node of nodes) {
    for (const { name, value } of node.properties) {
      switch (name.text) {
        case "type":
          type = value.text;
          break;
        case "deck":
          deck = value.text;
          break;
        case "tags":
          tags = value.text;
          break;
      }
    }

    let id = "";
    let firstFieldValue: string | null = null;
    const fields = new Map<string, { name: string; value: string }>();
    for (const { name, value } of node.fields) {
      const key = name.text.toLowerCase();
      if (key === "id") {
        id = value.text;
      } else {
        fields.set(key, { name: name.text, value: value.text });
        firstFieldValue ??= value.text;
      }
    }

    notes.push({
      id,
      hasId: id !== "",
      preview: preview(firstFieldValue ?? ""),
      type,
      deck,
      tags,
      fields,
    });
  }

  return notes;
}

function diffNote(before: DiffNote, after: DiffNote): string[] {
  const changes: string[] = [];
  if (before.type !== after.type) {
    changes.push("type");
  }
  if (before.deck !== after.deck) {
    changes.push("deck");
  }
  if (before.tags !== after.tags) {
    changes.push("tags");
  }

  const seen = new Set<string>();
  for (const [key, field] of after.fields) {
    seen.add(key);
    if ((before.fields.get(key)?.value ?? "") !== field.value) {
      changes.push(field.name);
    }
  }
  for (const [key, field] of before.fields) {
    if (!seen.has(key)) {
      changes.push(field.name);
    }
  }

  return changes;
}

function preview(value: string, maxLength = 60): string {
  const normalized = value.trim().replaceAll(/\s+/g, " ");
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}
