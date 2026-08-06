import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { deepEqual, equal } from "rich-assert";
import { ImageResolver } from "./image-resolver.ts";

let dir: string;

before(() => {
  dir = mkdtempSync(join(tmpdir(), "notatki-image-resolver-"));
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeAsset(name: string, data: string) {
  const path = join(dir, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

describe("resolve", () => {
  for (const mode of ["link", "inline", "copy"] as const) {
    test(`external urls are unchanged in mode "${mode}"`, () => {
      const resolver = new ImageResolver(mode, join(dir, "out/notes.html"));
      const resolve = resolver.forSource(join(dir, "src/card.note"));
      equal(resolve("https://example.test/asset.png"), "https://example.test/asset.png");
      equal(resolve("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
      deepEqual(resolver.warnings, []);
    });
  }
});

describe("link", () => {
  test("resolves to a relative path", () => {
    const resolver = new ImageResolver("link", join(dir, "out/notes.html"));
    const resolve = resolver.forSource(join(dir, "src/card.note"));
    makeAsset("src/img/asset.png", "data");
    equal(resolve("img/asset.png"), "../src/img/asset.png");
    deepEqual(resolver.warnings, []);
  });

  test("reports a missing local file", () => {
    const resolver = new ImageResolver("link", join(dir, "out/notes.html"));
    const resolve = resolver.forSource(join(dir, "src/card.note"));
    equal(resolve("missing.png"), "missing.png");
    deepEqual(resolver.warnings, ['Missing image "missing.png".']);
  });
});

describe("inline", () => {
  test("embeds the file as a data url", () => {
    const resolver = new ImageResolver("inline", join(dir, "out/notes.html"));
    const resolve = resolver.forSource(join(dir, "src/card.note"));
    makeAsset("src/img/asset.png", "data");
    equal(resolve("img/asset.png"), `data:image/png;base64,ZGF0YQ==`);
    deepEqual(resolver.warnings, []);
  });

  test("falls back to a relative link for an unrecognized extension", () => {
    const resolver = new ImageResolver("inline", join(dir, "out/notes.html"));
    const resolve = resolver.forSource(join(dir, "src/card.note"));
    makeAsset("src/img/asset.bin", "data");
    equal(resolve("img/asset.bin"), "../src/img/asset.bin");
    deepEqual(resolver.warnings, ['Unrecognized image type ".bin" for "asset.bin"; linking instead of inlining.']);
  });
});

describe("copy", () => {
  test("copies the file with a hashed name", () => {
    const resolver = new ImageResolver("copy", join(dir, "out/notes.html"));
    const resolve = resolver.forSource(join(dir, "src/card.note"));
    makeAsset("src/img/asset.png", "data");
    equal(resolve("img/asset.png"), "notes.assets/asset-3a6eb0790f.png");
    equal(readFileSync(join(dir, "out/notes.assets/asset-3a6eb0790f.png"), "utf-8"), "data");
    deepEqual(resolver.warnings, []);
  });

  test("reuses the same name for the same file referenced twice", () => {
    const resolver = new ImageResolver("copy", join(dir, "out/notes.html"));
    const resolve = resolver.forSource(join(dir, "src/card.note"));
    makeAsset("src/img1/asset.png", "data");
    makeAsset("src/img2/asset.png", "data");
    equal(resolve("img1/asset.png"), "notes.assets/asset-3a6eb0790f.png");
    equal(resolve("img2/asset.png"), "notes.assets/asset-3a6eb0790f.png");
    equal(readFileSync(join(dir, "out/notes.assets/asset-3a6eb0790f.png"), "utf-8"), "data");
    deepEqual(resolver.warnings, []);
  });

  test("computes unique hashes in file names for the same stem", () => {
    const resolver = new ImageResolver("copy", join(dir, "out/notes.html"));
    const resolve = resolver.forSource(join(dir, "src/card.note"));
    makeAsset("src/img1/asset.png", "one");
    makeAsset("src/img2/asset.png", "two");
    const first = resolve("img1/asset.png");
    const second = resolve("img2/asset.png");
    equal(first, "notes.assets/asset-7692c3ad35.png");
    equal(second, "notes.assets/asset-3fc4ccfe74.png");
    equal(readFileSync(join(dir, "out/notes.assets/asset-7692c3ad35.png"), "utf-8"), "one");
    equal(readFileSync(join(dir, "out/notes.assets/asset-3fc4ccfe74.png"), "utf-8"), "two");
    deepEqual(resolver.warnings, []);
  });
});
