import { type FieldNode, type NoteNode } from "@notatki/parser";
import { type Model, type ModelField, ModelMap } from "./model.js";

export class NoteList implements Iterable<Note> {
  readonly #types: ModelMap;
  readonly #notes: Note[];

  constructor(types = new ModelMap()) {
    this.#types = types;
    this.#notes = [];
  }

  get types(): ModelMap {
    return this.#types;
  }

  [Symbol.iterator](): Iterator<Note> {
    return this.#notes[Symbol.iterator]();
  }

  get length(): number {
    return this.#notes.length;
  }

  add(note: Note): void {
    this.#notes.push(note);
  }
}

export class Note implements Iterable<NoteField> {
  readonly #type: Model;
  #deck: string = "";
  #tags: string = "";
  readonly #id = new NoteField({ name: "ID", required: false });
  readonly #fields = new Map<string, NoteField>();
  #node: NoteNode | null = null;

  constructor(type: Model) {
    this.#type = type;
    for (const field of type.fields) {
      this.#fields.set(field.name.toLowerCase(), new NoteField(field));
    }
  }

  get type(): Model {
    return this.#type;
  }

  get deck(): string {
    return this.#deck;
  }

  set deck(value: string | null) {
    this.#deck = value ?? "";
  }

  get tags(): string {
    return this.#tags;
  }

  set tags(value: string | null) {
    this.#tags = value ?? "";
  }

  get id(): string {
    return this.#id.value;
  }

  set id(value: string | null) {
    this.#id.value = value;
  }

  [Symbol.iterator](): Iterator<NoteField> {
    return this.#fields.values();
  }

  has(fieldName: string): boolean {
    const key = fieldName.toLowerCase();
    if (key === "id") {
      return true;
    }
    return this.#fields.has(key);
  }

  get(fieldName: string): NoteField {
    return this.#getField(fieldName);
  }

  set(fieldName: string, value: string | null): void {
    this.#getField(fieldName).value = value;
  }

  #getField(fieldName: string): NoteField {
    const key = fieldName.toLowerCase();
    if (key === "id") {
      return this.#id;
    }
    const field = this.#fields.get(key);
    if (field != null) {
      return field;
    }
    throw new Error(`Unknown field: "${fieldName}"`);
  }

  get first(): NoteField {
    const [first] = this.#fields.values();
    if (first != null) {
      return first;
    }
    throw new Error("No fields");
  }

  get node(): NoteNode | null {
    return this.#node;
  }

  set node(value: NoteNode | null) {
    this.#node = value;
  }

  static isIdField(fieldName: string): boolean {
    return fieldName.toLowerCase() === "id";
  }
}

export class NoteField {
  readonly #type: ModelField;
  #value: string = "";
  #node: FieldNode | null = null;

  constructor(type: ModelField) {
    this.#type = type;
  }

  get name(): string {
    return this.#type.name;
  }

  get required(): boolean {
    return this.#type.required ?? false;
  }

  get value(): string {
    return this.#value;
  }

  set value(value: string | null) {
    this.#value = value ?? "";
  }

  get node(): FieldNode | null {
    return this.#node;
  }

  set node(value: FieldNode | null) {
    this.#node = value;
  }
}
