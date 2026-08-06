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
- `--csv` — output a CSV file instead of an `.apkg` file
- `--preview` — additionally generate an HTML preview of the notes

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

## Notes

- Passing a path that doesn't exist, or a file whose extension isn't `.note`/`.model`, is an error.
