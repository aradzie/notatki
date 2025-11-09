import { styleText } from "node:util";
import { ParseError } from "@notatki/core";
import { Command } from "commander";
import { exportCmd } from "./cmd-export.js";
import { insertIdCmd } from "./cmd-insert-id.js";
import { reformatCmd } from "./cmd-reformat.js";
import { syncCmd } from "./cmd-sync.js";
import { pathTo } from "./io.js";

const program = new Command();

program.configureOutput({
  outputError: (str, write) => write(styleText("red", str)),
});

program
  .name("notatki")
  .description("Build Anki notes from text files written in a human readable format.")
  .version("0.0.0");

program
  .command("sync")
  .description("build and synchronize notes with the desktop Anki application through the Anki Connect protocol")
  .option("--dir <dir>", "name of the directory with note source files", parsePath, parsePath("."))
  .action(syncCmd);

program
  .command("export")
  .description("build and export notes to a file in the format that can be imported to Anki")
  .option("--dir <dir>", "name of the directory with note source files", parsePath, parsePath("."))
  .option("--out <file>", "output file name", parsePath, parsePath("notes"))
  .option("--preview", "whether to generate a preview HTML file", false)
  .option("--csv", "output a CSV file")
  .option("--json", "output a JSON file")
  .action(exportCmd);

program
  .command("insert-id")
  .description("insert unique note id to each note")
  .option("--dir <dir>", "name of the directory with note source files", parsePath, parsePath("."))
  .action(insertIdCmd);

program
  .command("reformat")
  .description("reformat note files")
  .option("--dir <dir>", "name of the directory with note source files", parsePath, parsePath("."))
  .action(reformatCmd);

try {
  program.parse();
} catch (err) {
  if (err instanceof ParseError) {
    const lines = [];
    for (const { message, location } of err.errors) {
      lines.push(`${String(location.source)}:${location.start.line}:${location.start.column}: ${message}`);
    }
    program.error(lines.join("\n"));
  } else {
    throw err;
  }
}

function parsePath(value: string): string {
  return pathTo(value);
}
