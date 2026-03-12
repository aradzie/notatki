from pathlib import Path

from anki.collection import Collection, AddNoteRequest
from anki.notes import Note
from aqt.utils import showInfo, showWarning

from .checker import Checker
from .data import JModel, JNote, JCollection
from .nodes import ParseError, ModelNodes, NoteNodes
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
  updated_models: list[JModel]  # Updated models.
  added_models: list[JModel]  # Added models.
  updated_notes: list[JNote]  # Updated notes.
  added_notes: list[JNote]  # Added notes.
  failed_notes: list[JNote]  # Notes with errors.
  unknown_models: set[str]
  unknown_fields: set[str]
  _notes: dict[str, Note]  # Maps guids to notes.
  _to_update: list[AddNoteRequest]  # Existing notes to be updated.
  _to_add: list[AddNoteRequest]  # New notes to be inserted.

  @staticmethod
  def from_directory(col: Collection, path: Path) -> 'ImportState':
    state = ImportState(col)
    state.find_files(path)
    return state

  @staticmethod
  def from_file(col: Collection, path: Path) -> 'ImportState':
    state = ImportState(col)
    state.add_file(path)
    return state

  def __init__(self, col: Collection):
    self.col = col
    self.errors = []
    self.model_paths = []
    self.note_paths = []
    self.updated_models = []
    self.added_models = []
    self.updated_notes = []
    self.added_notes = []
    self.failed_notes = []
    self.unknown_models = set()
    self.unknown_fields = set()
    self._notes = {}
    self._to_update = []
    self._to_add = []

  def start(self):
    if self.errors:
      return

    jcol = JCollection()

    self._parse_files(jcol)
    if self.errors:
      return

    self._sync_models(jcol)
    if self.errors:
      return

    self._sync_notes(jcol)
    if self.errors:
      return

  def report(self):
    if self.errors:
      for error in self.errors:
        print(str(error))
      showWarning("\n".join(str(error) for error in self.errors[:10]))
    else:
      showInfo(f"Added {len(self.added_notes)} and "
               f"updated {len(self.updated_notes)} notes, "
               f"{len(self.failed_notes)} errors.")

  def find_files(self, root: Path):
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
          path=root,
          message=str(err),
        ),
      )

  def add_file(self, path: Path):
    if path.suffix == ".model":
      self.model_paths.append(path)
    if path.suffix == ".note":
      self.note_paths.append(path)

  def _parse_files(self, jcol: JCollection):
    models: list[ModelNodes] = []
    notes: list[NoteNodes] = []
    for path in self.model_paths:
      print(f"Parsing a model file {path}")
      parser = ModelParser(path)
      self._parse_file(path, parser)
      models.extend(parser.models)
    for path in self.note_paths:
      print(f"Parsing a note file {path}")
      parser = NoteParser(path)
      self._parse_file(path, parser)
      notes.extend(parser.notes)
    if self.errors:
      return
    checker = Checker()
    checker.check(models, notes)
    self.errors.extend(checker.errors)
    if self.errors:
      return
    jcol.models.extend(checker.models)
    jcol.notes.extend(checker.notes)

  def _parse_file(self, path: Path, parser: ModelParser | NoteParser):
    try:
      with path.open("r", encoding="utf-8") as file:
        for line in file:
          parser.push(line)
      parser.finish()
    except Exception as err:
      self.errors.append(ParseError(path=path, message=str(err)))
    self.errors.extend(parser.errors)

  def _sync_models(self, jcol: JCollection):
    for jmodel in jcol.models:
      if model := self.col.models.by_name(jmodel.name):
        self.col.models.update(model)
        self.updated_models.append(jmodel)
      else:
        self.col.models.add(jmodel.to_model(self.col.models))
        self.added_models.append(jmodel)

  def _sync_notes(self, jcol: JCollection):
    self._load_notes()
    for jnote in jcol.notes:
      self._process_note(jnote)
    self._save_notes()

  def _load_notes(self):
    note_ids = self.col.find_notes("")
    for note_id in note_ids:
      note = self.col.get_note(note_id)
      if note.guid:
        self._notes[note.guid] = note

  def _process_note(self, jnote: JNote) -> bool:
    deck_id = self.col.decks.id(jnote.deck)
    if note := self._notes.get(jnote.guid):
      if self._update_note(note, jnote):
        self._to_update.append(AddNoteRequest(note, deck_id))
        self.updated_notes.append(jnote)
        return True
    else:
      if model := self.col.models.by_name(jnote.type):
        note = Note(self.col, model)
        if self._update_note(note, jnote):
          self._to_add.append(AddNoteRequest(note, deck_id))
          self.added_notes.append(jnote)
          return True
      else:
        self.unknown_models.add(jnote.type)
    self.failed_notes.append(jnote)
    return False

  def _update_note(self, note: Note, jnote: JNote) -> bool:
    note.guid = jnote.guid
    note.tags = jnote.tags
    for key, value in jnote.fields.items():
      if key in note:
        note[key] = value
      else:
        self.unknown_fields.add(key)
        return False
    return True

  def _save_notes(self):
    changed_notes = []
    changed_cards = []
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
