import type { ClozeItemNode, ModelNode, NoteListItemNode, TemplateItemNode } from "./nodes.js";
import type { GrammarSource } from "./parser$.js";

export type { GrammarSource, GrammarSourceObject, Location, LocationRange } from "./parser$.js";
export { SyntaxError } from "./parser$.js";

export function parseNoteList(input: string, source?: GrammarSource): NoteListItemNode[];

export function parseModelList(input: string, source?: GrammarSource): ModelNode[];

export function parseTemplate(input: string, source?: GrammarSource): TemplateItemNode[];

export function parseCloze(input: string, source?: GrammarSource): ClozeItemNode[];
