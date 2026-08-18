import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { git } from "./io.ts";

export async function gitDiffInitCmd(): Promise<void> {
  await configureDriverCommand();
  await configureAttributes();
}

async function configureDriverCommand() {
  const command = `FORCE_COLOR=1 ${shellQuote(process.execPath)} ${shellQuote(process.argv[1]!)} git-diff`;
  await git(["config", "diff.notatki.command", command]);
  console.log(`Set "diff.notatki.command" to "${command}" in the local git config.`);
}

async function configureAttributes() {
  const attributeLine = "*.note diff=notatki";
  const path = (await git(["rev-parse", "--git-path", "info/attributes"])).trim();
  const existing = await readAttributes(path);
  if (existing.split("\n").some((line) => line.trim() === attributeLine)) {
    console.log(`"${attributeLine}" is already present in "${path}".`);
  } else {
    await mkdir(dirname(path), { recursive: true });
    const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    await writeFile(path, `${existing}${prefix}${attributeLine}\n`);
    console.log(`Added "${attributeLine}" to "${path}".`);
  }
}

async function readAttributes(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return "";
    }
    throw err;
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
