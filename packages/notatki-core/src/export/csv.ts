import { formatField } from "@notatki/format";
import { type NoteList } from "../note.js";

export async function exportCsv(col: NoteList): Promise<string> {
  let width = 0;
  for (const note of col) {
    width = Math.max(width, note.type.fields.length);
  }
  const lines = [];
  lines.push("#separator:semicolon");
  lines.push("#html:true");
  lines.push("#guid column:1");
  lines.push("#notetype column:2");
  lines.push("#deck column:3");
  lines.push("#tags column:4");
  for (const note of col) {
    const fields = new Array(width + 4).fill("");
    let index = 0;
    fields[index++] = note.id;
    fields[index++] = note.type.name;
    fields[index++] = note.deck;
    fields[index++] = note.tags;
    for (const field of note) {
      fields[index++] = formatField(field.value);
    }
    lines.push(fields.map(escape).join(";"));
  }
  lines.push("");
  return lines.join("\n");
}

exportCsv.ext = "txt";

function escape(value: string | null): string {
  if (value == null) {
    return "";
  }
  if (value.includes(";") || value.includes("\n") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
