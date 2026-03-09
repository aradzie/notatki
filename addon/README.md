# Notatki text notes importer addon for Anki

Create Anki notes using **plain text files and Markdown**, then import them directly into Anki.

This addon is designed for people who love Anki’s spaced repetition system but prefer writing and managing notes in
a **normal text editor** instead of Anki’s built-in editor.

It enables a workflow where you:

1. Write notes in a simple human-readable text-based format.
2. Store them in a regular directory.
3. Import them into Anki automatically.

This makes it possible to:

- Use a real editor like Visual Studio Code.
- Version control your notes with Git.
- Collaborate with others.
- Avoid Anki’s proprietary binary deck format.

## Motivation

Anki is an excellent spaced repetition system, but creating and managing notes has several drawbacks:

- The built-in note editor UI is inconvenient for large-scale note creation.
- Decks are distributed in a binary `.apkg` format, which makes:
  - version control difficult
  - collaboration difficult
  - reviewing changes impossible

This addon solves those problems by allowing notes to be written in plain text files.

## How It Works

The addon imports notes from a directory containing text files written in a simple human-readable format.

Each file contains a list of note records.

Each record is written in Markdown, which allows:

- formatting
- LaTeX math
- images

The addon:

1. Asks the user to select a directory containing note files.
2. Recursively scans the directory.
3. Parses the note records.
4. Creates or updates Anki notes.

## Example Note Files

File `astronomy.note`:

```
!type: Basic
!deck: Astronomy

!front: The first planet from the Sun.
!back: Mercury
~~~

!front: The second planet from the Sun.
!back: Venus
~~~

!front: The largest planet in the Solar System.
!back: Jupiter
~~~
```

File `geography.note`:

```
!type: Cloze
!deck: Geography
!tags: Capitals

!text: The capital of {{c1::Mongolia::country}} is {{c2::Ulaanbaatar::city}}.
~~~

!text: The capital of {{c1::Syria::country}} is {{c2::Damascus::city}}.
~~~
```

File `math.note`:

```
!type: Basic
!deck: Math
!tags: Algebra

!front: Quadratic Formula
!back: $$ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} $$
~~~

!front: Euler's Formula
!back:
$$
\begin{align*}
    e^{ix}  &= \cos x + i \sin x \\
    e^{-ix} &= \cos x - i \sin x
\end{align*}
$$
~~~
```

## Workflow

Typical workflow:

1. Write notes in your editor.

```
notes/
  calculus.note
  algebra.note
  trigonometry.note
```

2. Version control them.

```
git add notes
git commit
```

3. Import into Anki using the addon.

```
File → Import Notatki...
```

4. Select the directory with your notes.

The addon will parse and import everything.

5. Maybe share your notes with others. Let them collaborate and contribute new notes.

## Visual Studio Code Extension

To make writing notes easier, a
companion [VS Code extension](https://marketplace.visualstudio.com/items?itemName=aradzie.notatki) is available.

The extension provides:

- syntax highlighting for note files
- auto-completion
- structural validation
- note preview on the side

This makes writing Anki notes feel like writing documentation.
