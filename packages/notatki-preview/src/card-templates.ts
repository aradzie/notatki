import { type Model, type ModelCard, type ModelMap } from "@notatki/core";
import { parseTemplate, type TemplateItemNode } from "@notatki/parser";
import { type CardData } from "./card-data.ts";

export class CardTemplates {
  readonly #map = new Map<string, CardTemplate>();

  constructor(models: ModelMap) {
    for (const model of models) {
      for (const card of model.cards) {
        this.#map.set(cardKey(model, card), new CardTemplate(card));
      }
    }
  }

  render(data: CardData, side: "front" | "back"): string {
    const key = cardKey(data.note.type, data.card);
    const card = this.#map.get(key);
    if (card == null) {
      throw new Error(`Unknown card: ${key}`);
    }
    return card.render(data, side);
  }
}

function cardKey(model: Model, card: ModelCard): string {
  return `${model.name}::${card.name}`;
}

type ValueProvider = {
  getValue(data: CardData, field: string): string;
};

class CardTemplate implements ValueProvider {
  readonly #front: Template;
  readonly #back: Template;

  constructor(card: ModelCard) {
    this.#front = new Template(card.front);
    this.#back = new Template(card.back);
  }

  render(data: CardData, side: "front" | "back"): string {
    switch (side) {
      case "front":
        return this.renderFront(data);
      case "back":
        return this.renderBack(data);
    }
  }

  renderFront(data: CardData): string {
    data.clearValue("FrontSide");
    return this.#front.render(this, data);
  }

  renderBack(data: CardData): string {
    data.setValue("FrontSide", this.renderFront(data));
    return this.#back.render(this, data);
  }

  getValue(data: CardData, field: string): string {
    switch (field) {
      case "cloze:Text": {
        return data.getValue("Text");
      }
    }
    return data.getValue(field);
  }
}

type Part =
  | string
  | { readonly type: "field"; readonly field: string }
  | { readonly type: "if"; readonly field: string; readonly parts: readonly Part[] }
  | { readonly type: "if-not"; readonly field: string; readonly parts: readonly Part[] };

class Template {
  readonly #parts: readonly Part[];

  constructor(template: string) {
    this.#parts = mapNodeList(parseTemplate(template));
  }

  render(values: ValueProvider, data: CardData): string {
    let out = "";

    function visit(parts: readonly Part[]) {
      for (const part of parts) {
        if (typeof part === "string") {
          out += part;
        } else {
          switch (part.type) {
            case "field": {
              out += values.getValue(data, part.field);
              break;
            }
            case "if": {
              if (values.getValue(data, part.field)) {
                visit(part.parts);
              }
              break;
            }
            case "if-not": {
              if (!values.getValue(data, part.field)) {
                visit(part.parts);
              }
              break;
            }
          }
        }
      }
    }

    visit(this.#parts);

    return out;
  }
}

function mapNodeList(nodes: readonly TemplateItemNode[]): Part[] {
  return nodes.map((node) => mapNode(node));
}

function mapNode(node: TemplateItemNode): Part {
  switch (node.type) {
    case "text": {
      return node.text;
    }
    case "field": {
      return {
        type: "field",
        field: node.field.text,
      };
    }
    case "branch": {
      const { cond } = node;
      if (cond.not) {
        return {
          type: "if-not",
          field: cond.field.text,
          parts: mapNodeList(node.items),
        };
      } else {
        return {
          type: "if",
          field: cond.field.text,
          parts: mapNodeList(node.items),
        };
      }
    }
  }
}
