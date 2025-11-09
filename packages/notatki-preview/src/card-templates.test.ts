import { test } from "node:test";
import { type Model, type ModelCard, ModelMap, Note } from "@notatki/core";
import { equal } from "rich-assert";
import { CardData } from "./card-data.js";
import { CardTemplates } from "./card-templates.js";

test("render templates", () => {
  const card1: ModelCard = {
    name: "Card 1",
    front: `{{Front}}`,
    back:
      `{{FrontSide}}\n` +
      `{{Back}}\n` +
      `Type:{{Type}}\n` +
      `Card:{{Card}}\n` +
      `Deck:{{Deck}}\n` +
      `Subdeck:{{Subdeck}}\n` +
      `Tags:{{Tags}}\n`,
  };
  const model1: Model = {
    name: "Type 1",
    id: 1,
    cloze: false,
    fields: [
      { name: "Front", required: true },
      { name: "Back", required: true },
      { name: "Extra", required: false },
    ],
    cards: [card1],
    styles: "",
  };
  const templates = new CardTemplates(new ModelMap([model1]));

  const note = new Note(model1);
  note.set("front", "FRONT");
  note.set("back", "BACK");

  equal(
    templates.render(new CardData(model1, card1, note), "front"), //
    `<p>FRONT</p>`,
  );
  equal(
    templates.render(new CardData(model1, card1, note), "back"), //
    `<p>FRONT</p>\n` + //
      `<p>BACK</p>\n` +
      `Type:Type 1\n` +
      `Card:Card 1\n` +
      `Deck:\n` +
      `Subdeck:\n` +
      `Tags:\n`,
  );

  note.deck = "Outer::Inner";
  note.tags = "A::B::C Tag1 Tag2";

  equal(
    templates.render(new CardData(model1, card1, note), "front"), //
    `<p>FRONT</p>`,
  );
  equal(
    templates.render(new CardData(model1, card1, note), "back"), //
    `<p>FRONT</p>\n` + //
      `<p>BACK</p>\n` +
      `Type:Type 1\n` +
      `Card:Card 1\n` +
      `Deck:Outer::Inner\n` +
      `Subdeck:Inner\n` +
      `Tags:A::B::C Tag1 Tag2\n`,
  );
});

test("conditional", () => {
  const card1: ModelCard = {
    name: "Card 1",
    front: `{{Front}}`,
    back:
      `{{FrontSide}}\n` + //
      `{{Back}}\n` +
      `{{#Extra}}{{Extra}}{{/Extra}}\n` +
      `{{^Extra}}???{{/Extra}}\n`,
  };
  const model1: Model = {
    name: "Type 1",
    id: 1,
    cloze: false,
    fields: [
      { name: "Front", required: true },
      { name: "Back", required: true },
      { name: "Extra", required: false },
    ],
    cards: [card1],
    styles: "",
  };
  const templates = new CardTemplates(new ModelMap([model1]));

  const note = new Note(model1);
  note.set("front", "FRONT");
  note.set("back", "BACK");

  equal(
    templates.render(new CardData(model1, card1, note), "back"), //
    `<p>FRONT</p>\n<p>BACK</p>\n\n???\n`,
  );

  note.set("extra", "EXTRA");

  equal(
    templates.render(new CardData(model1, card1, note), "back"), //
    `<p>FRONT</p>\n<p>BACK</p>\n<p>EXTRA</p>\n\n`,
  );
});
