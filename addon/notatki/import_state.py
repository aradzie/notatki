from pathlib import Path

from anki.cards import Card
from anki.collection import AddNoteRequest, Collection
from anki.models import NotetypeDict
from anki.notes import Note
from aqt.utils import showInfo, showWarning

from .checker import Checker
from .data import ModelNodes, NoteNodes, ParseError
from .format_field import markdown_to_html
from .parser import ModelParser, NoteParser

_IGNORED_DIR_NAMES = {
  ".git",
  ".venv",
  "node_modules",
}


class ImportState:
  col: Collection
  errors: list[ParseError]  # All accumulated errors.
  model_paths: list[Path]  # A list of paths to model files.
  note_paths: list[Path]  # A list of paths to note files.
  incoming_models: list[ModelNodes]  # Parsed models.
  incoming_notes: list[NoteNodes]  # Parsed notes.
  updated_models: list[ModelNodes]  # Updated models.
  added_models: list[ModelNodes]  # Added models.
  updated_notes: list[NoteNodes]  # Updated notes.
  added_notes: list[NoteNodes]  # Added notes.
  _anki_models_by_name: dict[str, NotetypeDict]  # Maps lowercase model names to models.
  _anki_notes_by_guid: dict[str, Note]  # Maps guids to notes.
  _to_update: list[AddNoteRequest]  # Existing notes to be updated.
  _to_add: list[AddNoteRequest]  # New notes to be inserted.

  @staticmethod
  def from_directory(col: Collection, path: Path) -> "ImportState":
    state = ImportState(col)
    state.find_files(path)
    return state

  @staticmethod
  def from_file(col: Collection, path: Path) -> "ImportState":
    state = ImportState(col)
    state.add_file(path)
    return state

  def __init__(self, col: Collection) -> None:
    self.col = col
    self.errors = []
    self.model_paths = []
    self.note_paths = []
    self.incoming_models = []
    self.incoming_notes = []
    self.updated_models = []
    self.added_models = []
    self.updated_notes = []
    self.added_notes = []
    self._anki_models_by_name = {}
    self._anki_notes_by_guid = {}
    self._to_update = []
    self._to_add = []

  def start(self) -> None:
    self._parse_files()
    if self.errors:
      return

    self._check_incoming_data()
    if self.errors:
      return

    self._sync_models()
    if self.errors:
      return

    self._sync_notes()
    if self.errors:
      return

  def report(self) -> None:
    if self.errors:
      for error in self.errors:
        print(str(error))
      showWarning("\n".join(str(error) for error in self.errors[:10]))
    else:
      showInfo(
        f"Added {len(self.added_models)} and "
        f"updated {len(self.updated_models)} models."
        "\n"
        f"Added {len(self.added_notes)} and "
        f"updated {len(self.updated_notes)} notes."
      )

  def find_files(self, root: Path) -> None:
    try:
      if not root.exists():
        raise FileNotFoundError(root)
      if not root.is_dir():
        raise NotADirectoryError(root)
      for root, dir_names, file_names in root.walk():
        dir_names[:] = [
          dir_name for dir_name in dir_names
          if dir_name not in _IGNORED_DIR_NAMES
        ]
        for file_name in sorted(file_names):
          self.add_file(root / file_name)
    except Exception as err:
      self.errors.append(
        ParseError(
          path=str(root),
          message=str(err),
        ),
      )

  def add_file(self, path: Path) -> None:
    match path.suffix:
      case ".model":
        self.model_paths.append(path)
      case ".note":
        self.note_paths.append(path)

  def _parse_files(self) -> None:
    for path in self.model_paths:
      print(f"Parsing a model file {path}")
      model_parser = ModelParser(str(path))
      self._parse_file(path, model_parser)
      self.incoming_models.extend(model_parser.models)
    for path in self.note_paths:
      print(f"Parsing a note file {path}")
      note_parser = NoteParser(str(path))
      self._parse_file(path, note_parser)
      self.incoming_notes.extend(note_parser.notes)
    if self.errors:
      return

  def _parse_file(self, path: Path, parser: ModelParser | NoteParser) -> None:
    try:
      with path.open("r", encoding="utf-8") as file:
        for line in file:
          parser.push(line.rstrip())
      parser.finish()
    except Exception as err:
      self.errors.append(
        ParseError(
          path=str(path),
          message=str(err),
        )
      )
    self.errors.extend(parser.errors)

  def _check_incoming_data(self) -> None:
    checker = Checker()
    checker.check_models(self.incoming_models)
    checker.check_notes(self.incoming_notes)
    self.errors.extend(checker.errors)

  def _sync_models(self) -> None:
    for my_model in self.incoming_models:
      if anki_model := self._find_model(my_model.name):
        if self._update_anki_model(my_model, anki_model):
          self.col.models.update(anki_model)
          self.updated_models.append(my_model)
      else:
        self.col.models.add(self._create_anki_model(my_model))
        self.added_models.append(my_model)

  def _create_anki_model(self, my_model: ModelNodes) -> NotetypeDict:
    anki_model = self.col.models.new(my_model.name)

    anki_model["type"] = int(my_model.cloze)

    for my_field in my_model.fields:
      self.col.models.add_field(anki_model, self.col.models.new_field(my_field.name))

    for my_card in my_model.cards:
      template = self.col.models.new_template(my_card.name)
      template["qfmt"] = my_card.front
      template["afmt"] = my_card.back
      self.col.models.add_template(anki_model, template)

    if my_model.styles:
      anki_model["css"] = my_model.styles

    return anki_model

  def _update_anki_model(self, my_model: ModelNodes, anki_model: NotetypeDict) -> bool:
    # The update procedure is non-destructive.
    # We do not delete any data from the existing models.
    # We add new fields only.
    # We update the existing cards only.
    # We replace the CSS styles.

    ok = True

    if my_model.cloze != anki_model["type"]:
      self.errors.append(
        ParseError(
          path=my_model.path,
          line=my_model.line,
          message="Cannot change model type.",
        ),
      )
      ok = False

    # Add new fields.
    for my_field in my_model.fields:
      found = False
      for anki_field in anki_model["flds"]:
        if anki_field["name"].lower() == my_field.name.lower():
          found = True
          break
      if not found:
        self.col.models.add_field(anki_model, self.col.models.new_field(my_field.name))

    # Update the existing cards.
    for my_card in my_model.cards:
      found = False
      for anki_card in anki_model["tmpls"]:
        if anki_card["name"].lower() == my_card.name.lower():
          anki_card["qfmt"] = my_card.front
          anki_card["afmt"] = my_card.back
          found = True
          break
      if not found:
        self.errors.append(
          ParseError(
            path=my_card.path,
            line=my_card.line,
            message=f"Extra card '{my_card.name}'.",
          ),
        )
        ok = False

    # Replace the CSS styles.
    if my_model.styles:
      anki_model["css"] = my_model.styles

    return ok

  def _sync_notes(self) -> None:
    self._load_notes()
    for my_note in self.incoming_notes:
      self._process_note(my_note)
    self._save_notes()

  def _load_notes(self) -> None:
    note_ids = self.col.find_notes("")
    for note_id in note_ids:
      anki_note = self.col.get_note(note_id)
      if anki_note.guid:
        self._anki_notes_by_guid[anki_note.guid] = anki_note

  def _process_note(self, my_note: NoteNodes) -> bool:
    if anki_note := self._anki_notes_by_guid.get(my_note.guid.value):
      return self._update_existing_anki_note(my_note, anki_note)
    else:
      return self._create_new_anki_note(my_note)

  def _create_new_anki_note(self, my_note: NoteNodes) -> bool:
    my_type = my_note.type.value
    if not (anki_model := self._find_model(my_type)):
      self.errors.append(
        ParseError(
          path=my_note.type.path,
          line=my_note.type.line,
          message=f"Unknown note type '{my_type}'.",
        )
      )
      return False

    anki_note = Note(self.col, anki_model)
    if self._update_anki_note_fields(my_note, anki_note):
      deck_id = self.col.decks.id(my_note.deck.value)
      self._to_add.append(AddNoteRequest(anki_note, deck_id))
      self.added_notes.append(my_note)
      return True

    return False

  def _update_existing_anki_note(self, my_note: NoteNodes, anki_note: Note) -> bool:
    my_type = my_note.type.value
    anki_type = anki_note.note_type()
    if anki_type["name"].lower() != my_type.lower():
      self.errors.append(
        ParseError(
          path=my_note.path,
          line=my_note.line,
          message=f"Cannot change note type from '{anki_type["name"]}' to '{my_type}'.",
        )
      )
      return False

    if self._update_anki_note_fields(my_note, anki_note):
      deck_id = self.col.decks.id(my_note.deck.value)
      self._to_update.append(AddNoteRequest(anki_note, deck_id))
      self.updated_notes.append(my_note)
      return True

    return False

  def _update_anki_note_fields(self, my_note: NoteNodes, anki_note: Note) -> bool:
    ok = True

    anki_type = anki_note.note_type()
    anki_field_names = {fld["name"].lower(): fld["name"] for fld in anki_type["flds"]}
    anki_note.guid = my_note.guid.value
    anki_note.tags = my_note.tags.value.split()

    for my_field in my_note.fields:
      field_name = anki_field_names.get(my_field.name.lower(), my_field.name)
      if field_name in anki_note:
        anki_note[field_name] = markdown_to_html(my_field.value)
      else:
        self.errors.append(
          ParseError(
            path=my_field.path,
            line=my_field.line,
            message=f"Unknown field '{my_field.name}'.",
          )
        )
        ok = False

    return ok

  def _save_notes(self) -> None:
    changed_notes: list[Note] = []
    changed_cards: list[Card] = []
    for to_update in self._to_update:
      changed_notes.append(to_update.note)
      cards = to_update.note.cards()
      for card in cards:
        if card.did != to_update.deck_id:
          card.did = to_update.deck_id
          changed_cards.append(card)
    self.col.update_notes(changed_notes)
    self.col.update_cards(changed_cards)
    self.col.add_notes(self._to_add)

  def _find_model(self, name: str) -> NotetypeDict | None:
    name = name.lower()
    if model := self._anki_models_by_name.get(name):
      return model
    for model in self.col.models.all():
      if model["name"].lower() == name:
        self._anki_models_by_name[name] = model
        return model
    return None
