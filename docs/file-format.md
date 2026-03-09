# Notatki File Format

This document describes the text format used by Notatki note files (`.note`) and model files (`.model`).

## Overview

The format is intentionally line-oriented.
Each significant line starts with a keyword-like prefix that identifies its role.
Blank lines and indentation are mostly cosmetic and are ignored in many places.

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

A `.model` file defines one or more Anki note types.
Each model can declare:

- a name
- a numeric id
- an optional `cloze` flag
- a list of fields
- a list of cards
- optional shared CSS styles

### Model structure

Each model starts with a header:

```text
model <model name>
```

The model name is read as normal text on that line.
Repeated internal whitespace is normalized to single spaces.

The next required line is the numeric id:

```text
id 12345
```

After that, the model may contain:

- zero or one `cloze` line
- zero or more `field` lines
- zero or more `card` sections
- zero or one `styles` section

The general order is fixed:

1. `model`
2. `id`
3. optional `cloze`
4. `field` entries
5. `card` entries
6. optional `styles`

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

The text inside `front` and `back` is multiline text.
Everything until the next `~~~` line belongs to that block.

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

id 7702450

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

A `.note` file defines concrete note instances.
Each note carries:

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

Property values are single-line text values.
Repeated internal whitespace is normalized to single spaces.

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

Field values can span multiple lines.
The first line starts after the `:`.
Continuation lines belong to the same field until one of these is encountered:

- a new field line starting with `!<name>:`
- a note terminator line `~~~`

Example:

```text
!front: Euler Formula
!back:
$$
\begin{align*}
    e^{ix}  &= \cos x + i \sin x \\
    e^{-ix} &= \cos x - i \sin x
\end{align*}
$$
~~~
```

The `front` field is parsed until the following `back` field, and the `back` field is parsed
until note the terminator `~~~`.

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

At the higher-level note parser note properties act like persistent state.
This means properties such as `type`, `deck`, and `tags` continue to apply to following notes until changed.

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
