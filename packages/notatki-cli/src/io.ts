import { glob, stat } from "node:fs/promises";
import { format, join, parse, resolve } from "node:path";

const cwd = process.cwd();

export function pathTo(...parts: string[]): string {
  return resolve(cwd, ...parts);
}

export function withExt(path: string, ext: string): string {
  return format({ ...parse(path), base: undefined, ext });
}

export type FileType = "note" | "model" | "other";

export function classify(path: string): FileType {
  switch (true) {
    case path.endsWith(".note"):
      return "note";
    case path.endsWith(".model"):
      return "model";
    default:
      return "other";
  }
}

export abstract class PathError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(message);
    this.path = path;
  }
}

export class PathNotFoundError extends PathError {
  constructor(path: string) {
    super(path, `No such file or directory: "${path}"`);
    this.name = "PathNotFoundError";
  }
}

export class UnsupportedFileTypeError extends PathError {
  constructor(path: string) {
    super(path, `Not a .note or .model file: "${path}"`);
    this.name = "UnsupportedFileTypeError";
  }
}

export class FileFinder {
  static readonly defaultExclude = ["**/.git", "**/.hg", "**/.svn", "**/node_modules"];

  #exclude: readonly string[] = FileFinder.defaultExclude;
  #notePaths = new Set<string>();
  #modelPaths = new Set<string>();

  withExclude(exclude: readonly string[]): this {
    this.#exclude = exclude;
    return this;
  }

  async find(paths: readonly string[]): Promise<this> {
    for (const rawPath of paths) {
      const path = pathTo(rawPath);
      const stats = await this.#stat(path);
      if (stats.isDirectory()) {
        for await (const item of glob("**/*.{note,model}", { cwd: path, exclude: this.#exclude })) {
          this.#addPath(join(path, item));
        }
      } else if (!this.#addPath(path)) {
        throw new UnsupportedFileTypeError(path);
      }
    }
    return this;
  }

  async #stat(path: string) {
    try {
      return await stat(path);
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "ENOENT") {
        throw new PathNotFoundError(path);
      }
      throw err;
    }
  }

  #addPath(path: string): boolean {
    switch (classify(path)) {
      case "note":
        this.#notePaths.add(path);
        return true;
      case "model":
        this.#modelPaths.add(path);
        return true;
      case "other":
        return false;
    }
  }

  get notePaths(): string[] {
    return [...this.#notePaths].sort();
  }

  get modelPaths(): string[] {
    return [...this.#modelPaths].sort();
  }
}
