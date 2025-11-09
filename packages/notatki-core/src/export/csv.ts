import { formatField } from "@notatki/format";
import { type NoteList } from "../note.js";

export type ExportCsvOptions = {
  signal?: AbortSignal;
};

export async function exportCsv(
  col: NoteList,
  { signal = new AbortController().signal }: Readonly<ExportCsvOptions> = {},
): Promise<string> {
  if (signal.aborted) {
    throw new Error("Aborted");
  }
  const lines = [];
  lines.push(`#separator:semicolon`);
  lines.push(`#html:true`);
  lines.push(`#guid column:1`);
  lines.push(`#notetype column:2`);
  lines.push(`#deck column:3`);
  lines.push(`#tags column:4`);
  for (const note of col) {
    const fields = [...note].map(({ value }) => formatField(value));
    lines.push([note.id, note.type.name, note.deck, note.tags, ...fields].map(escape).join(";"));
  }
  lines.push("");
  return lines.join("\n");
}

function escape(value: string | null): string {
  if (value == null) {
    return "";
  }
  if (value.includes(";") || value.includes("\n") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
