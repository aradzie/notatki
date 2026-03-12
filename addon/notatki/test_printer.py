from .data import (
  FieldNode,
  ModelCardNode,
  ModelFieldNode,
  ModelNodes,
  NoteNodes,
  PropertyNode,
)
from .printer import print_models, print_notes


def test_print_models_returns_empty_string_for_empty_list() -> None:
  assert print_models([]) == ""


def test_print_notes_returns_empty_string_for_empty_list() -> None:
  assert print_notes([]) == ""


def test_print_models_prints_complete_model_definition() -> None:
  # Arrange

  model = ModelNodes(
    name="Basic",
    cloze=True,
    fields=[
      ModelFieldNode(name="Front"),
      ModelFieldNode(name="Back"),
      ModelFieldNode(name="Hint", required=False),
    ],
    cards=[
      ModelCardNode(
        name="Card 1",
        front="{{Front}}\n{{Hint}}",
        back="{{Back}}",
      ),
    ],
    styles=".card { color: red; }",
  )

  # Act

  result = print_models([model])

  # Assert

  assert result == (
    "model Basic\n"
    "\n"
    "cloze\n"
    "\n"
    "field Front\n"
    "field Back\n"
    "field Hint\n"
    "\n"
    "card Card 1\n"
    "\n"
    "front\n"
    "{{Front}}\n"
    "{{Hint}}\n"
    "~~~\n"
    "\n"
    "back\n"
    "{{Back}}\n"
    "~~~\n"
    "\n"
    "styles\n"
    ".card { color: red; }\n"
    "~~~\n"
  )


def test_print_notes_prints_properties_guid_and_multiline_fields() -> None:
  # Arrange

  note = NoteNodes(
    type=PropertyNode(name="type", value="Basic"),
    deck=PropertyNode(name="deck", value="Default"),
    tags=PropertyNode(name="tags", value="One Two"),
    guid=FieldNode(name="id", value="123"),
    fields=[
      FieldNode(name="Front", value="Question\ncontinued"),
      FieldNode(name="Back", value="Answer"),
    ],
  )

  # Act

  result = print_notes([note])

  # Assert

  assert result == (
    "!type: Basic\n"
    "!deck: Default\n"
    "!tags: One Two\n"
    "\n"
    "!id: 123\n"
    "!Front:\n"
    "Question\n"
    "continued\n"
    "!Back: Answer\n"
    "~~~\n"
  )


def test_print_notes_skips_missing_optional_properties() -> None:
  # Arrange

  note = NoteNodes(
    fields=[
      FieldNode(name="Front", value="Question"),
    ],
  )

  # Act

  result = print_notes([note])

  # Assert

  assert result == (
    "!Front: Question\n"
    "~~~\n"
  )
