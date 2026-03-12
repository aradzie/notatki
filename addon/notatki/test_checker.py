from .checker import Checker
from .data import (
  FieldNode,
  Location,
  ModelCardNode,
  ModelFieldNode,
  ModelNodes,
  NoteNodes,
  ParseError,
  PropertyNode,
)


def test_checker_reports_duplicate_model_names_case_insensitively() -> None:
  checker = Checker()

  checker.check_models([
    ModelNodes(path="a.model", line=1, name="Basic"),
    ModelNodes(path="b.model", line=1, name="basic"),
  ])

  assert checker.errors == [
    ParseError(path="b.model", line=1, message="Duplicate model 'basic'."),
  ]


def test_checker_reports_duplicate_model_fields_and_cards_case_insensitively() -> None:
  checker = Checker()

  checker.check_models([
    ModelNodes(
      path="a.model",
      line=1,
      name="Basic",
      fields=[
        ModelFieldNode(path="a.model", line=2, name="Front"),
        ModelFieldNode(path="a.model", line=3, name="front"),
      ],
      cards=[
        ModelCardNode(path="a.model", line=4, name="Card 1"),
        ModelCardNode(path="a.model", line=5, name="card 1"),
      ],
    ),
  ])

  assert checker.errors == [
    ParseError(path="a.model", line=3, message="Duplicate field 'front'."),
    ParseError(path="a.model", line=5, message="Duplicate card 'card 1'."),
  ]


def test_checker_reports_missing_fields() -> None:
  checker = Checker()

  checker.check_notes([
    NoteNodes(
      type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
      deck=PropertyNode(path="a.note", line=2, name="deck", value="Default"),
      tags=PropertyNode(path="a.note", line=3, name="tags", value=""),
      end=Location(path="a.note", line=4),
    ),
  ])

  assert checker.errors == [
    ParseError(path="a.note", line=4, message="Note must have an id field."),
    ParseError(path='a.note', line=4, message='Note must have at least one model field.'),
  ]


def test_checker_reports_duplicate_note_ids() -> None:
  checker = Checker()

  checker.check_notes([
    NoteNodes(
      type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
      deck=PropertyNode(path="a.note", line=2, name="deck", value="Default"),
      tags=PropertyNode(path="a.note", line=3, name="tags", value=""),
      guid=FieldNode(path="a.note", line=4, name="id", value="123"),
      fields=[FieldNode(path="a.note", line=5, name="front", value="Q")],
      end=Location(path="a.note", line=6),
    ),
    NoteNodes(
      type=PropertyNode(path="b.note", line=1, name="type", value="Basic"),
      deck=PropertyNode(path="b.note", line=2, name="deck", value="Default"),
      tags=PropertyNode(path="b.note", line=3, name="tags", value=""),
      guid=FieldNode(path="b.note", line=4, name="id", value="123"),
      fields=[FieldNode(path="b.note", line=5, name="front", value="Q")],
      end=Location(path="b.note", line=6),
    ),
  ])

  assert checker.errors == [
    ParseError(
      path="a.note",
      line=4,
      message="Duplicate note id '123' at a.note:4, b.note:4.",
    ),
  ]
