from .data import (
  NoteNodes,
  ParseError,
  PropertyNode,
  FieldNode,
  Location,
  ModelCardNode,
  ModelFieldNode,
  ModelNodes,
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
