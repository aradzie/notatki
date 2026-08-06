import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, parse, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type ImageResolverCallback } from "@notatki/format";

export type ImageMode = "link" | "inline" | "copy";

const imageMimeTypes: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

/**
 * Rewrites local image references found while rendering note fields, per
 * `mode`:
 * - `link`: resolves to a path relative to `outPath`, so the reference keeps
 *   working whether the HTML is opened as a local file or served over HTTP,
 *   without copying anything. Falls back to an absolute `file://` URL when
 *   no `outPath` is given, since there's nothing to be relative to.
 * - `inline`: embeds the file as a `data:` URL.
 * - `copy`: copies the file into an assets folder next to `outPath` (named
 *   `<basename>.assets`), deduplicated by content hash, and resolves to a
 *   relative path into that folder.
 *
 * Images with their own scheme (an absolute URL, a `data:` URL, ...) and
 * references that don't resolve to a file on disk are left untouched;
 * problems are recorded in `warnings` rather than thrown, so one broken
 * reference doesn't stop the rest of the preview from being generated.
 */
export class ImageResolver {
  readonly #mode: ImageMode;
  readonly #outDir: string;
  readonly #assetsDirName: string;
  readonly #assetsDir: string;
  readonly #warnings: string[] = [];
  readonly #copied = new Map<string, string>();

  constructor(mode: ImageMode, outPath: string) {
    this.#mode = mode;
    const { dir, name } = parse(outPath);
    this.#outDir = dir;
    this.#assetsDirName = `${name}.assets`;
    this.#assetsDir = join(dir, this.#assetsDirName);
  }

  get warnings(): readonly string[] {
    return this.#warnings;
  }

  /** Returns a rewrite function bound to the file that field values in `sourcePath` are relative to. */
  forSource(sourcePath: string): ImageResolverCallback {
    const baseUri = pathToFileURL(sourcePath).href;
    return (href) => this.#resolve(href, baseUri);
  }

  #resolve(href: string, baseUri: string): string {
    let url: URL;
    try {
      url = new URL(href, baseUri);
    } catch {
      return href;
    }
    if (url.protocol !== "file:") {
      return href;
    }

    const fsPath = fileURLToPath(url);
    if (!existsSync(fsPath)) {
      this.#warnings.push(`Missing image "${href}".`);
      return href;
    }

    switch (this.#mode) {
      case "link":
        return this.#link(fsPath);
      case "inline":
        return this.#inline(fsPath);
      case "copy":
        return this.#copy(fsPath);
    }
  }

  #link(fsPath: string): string {
    return relative(this.#outDir, fsPath).split(sep).join("/");
  }

  #inline(fsPath: string): string {
    const ext = extname(fsPath).toLowerCase();
    const mime = imageMimeTypes[ext];
    if (mime == null) {
      this.#warnings.push(`Unrecognized image type "${ext}" for "${basename(fsPath)}"; linking instead of inlining.`);
      return this.#link(fsPath);
    }
    const bytes = readFileSync(fsPath);
    return `data:${mime};base64,${bytes.toString("base64")}`;
  }

  #copy(fsPath: string): string {
    const existing = this.#copied.get(fsPath);
    if (existing != null) {
      return `${this.#assetsDirName}/${existing}`;
    }

    const bytes = readFileSync(fsPath);
    const filename = hashedName(fsPath, bytes);

    const assetsDir = this.#assetsDir!;
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, filename), bytes);

    this.#copied.set(fsPath, filename);
    return `${this.#assetsDirName}/${filename}`;
  }
}

function hashedName(fsPath: string, bytes: Buffer): string {
  const { name, ext } = parse(fsPath);
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  return `${name || "image"}-${digest}${ext.toLowerCase()}`;
}
