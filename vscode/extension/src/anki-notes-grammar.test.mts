import { fileURLToPath } from "node:url";
import { runTextMateSnapshotTests } from "@notatki/textmate-grammar-test";

runTextMateSnapshotTests({
  name: "Anki note grammar snapshots",
  grammarPath: fileURLToPath(new URL("../syntaxes/anki-notes.tmLanguage.json", import.meta.url)),
  scopeName: "source.anki-notes",
  fixturesDir: fileURLToPath(new URL("./fixtures/anki-notes-grammar/", import.meta.url)),
  fixtureExtension: ".note",
});
