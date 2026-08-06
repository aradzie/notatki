import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { type Model, type ModelCard, Note } from "@notatki/core";
import { type FieldNode } from "@notatki/parser";
import { equal, isFalse, isTrue } from "rich-assert";
import { CardData } from "./card-data.ts";
import { ImageResolver } from "./image-resolver.ts";

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
  const data = new CardData(model1, card1, note, new ImageResolver("inline", "/tmp/notes.html"));

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

let dir: string;

before(() => {
  dir = mkdtempSync(join(tmpdir(), "notatki-card-data-"));
  writeFileSync(join(dir, "cat.png"), "cat");
  writeFileSync(join(dir, "dog.png"), "dog");
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("images in field values are resolved", () => {
  const card1: ModelCard = { name: "Card 1", front: `{{Front}}`, back: `{{Back}}` };
  const model1: Model = {
    name: "Type 1",
    cloze: false,
    fields: [
      { name: "Front", required: true },
      { name: "Back", required: true },
    ],
    cards: [card1],
    styles: "",
  };
  const note = new Note(model1);
  const source = join(dir, "card.note");
  note.set("Front", "![alt](cat.png)");
  note.get("Front").node = { loc: { source } } as FieldNode;
  note.set("Back", "![alt](dog.png)");
  note.get("Back").node = { loc: { source } } as FieldNode;

  const data = new CardData(model1, card1, note, new ImageResolver("inline", join(dir, "notes.html")));

  equal(data.getValue("Front"), `<p><img src="data:image/png;base64,Y2F0" alt="alt"></p>`);
  equal(data.getValue("Back"), `<p><img src="data:image/png;base64,ZG9n" alt="alt"></p>`);
});
