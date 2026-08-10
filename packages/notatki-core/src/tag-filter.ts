import { type Note } from "./note.ts";

export class ParsedTag {
  readonly #raw: string;
  readonly #parts: readonly string[];

  constructor(raw: string) {
    this.#raw = raw;
    this.#parts = raw.toLowerCase().split("::");
  }

  get raw(): string {
    return this.#raw;
  }

  get parts(): readonly string[] {
    return this.#parts;
  }

  // True if a search for `filterTag` should match this tag, i.e. `filterTag`'s parts are a
  // prefix of this tag's parts (so searching "parent" also matches "parent::child").
  isMatchedBy(filterTag: ParsedTag): boolean {
    return filterTag.#parts.every((part, i) => part === this.#parts[i]);
  }
}

export function parseTags(tags: string): ParsedTag[] {
  return tags
    .split(/\s+/)
    .filter((tag) => tag.length > 0)
    .map((tag) => new ParsedTag(tag));
}

export type TagFilterSpec = {
  readonly include: readonly ParsedTag[];
  readonly exclude: readonly ParsedTag[];
};

// Matches notes containing ANY of `include` (or all notes, if `include` is empty),
// excluding notes containing ANY of `exclude`. `exclude` always wins over `include`.
export class TagFilter {
  readonly #include: readonly ParsedTag[];
  readonly #exclude: readonly ParsedTag[];

  constructor({ include, exclude }: TagFilterSpec) {
    this.#include = include;
    this.#exclude = exclude;
  }

  // Builds a filter from CLI-style tags, where a leading '-' marks a tag as excluded.
  static fromCliTags(tags: readonly string[]): TagFilter {
    const include: ParsedTag[] = [];
    const exclude: ParsedTag[] = [];
    for (const tag of tags) {
      if (tag.startsWith("-")) {
        exclude.push(new ParsedTag(tag.slice(1)));
      } else {
        include.push(new ParsedTag(tag));
      }
    }
    return new TagFilter({ include, exclude });
  }

  matches(note: Note): boolean {
    const tags = parseTags(note.tags);
    const isIncluded = this.#include.length === 0 || this.#include.some((filterTag) => tags.some((tag) => tag.isMatchedBy(filterTag)));
    const isExcluded = this.#exclude.some((filterTag) => tags.some((tag) => tag.isMatchedBy(filterTag)));
    return isIncluded && !isExcluded;
  }

  filter(notes: Iterable<Note>): Note[] {
    return [...notes].filter((note) => this.matches(note));
  }
}
