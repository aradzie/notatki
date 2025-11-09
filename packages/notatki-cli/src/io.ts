import { glob } from "node:fs/promises";
import { format, join, parse, resolve } from "node:path";

const cwd = process.cwd();

export function pathTo(...parts: string[]): string {
  return resolve(cwd, ...parts);
}

export function withExt(path: string, ext: string): string {
  return format({ ...parse(path), base: undefined, ext });
}

export async function findNoteFiles(
  dir: string,
  exclude: readonly string[] = ["**/.git", "**/.hg", "**/.svn", "**/node_modules"],
) {
  const notePaths: string[] = [];
  const modelPaths: string[] = [];
  const cwd = pathTo(dir);
  for await (const item of glob("**/*.{note,model}", { cwd, exclude })) {
    const path = join(cwd, item);
    switch (true) {
      case item.endsWith(".note"):
        notePaths.push(path);
        break;
      case item.endsWith(".model"):
        modelPaths.push(path);
        break;
    }
  }
  notePaths.sort();
  modelPaths.sort();
  return { notePaths, modelPaths };
}
