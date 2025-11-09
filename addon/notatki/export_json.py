import json

from anki.collection import Collection
from anki.notes import Note
from aqt import AnkiQt, gui_hooks
from aqt.import_export.exporting import ExportOptions, Exporter
from aqt.operations import QueryOp
from aqt.utils import tooltip, tr

from .const import file_ext
from .json_data import JNote, JCollection, JModel


class JsonExporter(Exporter):
  extension = f"{file_ext}"
  show_deck_list = True

  @staticmethod
  def name() -> str:
    return "Notatki JSON"

  def export(self, mw: AnkiQt, options: ExportOptions) -> None:
    options = gui_hooks.exporter_will_export(options, self)

    def on_success(jcol: JCollection) -> None:
      gui_hooks.exporter_did_export(options, self)
      tooltip(tr.exporting_collection_exported(), parent=mw)

    op = QueryOp(
      parent=mw,
      op=lambda col: self.export_json(col, options),
      success=on_success,
    )
    op.with_progress().run_in_background()

  def export_json(self, col: Collection, options: ExportOptions) -> JCollection:
    jmodels = []
    jnotes = []
    for model in col.models.all():
      jmodels.append(JModel.from_model(model))
    for note_id in col.find_notes(""):
      note = col.get_note(note_id)
      jnotes.append(JNote(
        guid=note.guid,
        type=note.note_type()["name"],
        deck=self.deck_name(col, note),
        tags=list(note.tags),
        fields=dict(note.items()),
      ))
    jcol = JCollection(models=jmodels, notes=jnotes)
    with open(options.out_path, "w", encoding="utf-8") as file:
      json.dump(jcol.save(), file, indent=2, ensure_ascii=False)
    return jcol

  def deck_name(self, col: Collection, note: Note) -> str:
    for card in note.cards():
      return col.decks.get(card.did)["name"]
    return "Default"


def exporters_hook(exporters_list):
  exporters_list.append(JsonExporter)
