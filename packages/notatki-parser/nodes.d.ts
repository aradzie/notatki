import type { LocationRange } from "./parser.js";

export type Node = {
  loc: LocationRange;
};

export type NoteNode = {
  properties: PropertyNode[];
  fields: FieldNode[];
  end: Token;
} & Node;

export type PropertyNode = {
  name: Token;
  value: Token;
} & Node;

export type FieldNode = {
  name: Token;
  value: Token;
} & Node;

export type ModelNode = {
  name: Token;
  id: ModelIdNode;
  cloze: Token;
  fields: ModelFieldNode[];
  cards: ModelCardNode[];
  styles: CardStylesNode | null;
} & Node;

export type ModelIdNode = {
  id: Token;
  value: number;
} & Node;

export type ModelFieldNode = {
  name: Token;
  required: boolean;
} & Node;

export type ModelCardNode = {
  name: Token;
  front: CardFrontNode;
  back: CardBackNode;
} & Node;

export type CardFrontNode = {
  text: string;
} & Node;

export type CardBackNode = {
  text: string;
} & Node;

export type CardStylesNode = {
  text: string;
} & Node;

export type TemplateItemNode = TemplateTextNode | TemplateFieldNode | TemplateBranchNode;

export type TemplateTextNode = {
  type: "text";
  text: string;
} & Node;

export type TemplateFieldNode = {
  type: "field";
  field: Token;
} & Node;

export type TemplateBranchNode = {
  type: "branch";
  cond: IfFieldNode;
  items: TemplateItemNode[];
  end: EndIfFieldNode;
} & Node;

export type IfFieldNode = {
  field: Token;
  not: boolean;
} & Node;

export type EndIfFieldNode = {
  field: Token;
} & Node;

export type Token = {
  text: string;
} & Node;
