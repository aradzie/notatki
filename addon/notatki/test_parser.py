from pathlib import Path

from .parser import ModelParser, NoteParser


def parse_note(*lines: str, path: Path | None = None) -> NoteParser:
  parser = NoteParser(path=path)
  for line in lines:
    parser.push(line)
  parser.finish()
  return parser


def parse_model(*lines: str, path: Path | None = None) -> ModelParser:
  parser = ModelParser(path=path or Path("example.model"))
  for line in lines:
    parser.push(line)
  parser.finish()
  return parser


def test_note_parser_parses_empty_file():
  parser = parse_note()

  assert parser.errors == []
  assert parser.notes == []


def test_model_parser_parses_empty_file():
  parser = parse_model()

  assert parser.errors == []
  assert parser.models == []


def test_note_parser_parses_note_with_only_properties():
  parser = parse_note(
    "!deck: A B\n",
    "!tags: A B\n",
  )

  assert parser.errors == []
  assert parser.notes == []


def test_note_parser_parses_properties_and_multiline_fields():
  path = Path("deck/sample.note")
  parser = parse_note(
    "!type: Basic\n",
    "!deck: Default Deck\n",
    "!tags: one   two\n",
    "!Front: Question\n",
    "  continued text  \n",
    "!Back: Answer\n",
    "~~~\n",
    path=path,
  )

  assert parser.errors == []
  assert len(parser.notes) == 1

  note = parser.notes[0]
  assert [(prop.name, prop.value, prop.line, prop.path) for prop in note.properties] == [
    ("type", "Basic", 1, path),
    ("deck", "Default Deck", 2, path),
    ("tags", "one two", 3, path),
  ]
  assert [(field.name, field.value, field.line, field.path) for field in note.fields] == [
    ("Front", "Question\n  continued text", 4, path),
    ("Back", "Answer", 6, path),
  ]


def test_note_parser_treats_property_names_as_fields_after_first_field():
  parser = parse_note(
    "!Front: Question\n",
    "!deck: Still a field\n",
    "~~~\n",
  )

  assert parser.errors == []
  note = parser.notes[0]
  assert note.properties == []
  assert [(field.name, field.value) for field in note.fields] == [
    ("Front", "Question"),
    ("deck", "Still a field"),
  ]


def test_note_parser_reports_unexpected_and_unterminated_lines():
  parser = parse_note(
    "plain text\n",
    "!Front: Question\n",
  )

  assert [error.message for error in parser.errors] == [
    'Unexpected note line: "plain text"',
    "Unterminated note. Expected a closing '~~~' line.",
  ]
  assert [error.line for error in parser.errors] == [1, 3]


def test_model_parser_parses_complete_model_definition():
  path = Path("models/basic.model")
  parser = parse_model(
    "model   Basic   Card  \n",
    "field Front\n",
    "field Back?\n",
    "card Card 1\n",
    "front\n",
    "{{Front}}\n",
    "~~~\n",
    "back\n",
    "{{Back}}\n",
    "~~~\n",
    "styles\n",
    ".card { color: red; }\n",
    "~~~\n",
    path=path,
  )

  assert parser.errors == []
  assert len(parser.models) == 1

  model = parser.models[0]
  assert model.path == path
  assert model.name.value == "Basic Card"
  assert [(field.name, field.required) for field in model.fields] == [
    ("Front", True),
    ("Back", False),
  ]
  assert len(model.cards) == 1
  assert model.cards[0].name == "Card 1"
  assert model.cards[0].front.text == "{{Front}}"
  assert model.cards[0].back.text == "{{Back}}"
  assert model.styles.style == ".card { color: red; }"


def test_model_parser_reports_ordering_and_duplicate_errors():
  parser = parse_model(
    "model Basic\n",
    "card Card 1\n",
    "back\n",
    "front\n",
    "first\n",
    "~~~\n",
    "front\n",
    "styles\n",
    "~~~\n",
  )

  assert [error.message for error in parser.errors] == [
    'Card "Card 1" must define front before back.',
    'Card "Card 1" already has a front block.',
    'Card "Card 1" is missing a back block.',
  ]


def test_model_parser_reports_unterminated_multiline_and_missing_id():
  parser = parse_model(
    "model Basic\n",
    "field Front\n",
    "card Card 1\n",
    "front\n",
    "{{Front}}\n",
  )

  assert [error.message for error in parser.errors] == [
    "Unterminated multiline block. Expected a closing '~~~' line.",
    'Card "Card 1" is missing a back block.',
  ]
  assert parser.models[0].cards[0].front.text == "{{Front}}"
