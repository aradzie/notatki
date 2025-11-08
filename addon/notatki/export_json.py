import json

from anki.collection import Collection
from aqt import gui_hooks, AnkiQt
from aqt.import_export.exporting import ExportOptions, Exporter
from aqt.utils import tooltip, tr

from .json_data import JNote, JCollection


def export_json(col: Collection, options: ExportOptions) -> None:
  jmodels = []
  jnotes = []
  for note_id in col.find_notes(""):
    note = col.get_note(note_id)
    jnotes.append(JNote(
      guid=note.guid,
      type="Basic",
      deck="Default",
      tags=list(note.tags),
      fields=dict(note.items()),
    ))
  with open(options.out_path, "w", encoding="utf-8") as file:
    json.dump(JCollection(models=jmodels, notes=jnotes).save(), file, indent=2, ensure_ascii=False)


class JsonExporter(Exporter):
  extension = "json"
  show_deck_list = True

  @staticmethod
  def name() -> str:
    return "JSON"

  def export(self, mw: AnkiQt, options: ExportOptions) -> None:
    options = gui_hooks.exporter_will_export(options, self)

    export_json(mw.col, options)
    gui_hooks.exporter_did_export(options, self)
    tooltip(tr.exporting_collection_exported(), parent=mw)


def exporters_hook(exporters_list):
  exporters_list.append(JsonExporter)
