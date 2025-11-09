import { type ModelNode } from "@notatki/parser";
import { Output } from "./output.js";

export function printModelNodes(nodes: Iterable<ModelNode>): string {
  const out = new Output();
  for (const { name, id, cloze, fields, cards, styles } of nodes) {
    out.separate();
    out.print(`model ${name.text}`);
    out.separate();
    out.print(`id ${id.value}`);
    if (cloze != null) {
      out.separate();
      out.print("cloze");
    }
    out.separate();
    for (const { name, required } of fields) {
      out.print(`field ${name.text}${required ? "" : "?"}`);
    }
    out.separate();
    for (const { name, front, back } of cards) {
      out.print(`card ${name.text}`);
      out.separate();
      out.print("front");
      out.print(front.text);
      out.print("~~~");
      out.separate();
      out.print("back");
      out.print(back.text);
      out.print("~~~");
      out.separate();
    }
    if (styles != null) {
      out.print("styles");
      out.print(styles.text);
      out.print("~~~");
    }
  }
  return String(out);
}
