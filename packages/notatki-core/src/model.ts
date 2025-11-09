export type Model = {
  readonly name: string;
  readonly id: number;
  readonly cloze: boolean;
  readonly fields: readonly ModelField[];
  readonly cards: readonly ModelCard[];
  readonly styles: string;
};

export type ModelField = {
  readonly name: string;
  readonly required: boolean;
};

export type ModelCard = {
  readonly name: string;
  readonly front: string;
  readonly back: string;
};

export class ModelMap implements Iterable<Model> {
  static readonly basic = {
    name: "Basic",
    id: 1607392319,
    cloze: false,
    fields: [
      { name: "Front", required: true },
      { name: "Back", required: true },
    ],
    cards: [
      {
        name: "Card 1",
        front: "{{Front}}",
        back: "{{FrontSide}}<hr>{{Back}}",
      },
    ],
    styles: "",
  } as const satisfies Model;

  static readonly basicAndReversedCard = {
    name: "Basic (and reversed card)",
    id: 1607392320,
    cloze: false,
    fields: [
      { name: "Front", required: true },
      { name: "Back", required: true },
    ],
    cards: [
      {
        name: "Card 1",
        front: "{{Front}}",
        back: "{{FrontSide}}<hr>{{Back}}",
      },
      {
        name: "Card 2",
        front: "{{Back}}",
        back: "{{FrontSide}}<hr>{{Front}}",
      },
    ],
    styles: "",
  } as const satisfies Model;

  static readonly basicOptionalReversedCard = {
    name: "Basic (optional reversed card)",
    id: 1607392321,
    cloze: false,
    fields: [
      { name: "Front", required: true },
      { name: "Back", required: true },
      { name: "Add Reverse", required: false },
    ],
    cards: [
      {
        name: "Card 1",
        front: "{{Front}}",
        back: "{{FrontSide}}<hr>{{Back}}",
      },
      {
        name: "Card 2",
        front: "{{#Add Reverse}}{{Back}}{{/Add Reverse}}",
        back: "{{FrontSide}}<hr>{{Front}}",
      },
    ],
    styles: "",
  } as const satisfies Model;

  static readonly basicTypeInAnswer = {
    name: "Basic (type in the answer)",
    id: 1607392322,
    cloze: false,
    fields: [
      { name: "Front", required: true },
      { name: "Back", required: true },
    ],
    cards: [
      {
        name: "Card 1",
        front: "{{Front}}<br>{{type:Back}}",
        back: "{{Front}}<hr>{{Back}}",
      },
    ],
    styles: "",
  } as const satisfies Model;

  static readonly cloze = {
    name: "Cloze",
    id: 1607392323,
    cloze: true,
    fields: [
      { name: "Text", required: true },
      { name: "Back Extra", required: false },
    ],
    cards: [
      {
        name: "Cloze",
        front: "{{cloze:Text}}",
        back: "{{cloze:Text}}<br>{{Back Extra}}",
      },
    ],
    styles: "",
  } as const satisfies Model;

  static readonly internal: readonly Model[] = [
    ModelMap.basic,
    ModelMap.basicAndReversedCard,
    ModelMap.basicOptionalReversedCard,
    ModelMap.basicTypeInAnswer,
    ModelMap.cloze,
  ];

  readonly #map = new Map<string, Model>();

  constructor(initial: Iterable<Model> = ModelMap.internal) {
    for (const model of initial) {
      this.add(model);
    }
  }

  [Symbol.iterator](): Iterator<Model> {
    return this.#map.values();
  }

  add(model: Model): this {
    this.#map.set(model.name.toLowerCase(), model);
    return this;
  }

  has(name: string): boolean {
    return this.#map.has(name.toLowerCase());
  }

  get(name: string): Model | null {
    return this.#map.get(name.toLowerCase()) ?? null;
  }
}
