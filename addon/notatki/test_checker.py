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
  TombstoneNode,
)


def test_checker_reports_duplicate_model_names_case_insensitively() -> None:
  checker = Checker()

  checker.check_models(
    [
      ModelNodes(path="a.model", line=1, name="Basic"),
      ModelNodes(path="b.model", line=1, name="BASIC"),
    ]
  )

  assert checker.errors == [
    ParseError(path="b.model", line=1, message="Duplicate model 'BASIC'."),
  ]


def test_checker_reports_duplicate_model_fields_and_cards_case_insensitively() -> None:
  checker = Checker()

  m1 = ModelNodes(
    path="a.model",
    line=1,
    name="Basic",
    fields=[
      ModelFieldNode(path="a.model", line=2, name="Front"),
      ModelFieldNode(path="a.model", line=3, name="FRONT"),
    ],
    cards=[
      ModelCardNode(path="a.model", line=4, name="Card 1"),
      ModelCardNode(path="a.model", line=5, name="CARD 1"),
    ],
  )

  checker.check_models([m1])

  assert checker.errors == [
    ParseError(path="a.model", line=3, message="Duplicate field 'FRONT'."),
    ParseError(path="a.model", line=5, message="Duplicate card 'CARD 1'."),
  ]


def test_checker_reports_missing_guid_field() -> None:
  checker = Checker()

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="Default"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value=""),
    end=Location(path="a.note", line=4),
  )

  checker.check_notes(notes=[n1], tombstones=[])

  assert checker.errors == [
    ParseError(path="a.note", line=4, message="Note must have an id field."),
    ParseError(path="a.note", line=4, message="Note must have at least one model field."),
  ]


def test_checker_reports_missing_model_fields() -> None:
  checker = Checker()

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="Default"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value=""),
    fields=[
      FieldNode(path="b.note", line=4, name="Id", value="123"),
    ],
    end=Location(path="a.note", line=4),
  )

  checker.check_notes(notes=[n1], tombstones=[])

  assert checker.errors == [
    ParseError(path="a.note", line=4, message="Note must have at least one model field."),
  ]


def test_checker_reports_duplicate_note_ids() -> None:
  checker = Checker()

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="Default"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value=""),
    guid=None,
    fields=[
      FieldNode(path="a.note", line=4, name="Id", value="123"),
      FieldNode(path="a.note", line=5, name="Front", value="Q"),
    ],
    end=Location(path="a.note", line=6),
  )
  n2 = NoteNodes(
    type=PropertyNode(path="b.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="b.note", line=2, name="deck", value="Default"),
    tags=PropertyNode(path="b.note", line=3, name="tags", value=""),
    guid=None,
    fields=[
      FieldNode(path="b.note", line=4, name="Id", value="123"),
      FieldNode(path="b.note", line=5, name="Front", value="Q"),
    ],
    end=Location(path="b.note", line=6),
  )

  checker.check_notes(notes=[n1, n2], tombstones=[])

  assert checker.errors == [
    ParseError(
      path="a.note",
      line=4,
      message="Duplicate note id '123' at a.note:4, b.note:4.",
    ),
  ]


def test_checker_reports_duplicate_id_between_note_and_tombstone() -> None:
  checker = Checker()

  note = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="Default"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value=""),
    guid=None,
    fields=[
      FieldNode(path="a.note", line=4, name="Id", value="123"),
      FieldNode(path="a.note", line=5, name="Front", value="Q"),
    ],
    end=Location(path="a.note", line=6),
  )
  tombstone = TombstoneNode(path="b.note", line=1, guid="123")

  checker.check_notes(notes=[note], tombstones=[tombstone])

  assert checker.errors == [
    ParseError(
      path="a.note",
      line=4,
      message="Duplicate note id '123' at a.note:4, b.note:1.",
    ),
  ]


def test_checker_reports_duplicate_id_between_two_tombstones() -> None:
  checker = Checker()

  checker.check_notes(
    notes=[],
    tombstones=[
      TombstoneNode(path="a.note", line=1, guid="123"),
      TombstoneNode(path="b.note", line=2, guid="123"),
    ],
  )

  assert checker.errors == [
    ParseError(
      path="a.note",
      line=1,
      message="Duplicate note id '123' at a.note:1, b.note:2.",
    ),
  ]


def test_checker_allows_a_single_tombstone_without_duplicates() -> None:
  checker = Checker()

  checker.check_notes(notes=[], tombstones=[TombstoneNode(path="a.note", line=1, guid="123")])

  assert checker.errors == []


def test_checker_reports_tombstone_with_empty_id() -> None:
  checker = Checker()

  checker.check_notes(notes=[], tombstones=[TombstoneNode(path="a.note", line=1, guid="")])

  assert checker.errors == [
    ParseError(
      path="a.note",
      line=1,
      message="Delete directive must have a non-empty id value.",
    ),
  ]


def test_checker_reports_duplicate_note_fields_case_insensitively() -> None:
  checker = Checker()

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="Default"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value=""),
    guid=None,
    fields=[
      FieldNode(path="a.note", line=4, name="Id", value="123"),
      FieldNode(path="a.note", line=5, name="Front", value="Q"),
      FieldNode(path="a.note", line=6, name="FRONT", value="A"),
    ],
    end=Location(path="a.note", line=7),
  )

  checker.check_notes(notes=[n1], tombstones=[])

  assert checker.errors == [
    ParseError(path="a.note", line=6, message="Duplicate field 'FRONT'."),
  ]
