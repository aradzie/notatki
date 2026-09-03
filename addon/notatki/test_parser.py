from .data import (
  FieldNode,
  Location,
  ModelCardNode,
  ModelFieldNode,
  ModelNodes,
  NoteNodes,
  ParseError,
  PropertyNode,
  TombstoneNode,
)
from .parser import ModelParser, NoteParser


def parse_note(*lines: str, path: str) -> NoteParser:
  parser = NoteParser(path=path)
  for line in lines:
    parser.push(line)
  parser.finish()
  return parser


def parse_model(*lines: str, path: str) -> ModelParser:
  parser = ModelParser(path=path)
  for line in lines:
    parser.push(line)
  parser.finish()
  return parser


def test_note_parser_parses_empty_file() -> None:
  parser = parse_note(path="deck/sample.note")

  assert parser.errors == []
  assert parser.notes == []


def test_model_parser_parses_empty_file() -> None:
  parser = parse_model(path="deck/sample.model")

  assert parser.errors == []
  assert parser.models == []


def test_note_parser_parses_properties_and_fields() -> None:
  parser = parse_note(
    "!type:  Basic ",
    "!deck:  Default  Deck ",
    "!tags:  One   Two  ",
    "!ID:   123  ",
    "!Front:   Question  ",
    "  continued text  ",
    "!Back:  Answer ",
    "~~~",
    path="deck/sample.note",
  )

  assert parser.errors == []
  assert parser.notes == [
    NoteNodes(
      path="deck/sample.note",
      line=4,
      type=PropertyNode(path="deck/sample.note", line=1, name="type", value="Basic"),
      deck=PropertyNode(path="deck/sample.note", line=2, name="deck", value="Default Deck"),
      tags=PropertyNode(path="deck/sample.note", line=3, name="tags", value="One Two"),
      guid=None,
      fields=[
        FieldNode(path="deck/sample.note", line=4, name="id", value="123"),
        FieldNode(path="deck/sample.note", line=5, name="front", value="Question\n  continued text"),
        FieldNode(path="deck/sample.note", line=7, name="back", value="Answer"),
      ],
      end=Location(path="deck/sample.note", line=8),
    ),
  ]


def test_note_parser_reports_duplicate_property() -> None:
  parser = parse_note(
    "!type: Basic",
    "!TYPE: Cloze",
    "!id: 123",
    "!Front: Question",
    "~~~",
    path="deck/duplicate-property.note",
  )

  assert parser.errors == [
    ParseError(
      path="deck/duplicate-property.note",
      line=2,
      message="Duplicate property 'type'.",
    ),
  ]
  assert parser.notes == [
    NoteNodes(
      path="deck/duplicate-property.note",
      line=3,
      type=PropertyNode(
        path="deck/duplicate-property.note",
        line=1,
        name="type",
        value="Basic",
      ),
      deck=PropertyNode(name="deck", value="Default"),
      tags=PropertyNode(name="tags", value=""),
      guid=None,
      fields=[
        FieldNode(path="deck/duplicate-property.note", line=3, name="id", value="123"),
        FieldNode(path="deck/duplicate-property.note", line=4, name="front", value="Question"),
      ],
      end=Location(path="deck/duplicate-property.note", line=5),
    ),
  ]


def test_note_parser_parses_tombstone() -> None:
  parser = parse_note(
    "!delete: abc123",
    path="deck/tombstone.note",
  )

  assert parser.errors == []
  assert parser.notes == []
  assert parser.tombstones == [
    TombstoneNode(path="deck/tombstone.note", line=1, guid="abc123"),
  ]


def test_note_parser_parses_consecutive_tombstones_and_falls_through_to_next_note() -> None:
  parser = parse_note(
    "!type: Basic",
    "!deck: Math",
    "!tags: Equation",
    "!delete: aaaaaaaaaa",
    "!delete: bbbbbbbbbb",
    "!front: Question",
    "!back: Answer",
    "~~~",
    path="deck/mixed.note",
  )

  assert parser.errors == []
  assert parser.tombstones == [
    TombstoneNode(path="deck/mixed.note", line=4, guid="aaaaaaaaaa"),
    TombstoneNode(path="deck/mixed.note", line=5, guid="bbbbbbbbbb"),
  ]
  assert parser.notes == [
    NoteNodes(
      path="deck/mixed.note",
      line=6,
      type=PropertyNode(path="deck/mixed.note", line=1, name="type", value="Basic"),
      deck=PropertyNode(path="deck/mixed.note", line=2, name="deck", value="Math"),
      tags=PropertyNode(path="deck/mixed.note", line=3, name="tags", value="Equation"),
      guid=None,
      fields=[
        FieldNode(path="deck/mixed.note", line=6, name="front", value="Question"),
        FieldNode(path="deck/mixed.note", line=7, name="back", value="Answer"),
      ],
      end=Location(path="deck/mixed.note", line=8),
    ),
  ]


def test_note_parser_discards_comments() -> None:
  parser = parse_note(
    "# top of file comment",
    "!type: Basic",
    "# comment between properties",
    "!deck: Math",
    "!tags: Equation",
    "# comment before fields",
    "!front: Question",
    "!back: Answer",
    "~~~",
    path="deck/commented.note",
  )

  assert parser.errors == []
  assert parser.tombstones == []
  assert parser.notes == [
    NoteNodes(
      path="deck/commented.note",
      line=7,
      type=PropertyNode(path="deck/commented.note", line=2, name="type", value="Basic"),
      deck=PropertyNode(path="deck/commented.note", line=4, name="deck", value="Math"),
      tags=PropertyNode(path="deck/commented.note", line=5, name="tags", value="Equation"),
      guid=None,
      fields=[
        FieldNode(path="deck/commented.note", line=7, name="front", value="Question"),
        FieldNode(path="deck/commented.note", line=8, name="back", value="Answer"),
      ],
      end=Location(path="deck/commented.note", line=9),
    ),
  ]


