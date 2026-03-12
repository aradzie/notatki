from pathlib import Path

from anki.collection import Collection, AddNoteRequest
from anki.notes import Note
from aqt import AnkiQt, QAction, QFileDialog
from aqt.operations import QueryOp
from aqt.utils import showWarning, showInfo

from .checker import Checker
from .data import JCollection, JNote, JModel
from .nodes import ModelNodes, NoteNodes, ParseError
from .parser import ModelParser, NoteParser

_IGNORED_DIR_NAMES = {
  ".git",
  ".venv",
  "node_modules",
}


def init_import(mw: AnkiQt):
  def start_import(col: Collection, path: Path) -> State:
    mw.create_backup_now()
    state = State(col, path)
    state.start()
    return state

  def on_success(state: State):
    if len(state.errors):
      show_errors(state.errors)
    else:
      showInfo(f"Added {len(state.added_notes)} and "
               f"updated {len(state.updated_notes)} notes, "
               f"{len(state.failed_notes)} errors.")
    mw.reset()

  def import_dir():
    path = QFileDialog.getExistingDirectory(
      caption="Notes Directory",
      options=QFileDialog.Option.ShowDirsOnly,
    )
    if path:
      QueryOp(
        parent=mw,
        op=lambda col: start_import(col, Path(path)),
        success=on_success,
      ).with_progress().run_in_background()

  action = QAction("Import Models and Notes...", mw)
  action.triggered.connect(import_dir)
  mw.form.menuCol.insertActions(mw.form.menuCol.actions()[4], [action])


class State:
  col: Collection
  path: Path
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

  def __init__(self, col: Collection, path: Path):
    self.col = col
    self.path = path

  def start(self):
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

    jcol = JCollection()

    self._find_files()
    if self.errors:
      return

    self._parse_files(jcol)
    if self.errors:
      return

    self._sync_models(jcol)
    if self.errors:
      return

    self._sync_notes(jcol)
    if self.errors:
      return

  def _find_files(self):
    try:
      if not self.path.exists():
        raise FileNotFoundError(self.path)
      if not self.path.is_dir():
        raise NotADirectoryError(self.path)
      for root, dir_names, file_names in self.path.walk():
        dir_names[:] = [
          dir_name for dir_name in dir_names
          if dir_name not in _IGNORED_DIR_NAMES
        ]
        for file_name in sorted(file_names):
          file_path = root / file_name
          if file_path.suffix == ".model":
            self.model_paths.append(file_path)
          if file_path.suffix == ".note":
            self.note_paths.append(file_path)
    except Exception as err:
      self.errors.append(
        ParseError(
          path=self.path,
          message=str(err),
        ),
      )

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


def show_errors(errors: list[ParseError]):
  for error in errors:
    print(str(error))
  showWarning("\n".join(str(error) for error in errors[:10]))
