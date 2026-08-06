import { styleText } from "node:util";
import { ParseError } from "@notatki/core";
import { Command } from "commander";
import { exportCmd } from "./cmd-export.ts";
import { insertIdCmd } from "./cmd-insert-id.ts";
import { reformatCmd } from "./cmd-reformat.ts";
import { PathError, pathTo } from "./io.ts";

const program = new Command();

program.configureOutput({
  outputError: (str, write) => write(styleText("red", str)),
});

program
  .name("notatki")
  .description("Build Anki notes from text files written in a human readable format.")
  .version("0.0.0");

program
  .command("export")
  .description("build and export notes to a file in the format that can be imported to Anki")
  .argument("[paths...]", "note/model files or directories to search", [pathTo(".")])
  .option("--out <file>", "output file name", parsePath, parsePath("notes"))
  .option("--preview", "whether to generate a preview HTML file", false)
  .option("--csv", "output a CSV file")
  .action(exportCmd);

program
  .command("insert-id")
  .description("insert unique note id to each note")
  .argument("[paths...]", "note files or directories to search", [pathTo(".")])
  .action(insertIdCmd);

program
  .command("reformat")
  .description("reformat note files")
  .argument("[paths...]", "note/model files or directories to search", [pathTo(".")])
  .action(reformatCmd);

try {
  await program.parseAsync();
} catch (err) {
  if (err instanceof ParseError) {
    const lines = [];
    for (const { message, location } of err.errors) {
      lines.push(`${String(location.source)}:${location.start.line}:${location.start.column}: ${message}`);
    }
    program.error(lines.join("\n"));
  } else if (err instanceof PathError) {
    program.error(err.message);
  } else {
    throw err;
  }
}

function parsePath(value: string): string {
  return pathTo(value);
}
