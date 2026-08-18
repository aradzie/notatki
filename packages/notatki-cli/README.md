# @notatki/cli

Command line tool for working with Anki notes written as plain text `.note`/`.model` files. See the
[file format documentation](../../docs/file-format.md) for the format itself.

## Installation

```shell
npm install --global @notatki/cli
```

This installs the `notatki` executable.

## Usage

```shell
notatki <command> [options] [paths...]
```

Every command takes a list of file and directory arguments:

- A file argument is used as-is; it must be a `.note` or `.model` file.
- A directory argument is scanned recursively for `.note` and `.model` files, skipping `.git`, `.hg`, `.svn`, and
  `node_modules`.
- If no arguments are given, the current directory is scanned.

Since arguments are plain paths, shell glob expansion works as expected:

```shell
notatki reformat **/*.note
```

### `notatki export [options] [paths...]`

Build and export notes to a file that can be imported into Anki.

```shell
notatki export notes/
```

Options:

- `--out <file>` — output file name, without extension (default: `notes`)
- `--format <apkg|csv>` — output file format (default: `apkg`)

### `notatki preview [options] [paths...]`

Build notes and generate an HTML preview of the cards.

```shell
notatki preview notes/
```

Options:

- `--out <file>` — output file name, without extension (default: `notes`)
- `--images <link|inline|copy>` — how to resolve local images referenced by notes (default: `link`)
  - `link` — rewrite to a path relative to the generated HTML file, pointing at the original file, unchanged on disk;
    works whether the HTML is opened locally or served over HTTP
  - `inline` — embed each image as a `data:` URL, producing a single self-contained (and larger) HTML file
  - `copy` — copy referenced images into a `<file>.assets/` folder next to the generated HTML and rewrite paths to point
    there, so the HTML and its folder can be moved or shared together
- `--tags <tags>` — comma-separated tags to filter by; prefix a tag with `-` to exclude notes with that tag. Can be
  repeated, with all tags combined with OR. A tag matches its own hierarchy prefix, so `--tags parent` also matches
  notes tagged `parent::child`.

```shell
notatki preview --tags french,spanish,-archived notes/
```

### `notatki insert-id [paths...]`

Insert a unique note ID into every note that doesn't already have one, editing the source `.note` files in place.

```shell
notatki insert-id notes/
```

### `notatki reformat [paths...]`

Reformat `.note` and `.model` files in place, using the canonical formatting.

```shell
notatki reformat notes/
```

### `notatki git-diff-init`

Configure the current git repository to show semantic diffs for `.note` files. This only affects your local checkout:
it sets `diff.notatki.command` in the repository's local git config and adds `*.note diff=notatki` to
`.git/info/attributes` — neither of which is tracked or shared with other clones, so it needs to be run once per
checkout (e.g. after cloning), the same way you'd run `npm install`. Safe to re-run.

```shell
notatki git-diff-init
```

The configured command records the exact `node` binary and script that ran `git-diff-init`, so this works whether
`notatki` is installed globally, run via `npx notatki git-diff-init`, or invoked from a local `node_modules/.bin`
— no reliance on `notatki` being on `PATH` afterwards. If that install later moves or is removed, re-run
`git-diff-init` to refresh it.

### `notatki git-diff <path> <old-file> <old-hex> <old-mode> <new-file> <new-hex> <new-mode>`

Compares two versions of a single `.note` file and prints a summary of added, removed, and changed notes. This isn't
meant to be run directly — it implements git's
[external diff driver interface](https://git-scm.com/docs/gitattributes#_defining_a_custom_diff_driver) and is wired
up automatically by `notatki git-diff-init`. Once configured, ordinary git commands use it for `.note` files:

```shell
notatki git-diff-init
git diff notes/example.note
```

Notes are matched between the old and new version by their `!id:` field; a note without an id is always shown as
removed-and-added rather than changed, even if its content is unchanged. `.model` files are not diffed.

## Notes

- Passing a path that doesn't exist, or a file whose extension isn't `.note`/`.model`, is an error.
