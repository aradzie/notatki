import { styleText } from "node:util";
import { ParseError } from "@notatki/core";
import { Command, Option } from "commander";
import { exportCmd } from "./cmd-export.ts";
import { gitDiffCmd } from "./cmd-git-diff.ts";
import { gitDiffInitCmd } from "./cmd-git-diff-init.ts";
import { insertIdCmd } from "./cmd-insert-id.ts";
import { previewCmd } from "./cmd-preview.ts";
import { reformatCmd } from "./cmd-reformat.ts";
import { CliError, pathTo } from "./io.ts";

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
  .addOption(new Option("--format <format>", "output file format").choices(["apkg", "csv"]).default("apkg"))
  .action(exportCmd);

program
  .command("preview")
  .description("build notes and generate an HTML preview of the cards")
  .argument("[paths...]", "note/model files or directories to search", [pathTo(".")])
  .option("--out <file>", "output file name", parsePath, parsePath("notes"))
  .addOption(
    new Option("--images <mode>", "how to resolve local images referenced by notes")
      .choices(["link", "inline", "copy"])
      .default("link"),
  )
  .option(
    "--tags <tags>",
    "comma-separated tags to filter by; prefix a tag with '-' to exclude notes with that tag " +
      "(can be repeated; all tags are combined with OR)",
    collectTags,
    [] as string[],
  )
  .action(previewCmd);

program
  .command("git-diff")
  .description("compare two versions of a .note file; intended to be configured as a git diff driver")
  .argument("<path>", "path of the file as known to git")
  .argument("<old-file>", "path to a file with the old file's contents, or /dev/null")
  .argument("<old-hex>", "old blob object name (unused)")
  .argument("<old-mode>", "old file mode (unused)")
  .argument("<new-file>", "path to a file with the new file's contents, or /dev/null")
  .argument("<new-hex>", "new blob object name (unused)")
  .argument("<new-mode>", "new file mode (unused)")
  .action(gitDiffCmd);

program
  .command("git-diff-init")
  .description("configure the local git repository to run `notatki git-diff` for .note files")
  .action(gitDiffInitCmd);

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
  } else if (err instanceof CliError) {
    program.error(err.message);
  } else {
    throw err;
  }
}

function parsePath(value: string): string {
  return pathTo(value);
}

function collectTags(value: string, previous: string[]): string[] {
  return previous.concat(value.split(",").map((tag) => tag.trim()));
}
