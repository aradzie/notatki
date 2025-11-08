import json
import os

from PyQt6.QtWidgets import QFileDialog
from anki.collection import Collection, AddNoteRequest
from anki.notes import Note
from aqt import mw
from aqt.operations import QueryOp
from aqt.utils import showInfo, showWarning

from .json_data import JCollection, JNote


class Importer:
  col: Collection
  notes: dict[str, Note] = dict()  # Maps guids to notes.
  to_update: list[AddNoteRequest] = []  # Existing notes to be updated.
  to_add: list[AddNoteRequest] = []  # New notes to be inserted.
  updated: list[JNote] = []  # Updated notes.
  added: list[JNote] = []  # Added notes.
  failed: list[JNote] = []  # Notes with errors.

  def __init__(self, col: Collection):
    self.col = col

  def run(self, jcol):
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


def start_import(jcol: JCollection) -> None:
  op = QueryOp(
    parent=mw,
    op=lambda col: do_import(col, jcol),
    success=on_success,
  )
  op.with_progress().run_in_background()


def do_import(col: Collection, jcol: JCollection) -> Importer:
  importer = Importer(col)
  importer.run(jcol)
  return importer


def on_success(importer: Importer) -> None:
  showInfo(f"Added {len(importer.added)} and "
           f"updated {len(importer.updated)} notes, "
           f"{len(importer.failed)} errors.")
  mw.reset()


def import_notes_from_json():
  path, _ = QFileDialog.getOpenFileName(mw, "Select JSON file to import", None, "JSON Files (*.json)")

  if not os.path.exists(path):
    showWarning(f"Could not find notes JSON file {path}")
    return

  try:
    with open(path, "r", encoding="utf-8") as file:
      data = json.load(file)
  except Exception as e:
    showWarning(f"Malformed notes JSON file: {e}")
    return

  try:
    jcol = JCollection.load(data)
  except Exception as e:
    showWarning(f"Invalid notes JSON data: {e}")
    return

  start_import(jcol)
