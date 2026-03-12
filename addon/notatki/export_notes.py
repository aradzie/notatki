from pathlib import Path

from anki.collection import Collection
from anki.notes import Note
from aqt import AnkiQt, gui_hooks
from aqt.import_export.exporting import ExportOptions, Exporter
from aqt.operations import QueryOp
from aqt.utils import tooltip, tr

from .data import JNote
from .format_field import html_to_markdown
from .printer import print_notes


class NotesExporter(Exporter):
  extension = "note"
  show_deck_list = True

  @staticmethod
  def name() -> str:
    return "Notatki text file"

  def export(self, mw: AnkiQt, options: ExportOptions):
    options = gui_hooks.exporter_will_export(options, self)

    def on_success(_: None):
      gui_hooks.exporter_did_export(options, self)
      tooltip(tr.exporting_collection_exported(), parent=mw)

    QueryOp(
      parent=mw,
      op=lambda col: self.export_notes(col, options),
      success=on_success,
    ).with_progress().run_in_background()

  def export_notes(self, col: Collection, options: ExportOptions):
    jnotes = []
    for note_id in col.find_notes(""):
      note = col.get_note(note_id)
      fields = {name: html_to_markdown(value) for name, value in note.items() if value}
      if fields:
        jnotes.append(JNote(
          guid=note.guid,
          type=note.note_type()["name"],
          deck=self.deck_name(col, note),
          tags=list(note.tags),
          fields=fields,
        ))
    text = print_notes(jnotes)
    Path(options.out_path).write_text(text, encoding="utf-8")

  def deck_name(self, col: Collection, note: Note) -> str:
    for card in note.cards():
      return col.decks.get(card.did)["name"]
    return "Default"


def exporters_hook(exporters_list):
  exporters_list.append(NotesExporter)
