import { test } from "node:test";
import { type Model, type ModelCard, Note } from "@notatki/core";
import { equal, isFalse, isTrue } from "rich-assert";
import { CardData } from "./card-data.js";

test("card data", () => {
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
  const note = new Note(model1);
  note.deck = "A::B::C";
  note.tags = "A B C";
  const data = new CardData(model1, card1, note);

  isFalse(data.hasValue("xyz"));
  isFalse(data.hasValue("front"));
  isFalse(data.hasValue("back"));
  isFalse(data.hasValue("EXTRA"));

  isTrue(data.hasValue("Type"));
  isTrue(data.hasValue("Card"));
  isTrue(data.hasValue("Deck"));
  isTrue(data.hasValue("Subdeck"));
  isTrue(data.hasValue("Tags"));
  isTrue(data.hasValue("Front"));
  isTrue(data.hasValue("Back"));
  isTrue(data.hasValue("Extra"));

  equal(data.getValue("Type"), "Type 1");
  equal(data.getValue("Card"), "Card 1");
  equal(data.getValue("Deck"), "A::B::C");
  equal(data.getValue("Subdeck"), "C");
  equal(data.getValue("Tags"), "A B C");
  equal(data.getValue("Front"), "");
  equal(data.getValue("Back"), "");
  equal(data.getValue("Extra"), "");
});
