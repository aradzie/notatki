import json

from anki.collection import Collection, AddNoteRequest
from anki.notes import Note
from aqt import AnkiQt
from aqt.import_export.importing import Importer, IMPORTERS
from aqt.operations import QueryOp
from aqt.utils import showInfo, showWarning

from .const import file_ext
from .json_data import JCollection, JNote


class JsonImporter(Importer):
  accepted_file_endings = [f".{file_ext}"]

  @classmethod
  def do_import(cls, mw: AnkiQt, path: str) -> None:
    def do_import(col: Collection) -> State:
      state = State(col)
      state.start(path)
      return state

    def on_success(state: State) -> None:
      if state.err:
        showWarning(str(state.err))
      else:
        showInfo(f"Added {len(state.added)} and "
                 f"updated {len(state.updated)} notes, "
                 f"{len(state.failed)} errors.")
      mw.reset()

    op = QueryOp(
      parent=mw,
      op=lambda col: do_import(col),
      success=on_success,
    )
    op.with_progress().run_in_background()


def init_importer():
  IMPORTERS.append(JsonImporter)


class State:
  col: Collection
  notes: dict[str, Note] = dict()  # Maps guids to notes.
  to_update: list[AddNoteRequest] = []  # Existing notes to be updated.
  to_add: list[AddNoteRequest] = []  # New notes to be inserted.
  updated: list[JNote] = []  # Updated notes.
  added: list[JNote] = []  # Added notes.
  failed: list[JNote] = []  # Notes with errors.
  unknown_models: set[str] = set()
  unknown_fields: set[str] = set()
  err: Exception = None

  def __init__(self, col: Collection):
    self.col = col

  def start(self, path):
    try:
      with open(path, "r", encoding="utf-8") as file:
        data = json.load(file)
      jcol = JCollection.load(data)
    except Exception as e:
      self.err = Exception(f"Error reading Notatki JSON file: {e}")
      return

    self.load_notes()
    for jnote in jcol.notes:
      self.process_note(jnote)
    self.save_notes()

  def load_notes(self):
    note_ids = self.col.find_notes("")
    for note_id in note_ids:
      note = self.col.get_note(note_id)
      if note.guid:
        self.notes[note.guid] = note

  def process_note(self, jnote: JNote) -> bool:
    deck_id = self.col.decks.id(jnote.deck)
    if note := self.notes.get(jnote.guid):
      if self.update_note(note, jnote):
        self.to_update.append(AddNoteRequest(note, deck_id))
        self.updated.append(jnote)
        return True
    else:
      if model := self.col.models.by_name(jnote.type):
        note = Note(self.col, model)
        if self.update_note(note, jnote):
          self.to_add.append(AddNoteRequest(note, deck_id))
          self.added.append(jnote)
          return True
      else:
        self.unknown_models.add(jnote.type)
    self.failed.append(jnote)
    return False

  def update_note(self, note: Note, jnote: JNote) -> bool:
    note.guid = jnote.guid
    for tag in jnote.tags:
      note.tags.append(tag)
    for key, value in jnote.fields.items():
      if key in note:
        note[key] = value
      else:
        self.unknown_fields.add(key)
        return False
    return True

  def save_notes(self):
    changed_notes = []
    changed_cards = []
    for to_update in self.to_update:
      changed_notes.append(to_update.note)
      cards = to_update.note.cards()
      for card in cards:
        if card.did != to_update.deck_id:
          card.did = to_update.deck_id
          changed_cards.append(card)
    self.col.update_notes(changed_notes)
    self.col.update_cards(changed_cards)
    self.col.add_notes(self.to_add)
