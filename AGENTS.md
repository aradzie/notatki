# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Notatki lets people write Anki flashcards as plain text files (`.note` for note instances, `.model` for note-type
definitions) instead of using Anki's binary `.apkg` format, so notes can live in a normal editor and under version
control. The repo is an npm workspaces monorepo (managed with Lerna) plus one standalone Python package (the Anki
addon). The file format itself is documented in `docs/file-format.md` — read it before touching any parser, printer, or
reformatter code.

## Repo layout

- `packages/notatki-parser` — Peggy (PEG.js) grammar (`parser.peggy`) that parses `.note`/`.model` text into a raw CST
  (`ParseNodes` in `nodes.d.ts`). This is the only package with a grammar file; everything downstream consumes its
  generated parser.
- `packages/notatki-format` — Markdown + KaTeX rendering of field values into HTML (`format-field.ts`).
- `packages/notatki-core` — the domain layer built on top of the raw parser output: `model.ts`/`note.ts` (in-memory
  model/note representations), `note-parser.ts` (turns CST nodes into `Note`/`NoteList` objects, applying property
  inheritance — see below), `print-*-nodes.ts` and `reformat-*-nodes.ts` (serialize nodes back to text, used for
  auto-formatting), and `export/` (Anki `.apkg` export via `anki.ts`, CSV export via `csv.ts`).
- `packages/notatki-preview` — renders a note collection to HTML for the live preview panel (`preview-renderer.ts`,
  `card-templates.ts` for Anki `{{Field}}`/conditional template substitution).
- `packages/notatki-cli` — the `notatki` CLI (`commander`-based) exposing export/reformat/insert-id commands over
  `notatki-core`.
- `vscode/` — the VS Code extension, split into three packages that together implement the standard VS Code
  extension-host/webview split:
  - `vscode/protocol` — shared TypeScript types and message definitions for the two-way communication between the
    extension host and the webview. Neither side talks to the other except through these types; changing a message shape
    means updating both `vscode/extension` and `vscode/webview` together.
  - `vscode/extension` — the extension host: language registration, commands (preview, export, insert-id), completions,
    diagnostics, and the webview panel lifecycle. Runs in the Node/VS Code host process. Built with esbuild.
  - `vscode/webview` — a single-page React app rendered inside the VS Code webview panel; this is the note
    preview/editor UI. Runs in a sandboxed webview, so it can only reach the extension host by posting messages typed
    via `vscode/protocol`. Built with esbuild.
- `addon/notatki` — **an independent Python reimplementation** of the parser/printer/checker, used by the Anki addon
  itself (Anki addons must be self-contained Python, so this can't just depend on the npm packages). See the
  "Two parser implementations" note below.
- `examples/` — sample `.note`/`.model` files, handy for manual testing across both implementations.
- `docs/file-format.md` — the format specification; the source of truth for parser/printer behavior in both language
  implementations.

## Two parser implementations — keep them in sync

The `.note`/`.model` grammar is implemented **twice**: once in `packages/notatki-parser` (Peggy grammar, used by the
CLI/VS Code extension) and once by hand in `addon/notatki/parser.py` (used by the Anki addon, which cannot pull in the
JS toolchain). When changing parsing/validation rules (e.g. field-name syntax, property inheritance, terminator
handling), update `docs/file-format.md` and both implementations, and update the corresponding tests
(`packages/notatki-parser/*.test.js` and `addon/notatki/test_parser.py`) together.

## Property inheritance

Note properties (`!type:`, `!deck:`, `!tags:`) behave like persistent parser state: once set, they carry forward to
subsequent notes in the same file until overridden. This is implemented in both `note-parser.ts` (TS) and
`import_state.py` (Python) — see `docs/file-format.md` § "Property inheritance across notes" for the exact semantics
before modifying either.

## Common commands

Run from the repo root unless noted. `npm ci` first if `node_modules` isn't set up.

```shell
npm run compile          # compile all workspaces (peggy grammar, tsc, etc.)
npm run build            # build all workspaces (bundling, packaging)
npm test                 # run tests in all workspaces
npm run lint             # eslint over the whole repo
npm run lint-fix         # eslint with autofix over the whole repo
npm run stylelint        # stylelint over the whole repo
npm run stylelint-fix    # stylelint with autofix over the whole repo
npm run format           # prettier --write
```

Per-workspace, from that workspace's directory:

```shell
npm run compile          # e.g. packages/notatki-parser regenerates parser.js from parser.peggy
npm test                 # node's built-in test runner (node --test)
```

Run a single JS/TS test file (from inside its package directory):

```shell
node --test src/note-parser.test.ts
node --test parse-notes.test.js
```

Anki addon (Python, managed with `uv`), from `addon/`:

```shell
uv sync                  # postinstall hook does this automatically
uv run pytest            # all Python tests
uv run pytest notatki/test_parser.py -k some_test    # single test
./build.sh               # build the .ankiaddon package
```

VS Code extension, from `vscode/extension/`:

```shell
npm run watch            # esbuild watch mode for dev
npm run installext       # package (vsce) and install into local VS Code
```

## Conventions

- All TS/JS packages use `"type": "module"` — ESM only, import paths need explicit `.js` extensions in source.
- Shared TS compiler options live in `tsconfig-template.json` (strict, `noUncheckedIndexedAccess`, ESNext/NodeNext);
  per-package `tsconfig.json` files extend it.
- Workspace packages depend on each other via their published `@notatki/*` names (e.g. `@notatki/core` depends on
  `@notatki/parser` and `@notatki/format`) — npm workspaces symlink them locally.
