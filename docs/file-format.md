# Notatki File Format

This document describes the text format used by Notatki note files (`.note`) and model files (`.model`).

## Overview

The format is intentionally line-oriented. Each significant line starts with a keyword-like prefix that identifies its
role. Blank lines and indentation are mostly cosmetic and are ignored in many places.

There are two file types:

- `.model`: defines note types, fields, card templates, and shared CSS.
- `.note`: defines note instances that reference a model and provide concrete field values.

Both file types can contain multiple top-level entries in a single file.

## Common Rules

### Reserved multiline terminator

The line `~~~` ends:

- a note entry in `.note` files
- a multiline `front`, `back`, or `styles` block in `.model` files

The parser treats `~~~` as structural syntax, not content.

### Field-name syntax

Field names are fairly permissive. They may contain:

- letters
- digits
- `_`
- `-`
- spaces or tabs between name segments

Whitespace inside field names is normalized to single spaces by the grammar.

Examples of valid field names:

- `Front`
- `Back Extra`
- `A_B C 0-9`

## Model Files

### Purpose

A `.model` file defines one or more Anki note types. Each model can declare:

- a name
- an optional `cloze` flag
- a list of fields
- a list of cards
- optional shared CSS styles

### Model structure

Each model starts with a header:

```text
model <model name>
```

The model name is read as normal text on that line. Repeated internal whitespace is normalized to single spaces.

After that, the model may contain:

- zero or one `cloze` line
- zero or more `field` lines
- zero or more `card` sections
- zero or one `styles` section

The general order is fixed:

1. `model`
2. optional `cloze`
3. `field` entries
4. `card` entries
5. optional `styles`

### `cloze`

The line:

```text
cloze
```

marks the model as a cloze note type.

### Fields

Field declarations use:

```text
field <field name>
field <field name>?
```

Rules:

- a field without `?` is required
- a field with trailing `?` is optional
- the `?` is part of the field declaration syntax, not part of the field name

Examples:

```text
field Front
field Back
field Related?
field Extra?
```

In the examples above:

- `Front` and `Back` are required
- `Related` and `Extra` are optional

### Cards

Each card section starts with:

```text
card <card name>
```

It must then contain exactly one `front` block and one `back` block, in that order.

```text
card Card 1

front
<front template body>
~~~

back
<back template body>
~~~
```

The text inside `front` and `back` is multiline text. Everything until the next `~~~` line belongs to that block.

### Styles

A model may include one shared CSS block:

```text
styles
<css>
~~~
```

Like card bodies, the CSS is captured as multiline text until `~~~`.

### Example model

```text
model Basic Math

field Front
field Back
field Related?
field Extra?

card Card 1

front
<div class="front">{{Front}}</div>
~~~

back
{{FrontSide}}
<hr>
<div class="back">{{Back}}</div>
~~~

styles
.front { text-align: center; }
~~~
```

### Semantic validation for models

- model names must be unique
- field names inside a model must be unique
- card names inside a model must be unique

## Note Files

### Purpose

A `.note` file defines concrete note instances. Each note carries:

- optional note properties
- field values
- a terminating `~~~`

Multiple notes may appear in one file.

### Note structure

A note is parsed as:

1. zero or more property lines
2. zero or more field lines
3. a required terminator line `~~~`

Blank lines may appear between properties, fields, and notes.

### Note properties

Property lines are special fields whose names are reserved and recognized case-insensitively:

```text
!type: <model name>
!deck: <deck name>
!tags: <space-separated tags or free text>
```

Recognized property names:

- `!type:`
- `!deck:`
- `!tags:`

These names are case-insensitive, so forms like `!TYPE:` and `!Tags:` are valid.

Property values are single-line text values. Repeated internal whitespace is normalized to single spaces.

### Regular fields

All note content fields use:

```text
!<field name>:<value>
```

Examples:

```text
!id: PjHgZNbLbL
!front: Quadratic Formula
!back: $$ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} $$
~~~
```

Important details:

- the field name starts immediately after `!`
- the field name ends at `:`
- field-name matching is case-insensitive
- the value may be empty

### Multiline field values

Field values can span multiple lines. The first line starts after the `:`. Continuation lines belong to the same field
until one of these is encountered:

- a new field line starting with `!<name>:`
- a note terminator line `~~~`

Example:

```text
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

The `front` field is parsed until the following `back` field, and the `back` field is parsed until note the terminator
`~~~`.

### Note terminator

Every note must end with:

```text
~~~
```

The terminator designates the end of all note fields. Within each note:

- all field names must be unique
- all required fields must be present

We chose the tilde character `~~~` because the dash character `---` is reserved for Markdown headers.

### Property inheritance across notes

At the higher-level note parser note properties act like persistent state. This means properties such as `type`, `deck`,
and `tags` continue to apply to following notes until changed.

This behavior is visible in the examples:

```text
!type: Basic
!deck: Math

!tags: Equation

!front: Quadratic Formula
!back: ...
~~~

!front: Euler's Formula
!back: ...
~~~

!tags: Definition

!front: Mean Value Theorem
!back: ...
~~~
```

Interpretation:

- the first two notes use `type = Basic`, `deck = Math`, and `tags = Equation`
- the third note keeps `type = Basic` and `deck = Math`, but overrides `tags` with `Definition`

### Example note files

Basic notes:

```text
!type: Basic
!deck: Math
!tags: Equation

!id: PjHgZNbLbL
!front: Quadratic Formula
!back: $$ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} $$
~~~
```

Cloze notes:

```text
!type: Cloze
!deck: Geography
!tags: Capitals

