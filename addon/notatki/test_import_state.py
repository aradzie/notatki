import pytest
from anki.collection import Collection
from anki.notes import Note

from .data import (
  FieldNode,
  ModelCardNode,
  ModelFieldNode,
  ModelNodes,
  Location,
  NoteNodes,
  ParseError,
  PropertyNode,
)
from .import_state import ImportState


@pytest.fixture
def col(tmp_path):
  collection = Collection(str(tmp_path / "coll.anki2"))
  yield collection
  collection.close()


def test_import_state_update_model_change_type_reports_error(col):
  # Arrange

  m1 = ModelNodes(
    path="a.model",
    line=1,
    name="Basic",
    cloze=True,
    fields=[],
    cards=[],
  )

  # Act

  state = ImportState(col)
  state.incoming_models.append(m1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.model", line=1, message="Cannot change model type."),
  ]
  assert state.updated_models == []
  assert state.added_models == []


def test_import_state_update_model_with_extra_card_reports_error(col):
  # Arrange

  m1 = ModelNodes(
    path="a.model",
    line=1,
    name="Basic",
    fields=[
      ModelFieldNode(path="a.model", line=2, name="Front"),
      ModelFieldNode(path="a.model", line=3, name="Back"),
    ],
    cards=[
      ModelCardNode(
        path="a.model",
        line=4,
        name="Unexpected",
        front="{{Front}}",
        back="{{FrontSide}}\n<br>\n{{Back}}",
      ),
    ],
  )

  # Act

  state = ImportState(col)
  state.incoming_models.append(m1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.model", line=4, message="Extra card 'Unexpected'."),
  ]
  assert state.updated_models == []
  assert state.added_models == []


def test_import_state_note_without_guid_reports_error(col):
  # Arrange

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=None,
    fields=[
      FieldNode(path="a.note", line=4, name="front", value="question"),
      FieldNode(path="a.note", line=5, name="back", value="answer"),
    ],
    end=Location(path="a.note", line=6),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.note", line=6, message="Note must have an id field."),
  ]
  assert state.updated_notes == []
  assert state.added_notes == []


def test_import_state_note_with_empty_guid_reports_error(col):
  # Arrange

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="a.note", line=4, value=""),
    fields=[
      FieldNode(path="a.note", line=5, name="front", value="question"),
      FieldNode(path="a.note", line=6, name="back", value="answer"),
    ],
    end=Location(path="a.note", line=7),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.note", line=7, message="Note must have an id field."),
  ]
  assert state.updated_notes == []
  assert state.added_notes == []


def test_import_state_note_without_fields_reports_error(col):
  # Arrange

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="a.note", line=4, name="id", value="111"),
    fields=[],
    end=Location(path="a.note", line=5),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.note", line=5, message="Note must have at least one model field."),
  ]
  assert state.updated_notes == []
  assert state.added_notes == []


def test_import_state_duplicate_note_guid_reports_error(col):
  # Arrange

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="a.note", line=4, name="id", value="111"),
    fields=[FieldNode(path="a.note", line=5, name="front", value="question")],
    end=Location(path="a.note", line=6),
  )
  n2 = NoteNodes(
    type=PropertyNode(path="b.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="b.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="b.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="b.note", line=4, name="id", value="111"),
    fields=[FieldNode(path="b.note", line=5, name="front", value="question")],
    end=Location(path="b.note", line=6),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.extend([n1, n2])
  state.start()

  # Assert

  assert state.errors == [
    ParseError(
      path="a.note",
      line=4,
      message="Duplicate note id '111' at a.note:4, b.note:4.",
    ),
  ]
  assert state.updated_notes == []
  assert state.added_notes == []


def test_import_state_note_with_unknown_field_reports_error(col):
  # Arrange

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="a.note", line=4, name="id", value="111"),
    fields=[
      FieldNode(path="a.note", line=5, name="front", value="question"),
      FieldNode(path="a.note", line=6, name="extra", value="unexpected"),
    ],
    end=Location(path="a.note", line=7),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.note", line=6, message="Unknown field 'extra'."),
  ]
  assert state.updated_notes == []
  assert state.added_notes == []


def test_import_state_duplicate_model_name_reports_error(col):
  # Arrange

  m1 = ModelNodes(path="a.model", line=1, name="Basic")
  m2 = ModelNodes(path="b.model", line=1, name="basic")

  # Act

  state = ImportState(col)
  state.incoming_models.extend([m1, m2])
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="b.model", line=1, message="Duplicate model 'basic'."),
  ]
  assert state.updated_models == []
  assert state.added_models == []


def test_import_state_note_with_unknown_model_name_is_ignored(col):
  # Arrange

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="Missing Type"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="a.note", line=4, name="id", value="111"),
    fields=[
      FieldNode(path="a.note", line=5, name="front", value="question"),
      FieldNode(path="a.note", line=6, name="back", value="answer"),
    ],
    end=Location(path="a.note", line=7),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.note", line=1, message="Unknown note type 'Missing Type'."),
  ]
  assert state.updated_notes == []
  assert state.added_notes == []
  assert col.find_notes("*") == []


