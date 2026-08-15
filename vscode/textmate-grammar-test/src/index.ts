import assert from "node:assert";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import oniguruma from "vscode-oniguruma";
import textmate, { type IGrammar, type IToken, type StateStack } from "vscode-textmate";

const { Registry, parseRawGrammar } = textmate;

let onigurumaWasmLoaded: Promise<void> | undefined;

export type TextMateSnapshotTestOptions = {
  readonly name: string;
  readonly grammarPath: string;
  readonly scopeName: string;
  readonly fixturesDir: string;
  readonly fixtureExtension: string;
  readonly updateSnapshotsEnvVar?: string;
};

export function runTextMateSnapshotTests(options: TextMateSnapshotTestOptions): void {
  const updateSnapshotsEnvVar = options.updateSnapshotsEnvVar ?? "UPDATE_GRAMMAR_SNAPSHOTS";
  let grammar: IGrammar;

  before(async () => {
    grammar = await loadGrammar(options.grammarPath, options.scopeName);
  });

  test(options.name, async (t) => {
    const names = await fixtureNames(options.fixturesDir, options.fixtureExtension);
    await assertSnapshotFilesMatchFixtures(options.fixturesDir, names, updateSnapshotsEnvVar);

    for (const name of names) {
      await t.test(name, async () => {
        const snapshot = await renderFixtureSnapshot(grammar, options, name);
        const snapshotPath = snapshotPathFor(options.fixturesDir, name);

        if (process.env[updateSnapshotsEnvVar] === "1") {
          await writeFile(snapshotPath, snapshot, "utf8");
          return;
        }

        assert.equal(snapshot, await readFile(snapshotPath, "utf8"));
      });
    }
  });
}

async function loadGrammar(grammarPath: string, scopeName: string): Promise<IGrammar> {
  await loadOnigurumaWasm();

  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (value) => new oniguruma.OnigString(value),
    }),
    loadGrammar: async (requestedScopeName) => {
      assert.equal(requestedScopeName, scopeName);
      const content = await readFile(grammarPath, "utf8");
      return parseRawGrammar(content, grammarPath);
    },
  });

  const grammar = await registry.loadGrammar(scopeName);
  if (grammar == null) {
    throw new Error(`Expected grammar for scope "${scopeName}" to load.`);
  }

  return grammar;
}

function loadOnigurumaWasm(): Promise<void> {
  onigurumaWasmLoaded ??= (async () => {
    const wasmPath = fileURLToPath(import.meta.resolve("vscode-oniguruma/release/onig.wasm"));
    const wasmBin = await readFile(wasmPath);
    await oniguruma.loadWASM(wasmBin);
  })();

  return onigurumaWasmLoaded;
}

async function fixtureNames(fixturesDir: string, fixtureExtension: string): Promise<string[]> {
  const names = (await readdir(fixturesDir)).filter((name) => name.endsWith(fixtureExtension)).sort();
  assert.notEqual(names.length, 0, `Expected at least one "${fixtureExtension}" TextMate grammar fixture.`);
  return names;
}

async function assertSnapshotFilesMatchFixtures(
  fixturesDir: string,
  fixtureNames: readonly string[],
  updateSnapshotsEnvVar: string,
): Promise<void> {
  if (process.env[updateSnapshotsEnvVar] === "1") {
    return;
  }

  const expected = fixtureNames.map((name) => snapshotNameFor(name));
  const actual = (await readdir(fixturesDir)).filter((name) => name.endsWith(".snap.txt")).sort();
  assert.deepEqual(actual, expected);
}

async function renderFixtureSnapshot(
  grammar: IGrammar,
  { fixturesDir, scopeName }: TextMateSnapshotTestOptions,
  name: string,
): Promise<string> {
  const source = await readFile(path.join(fixturesDir, name), "utf8");
  return serializeHighlightedSource(grammar, source, scopeName);
}

function snapshotNameFor(name: string): string {
  return `${name}.snap.txt`;
}

function snapshotPathFor(fixturesDir: string, name: string): string {
  return path.join(fixturesDir, snapshotNameFor(name));
}

function serializeHighlightedSource(grammar: IGrammar, source: string, baseScope: string): string {
  const lines = source.split("\n");
  let ruleStack: StateStack | null = null;

  return lines
    .map((line) => {
      const result = grammar.tokenizeLine(line, ruleStack);
      ruleStack = result.ruleStack;
      return serializeHighlightedLine(line, result.tokens, baseScope);
    })
    .join("\n");
}

function serializeHighlightedLine(line: string, tokens: readonly IToken[], baseScope: string): string {
  let openScopes: string[] = [];
  let out = "";

  for (const token of tokens) {
    const scopes = token.scopes.filter((scope) => scope !== baseScope);
    const common = commonPrefixLength(openScopes, scopes);

    out += closeTags(openScopes.slice(common));
    out += openTags(scopes.slice(common));
    out += escapeText(line.substring(token.startIndex, token.endIndex));
    openScopes = scopes;
  }

  out += closeTags(openScopes);
  return out;
}

function commonPrefixLength(a: readonly string[], b: readonly string[]): number {
  let length = 0;

  while (length < a.length && length < b.length && a[length] === b[length]) {
    length += 1;
  }

  return length;
}

function openTags(scopes: readonly string[]): string {
  return scopes.map((scope) => `<${scope}>`).join("");
}

function closeTags(scopes: readonly string[]): string {
  return scopes
    .toReversed()
    .map((scope) => `</${scope}>`)
    .join("");
}

function escapeText(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