def test_note_parser_treats_hash_inside_field_as_content() -> None:
  parser = parse_note(
    "!front: Question",
    "# not a comment, this is content",
    "!back: Answer",
    "~~~",
    path="deck/comment-in-field.note",
  )

  assert parser.errors == []
  assert parser.notes == [
    NoteNodes(
      path="deck/comment-in-field.note",
      line=1,
      type=PropertyNode(name="type", value="Basic"),
      deck=PropertyNode(name="deck", value="Default"),
      tags=PropertyNode(name="tags", value=""),
      guid=None,
      fields=[
        FieldNode(
          path="deck/comment-in-field.note",
          line=1,
          name="front",
          value="Question\n# not a comment, this is content",
        ),
        FieldNode(path="deck/comment-in-field.note", line=3, name="back", value="Answer"),
      ],
      end=Location(path="deck/comment-in-field.note", line=4),
    ),
  ]


def test_note_parser_requires_no_whitespace_before_hash() -> None:
  parser = parse_note(
    " # indented, not a comment",
    path="deck/indented-hash.note",
  )

  assert parser.errors == [
    ParseError(
      path="deck/indented-hash.note",
      line=1,
      message="Unexpected text outside a multiline field.",
    ),
  ]
  assert parser.notes == []
  assert parser.tombstones == []


def test_note_parser_reports_delete_as_reserved_field_name() -> None:
  parser = parse_note(
    "!front: Question",
    "!delete: abc123",
    "!back: Answer",
    "~~~",
    path="deck/reserved-delete.note",
  )

  assert parser.errors == [
    ParseError(
      path="deck/reserved-delete.note",
      line=2,
      message="'delete' is a reserved field name.",
    ),
  ]
  assert parser.tombstones == []
  assert parser.notes == [
    NoteNodes(
      path="deck/reserved-delete.note",
      line=1,
      type=PropertyNode(name="type", value="Basic"),
      deck=PropertyNode(name="deck", value="Default"),
      tags=PropertyNode(name="tags", value=""),
      guid=None,
      fields=[
        FieldNode(path="deck/reserved-delete.note", line=1, name="front", value="Question"),
        FieldNode(path="deck/reserved-delete.note", line=3, name="back", value="Answer"),
      ],
      end=Location(path="deck/reserved-delete.note", line=4),
    ),
  ]


def test_model_parser_parses_complete_model_definition() -> None:
  parser = parse_model(
    "model   Basic   Card  ",
    "field   Front  ",
    "field   Back?  ",
    "card   Card   1  ",
    "front",
    "{{Front}}",
    "~~~",
    "back",
    "{{Back}}",
    "~~~",
    "styles",
    ".card { color: red; }",
    "~~~",
    path="models/basic.model",
  )

  assert parser.errors == []
  assert parser.models == [
    ModelNodes(
      path="models/basic.model",
      line=1,
      name="Basic Card",
      cloze=False,
      fields=[
        ModelFieldNode(
          path="models/basic.model",
          line=2,
          name="Front",
          required=True,
        ),
        ModelFieldNode(
          path="models/basic.model",
          line=3,
          name="Back",
          required=False,
        ),
      ],
      cards=[
        ModelCardNode(
          path="models/basic.model",
          line=4,
          name="Card 1",
          front="{{Front}}",
          back="{{Back}}",
        ),
      ],
      styles=".card { color: red; }",
    ),
  ]


def test_model_parser_parses_multiple_models() -> None:
  parser = parse_model(
    "model Basic",
    "field Front",
    "card Card 1",
    "front",
    "{{Front}}",
    "~~~",
    "back",
    "{{Back}}",
    "~~~",
    "model Cloze",
    "cloze",
    "field Text",
    "card Card 1",
    "front",
    "{{cloze:Text}}",
    "~~~",
    "back",
    "{{cloze:Text}}<br>{{Back Extra}}",
    "~~~",
    path="models/multiple.model",
  )

  assert parser.errors == []
  assert parser.models == [
    ModelNodes(
      path="models/multiple.model",
      line=1,
      name="Basic",
      cloze=False,
      fields=[
        ModelFieldNode(
          path="models/multiple.model",
          line=2,
          name="Front",
          required=True,
        ),
      ],
      cards=[
        ModelCardNode(
          path="models/multiple.model",
          line=3,
          name="Card 1",
          front="{{Front}}",
          back="{{Back}}",
        ),
      ],
      styles="",
    ),
    ModelNodes(
      path="models/multiple.model",
      line=10,
      name="Cloze",
      cloze=True,
      fields=[
        ModelFieldNode(
          path="models/multiple.model",
          line=12,
          name="Text",
          required=True,
        ),
      ],
      cards=[
        ModelCardNode(
          path="models/multiple.model",
          line=13,
          name="Card 1",
          front="{{cloze:Text}}",
          back="{{cloze:Text}}<br>{{Back Extra}}",
        ),
      ],
      styles="",
    ),
  ]