def test_import_state_update_note_cannot_change_type(col):
  # Arrange

  # Seed an existing note.
  basic = col.models.by_name("Basic")
  existing_note = Note(col, basic)
  existing_note.guid = "111"
  existing_note["Front"] = "existing question"
  existing_note["Back"] = "existing answer"
  col.add_note(existing_note, col.decks.id("My Deck"))

  # Create an updated note with the same guid but a different note type.
  n1 = NoteNodes(
    path="a.note",
    line=4,
    type=PropertyNode(path="a.note", line=1, name="type", value="Basic (and reversed card)"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="a.note", line=4, name="id", value="111"),
    fields=[
      FieldNode(path="a.note", line=5, name="front", value="question"),
      FieldNode(path="a.note", line=6, name="back", value="answer"),
    ],
    end=Location(path="a.note", line=7),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == [
    ParseError(path="a.note", line=4, message="Cannot change note type from 'Basic' to 'Basic (and reversed card)'."),
  ]
  assert state.updated_notes == []
  assert state.added_notes == []


def test_import_state_updates_existing_model(col):
  # Arrange

  # Seed the collection using the native Anki model API.
  anki_model = col.models.new("My Type")
  col.models.add_field(anki_model, col.models.new_field("Front"))
  col.models.add_field(anki_model, col.models.new_field("Back"))
  template = col.models.new_template("Card 1")
  template["qfmt"] = "{{Front}}"
  template["afmt"] = "{{Back}}"
  col.models.add_template(anki_model, template)
  anki_model["css"] = "old css"
  col.models.add(anki_model)

  # Create an updated model with the same name but different fields and templates.
  m1 = ModelNodes(
    path="a.model",
    line=1,
    name="MY TYPE",
    fields=[
      ModelFieldNode(path="a.model", line=2, name="BACK"),
      ModelFieldNode(path="a.model", line=3, name="FRONT"),
      ModelFieldNode(path="a.model", line=4, name="Hint"),
    ],
    cards=[
      ModelCardNode(
        path="a.model",
        line=5,
        name="CARD 1",
        front="{{Front}}\n<br>\n{{Hint}}",
        back="{{FrontSide}}\n<br>\n{{Back}}",
      ),
    ],
    styles="new css",
  )

  # Act

  state = ImportState(col)
  state.incoming_models.append(m1)
  state.start()

  # Assert

  assert state.errors == []
  assert state.updated_models == [m1]
  assert state.added_models == []

  updated_model = col.models.by_name("My Type")
  assert [fld["name"] for fld in updated_model["flds"]] == ["Front", "Back", "Hint"]
  assert updated_model["tmpls"][0]["qfmt"] == "{{Front}}\n<br>\n{{Hint}}"
  assert updated_model["tmpls"][0]["afmt"] == "{{FrontSide}}\n<br>\n{{Back}}"
  assert updated_model["css"] == "new css"


def test_import_state_updates_existing_note(col):
  # Arrange

  # Seed the collection using the native Anki note API.
  basic = col.models.by_name("Basic")
  existing_note = Note(col, basic)
  existing_note.guid = "111"
  existing_note["Front"] = "old question"
  existing_note["Back"] = "old answer"
  existing_note.tags = ["A", "B", "C"]
  col.add_note(existing_note, col.decks.id("Old Deck"))

  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="BASIC"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="New Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="X Y Z"),
    guid=FieldNode(path="a.note", line=4, name="id", value="111"),
    fields=[
      FieldNode(path="a.note", line=5, name="FRONT", value="new question"),
      FieldNode(path="a.note", line=6, name="BACK", value="new answer"),
    ],
    end=Location(path="a.note", line=7),
  )

  # Act

  state = ImportState(col)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == []
  assert state.updated_notes == [n1]
  assert state.added_notes == []

  note_ids = col.find_notes("*")
  assert len(note_ids) == 1

  updated_note = col.get_note(note_ids[0])
  assert updated_note["Front"] == "<p>new question</p>\n"
  assert updated_note["Back"] == "<p>new answer</p>\n"
  assert updated_note.tags == ["X", "Y", "Z"]

  cards = updated_note.cards()
  assert len(cards) == 1
  assert cards[0].did == col.decks.id("New Deck")


def test_import_state_create_models_and_nodes(col):
  # Arrange

  m1 = ModelNodes(
    path="a.model",
    line=1,
    name="My Type",
    fields=[
      ModelFieldNode(path="a.model", line=2, name="Front"),
      ModelFieldNode(path="a.model", line=3, name="Back"),
    ],
    cards=[
      ModelCardNode(
        path="a.model",
        line=4,
        name="Card 1",
        front="{{Front}}",
        back="{{Back}}",
      ),
    ],
    styles="css",
  )
  n1 = NoteNodes(
    type=PropertyNode(path="a.note", line=1, name="type", value="My Type"),
    deck=PropertyNode(path="a.note", line=2, name="deck", value="My Deck"),
    tags=PropertyNode(path="a.note", line=3, name="tags", value="A B C"),
    guid=FieldNode(path="a.note", line=4, name="id", value="111"),
    fields=[
      FieldNode(path="a.note", line=5, name="front", value="question"),
      FieldNode(path="a.note", line=6, name="back", value="answer"),
    ],
    end=Location(path="a.note", line=7),
  )

  # Act

  state = ImportState(col)
  state.incoming_models.append(m1)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == []
  assert state.updated_models == []
  assert state.updated_notes == []
  assert state.added_models == [m1]
  assert state.added_notes == [n1]

  # Act

  state = ImportState(col)
  state.incoming_models.append(m1)
  state.incoming_notes.append(n1)
  state.start()

  # Assert

  assert state.errors == []
  assert state.updated_models == [m1]
  assert state.updated_notes == [n1]
  assert state.added_models == []
  assert state.added_notes == []
