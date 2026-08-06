import { type Model, type ModelCard, type Note } from "@notatki/core";
import { formatField, renderHtml } from "@notatki/format";
import { escapeHtml } from "./html.ts";
import { type ImageResolver } from "./image-resolver.ts";

const html = renderHtml({ output: "html", throwOnError: false });

export class CardData {
  readonly #model: Model;
  readonly #card: ModelCard;
  readonly #note: Note;
  readonly #data: Map<string, string>;

  constructor(model: Model, card: ModelCard, note: Note, resolver: ImageResolver) {
    this.#model = model;
    this.#card = card;
    this.#note = note;
    this.#data = new Map();
    // Build-in fields.
    this.setValue("Type", escapeHtml(note.type.name));
    this.setValue("Card", escapeHtml(card.name));
    this.setValue("Deck", escapeHtml(note.deck));
    this.setValue("Subdeck", escapeHtml(note.deck.split("::").pop() ?? note.deck));
    this.setValue("Tags", escapeHtml(note.tags));
    this.setValue("Flags", escapeHtml("Flags"));
    // User-defined fields.
    for (const { name, value, node } of note) {
      const source = node?.loc.source;
      const resolveImage = typeof source === "string" ? resolver.forSource(source) : undefined;
      this.setValue(name, formatField(value, html, resolveImage));
    }
  }

  get model(): Model {
    return this.#model;
  }

  get card(): ModelCard {
    return this.#card;
  }

  get note(): Note {
    return this.#note;
  }

  hasValue(name: string): boolean {
    return this.#data.get(name) != null;
  }

  getValue(name: string): string {
    const value = this.#data.get(name);
    if (value == null) {
      throw new Error(`Unknown field: ${this.#note.type.name}::${name}`);
    }
    return value;
  }

  clearValue(name: string): void {
    this.#data.delete(name);
  }

  setValue(name: string, value: string): void {
    this.#data.set(name, value);
  }
}