!id: tsjqWGG2sy
!text: The capital of {{c1::Mongolia::country}} is {{c2::Ulaanbaatar::city}}.
~~~
```

## LaTeX Math in Field Values

Field values (and card template bodies) are rendered as Markdown. Within that Markdown, LaTeX math is recognized as an
additional inline/block syntax layered on top of the usual Markdown rules, using two equivalent delimiter conventions:

- LaTeX-style: `\( ... \)` for inline math, `\[ ... \]` for display math.
- Dollar-style: `$...$` for inline math, `$$ ... $$` for display math.

### Inline math

`\( ... \)` and `$...$` are always single-line: the content between the delimiters may not contain a newline. This lets
inline math appear anywhere within a sentence, mixed freely with surrounding prose, exactly like `*emphasis*` or
`` `code` ``:

```text
!back: The area is \(A = \pi r^2\), where $r$ is the radius.
```

The `$...$` form additionally forbids whitespace immediately inside the delimiters (`$x$` matches, but `$ x$`, `$x $`,
and `$ x $` do not). This mirrors common Pandoc-style conventions and exists so that ordinary currency text like
"the $ symbol" or "$5 and $10" is not misread as math.

### Display math

`\[ ... \]` and `$$ ... $$` can be used two ways:

- **Inline, single line** — same as inline math above: embedded mid-sentence, no newline allowed inside the delimiters.
  Useful for a short display formula that still sits within a paragraph:
  `a \[x^2\] b`.
- **Block, multiple lines** — the opening delimiter must be the first thing on its line (nothing, not even whitespace,
  may precede it), and the closing delimiter must be followed by nothing but optional whitespace until the end of that
  line (or end of input). Between those two lines, the content may span any number of lines and contain anything at all,
  including text that looks like other Markdown block syntax:

  ```text
  !back:
  Solve:
  \[
  \begin{align*}
    e^{ix}  &= \cos x + i \sin x \\
    e^{-ix} &= \cos x - i \sin x
  \end{align*}
  \]
  ~~~
  ```

  If either requirement is not met — text before the opener on its line, or non-whitespace text after the closer on its
  line — the block form does not apply. What happens next depends on whether the whole span still fits on one line:
  `\[x\] omg` (single line) falls back to the inline form, rendering `x` as math followed by literal " omg";
  `\[\nx\n\] omg` (the delimiters span multiple lines _and_ the closer has trailing text) matches neither form, so it is
  left as ordinary paragraph text, with `\[` and `\]` reduced to literal `[` and `]` by Markdown's normal
  backslash-escape handling.

### Examples

Inline math, embedded mid-sentence:

```text
!back: By the Pythagorean theorem, \(a^2 + b^2 = c^2\), where $c$ is the hypotenuse.
~~~
```

Display math, single line, still embedded within a paragraph:

```text
!back: Squaring both sides gives \[a^2 + b^2 = c^2\] directly.
~~~
```

Display math, standalone block, spanning multiple lines:

```text
!back:
Solve for `x`:
\[
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\]
~~~
```

### Why the block form exists

Markdown is normally parsed in two stages: the document is first split into blocks — headings, lists, blockquotes, code
fences, horizontal rules, tables, paragraphs — and only afterward does formatting _within_ each block (bold, italic,
code spans, and ordinary single-line math) get recognized. Anything that spans across what looks like a block boundary
is at risk of being cut apart before formatting even has a chance to look at it.

That is a problem for math spanning multiple lines: if a `\[ ... \]` span contains, say, a line of
`=` characters (which looks like a heading underline), or a line starting with `-` or `>` (which looks like a list item
or blockquote), plain single-line math would never even see that content as one piece — the document would already have
been split apart at that line, tearing the formula in two. This is not specific to headings: any line that merely
resembles the start of a list, a blockquote, a horizontal rule, a table row, or similar, would do the same if it
happened to fall inside a multi-line formula.

To make multi-line math robust against this, the standalone block form is recognized before those other block boundaries
are considered, so it claims its entire span — delimiter to delimiter — up front. Its content is treated as raw math
source and is never re-parsed as Markdown, so anything inside it that merely resembles other syntax (list markers,
blockquote markers, heading-like lines, and so on) is preserved literally as part of the formula rather than being
reinterpreted.

This is also why the opening delimiter must start a fresh line: a standalone block, by its nature, can never begin
partway through a line of prose — that is what makes it a block rather than a sentence fragment. The closing delimiter's
"nothing but whitespace" requirement mirrors this from the other end — it distinguishes "this line closes a standalone
math block" from "math happens to end partway through a line that continues with more prose," which is what the inline
form is for.

### Rendering

- Inline math (`\( \)`, `$ $`) is rendered as a `<span>` with CSS `display: inline`, so it flows with the surrounding
  text like any other inline element.
- Display math (`\[ \]`, `$$ $$`), in both its inline-single-line and standalone-block forms, is rendered as a `<span>`
  with CSS `display: block`, giving it its own block-level box set apart from surrounding text, regardless of which of
  the two forms matched it.

## Error conditions worth knowing

Examples of syntax errors:

- unexpected non-whitespace text outside a valid entry
- missing `~~~` terminator for a note or multiline block
- malformed model structure order

Examples of semantic errors:

- unknown note type
- unknown field
- duplicate model
- duplicate field in a model
- duplicate field in a note
- duplicate note id

## Practical authoring guidance

- Put shared note-type definitions in `.model` files.
- Put actual flashcards in `.note` files.
- Use one `~~~` line to terminate every note and every multiline model block.
- Define `!type`, `!deck`, and `!tags` only when they need to change.
- Keep field names consistent between model and note files.
- For optional fields in models, add `?` to the declaration line.
- For multiline field values in notes, start the content after the `:` and continue until the next field or `~~~`.
