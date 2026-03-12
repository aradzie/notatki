from collections.abc import Sequence
from pathlib import Path

from anki.cards import CardId
from anki.collection import (
  CardIdsLimit,
  Collection,
  DeckIdLimit,
  ExportLimit,
  NoteIdsLimit,
)
from anki.notes import Note, NoteId
from anki.utils import ids2str
from aqt import AnkiQt, gui_hooks
from aqt.import_export.exporting import ExportOptions, Exporter
from aqt.operations import QueryOp
from aqt.utils import tooltip, tr

from .data import NoteNodes, PropertyNode, FieldNode
from .format_field import html_to_markdown
from .printer import print_notes


class NotesExporter(Exporter):
  extension = "note"
  show_deck_list = True

  @staticmethod
  def name() -> str:
    return "Notatki text file"

  def export(self, mw: AnkiQt, options: ExportOptions) -> None:
    options = gui_hooks.exporter_will_export(options, self)

    def on_success(_: None) -> None:
      gui_hooks.exporter_did_export(options, self)
      tooltip(tr.exporting_collection_exported(), parent=mw)

    QueryOp(
      parent=mw,
      op=lambda col: self._export_notes(col, options),
      success=on_success,
    ).with_progress().run_in_background()

  def _export_notes(self, col: Collection, options: ExportOptions) -> None:
    my_notes: list[NoteNodes] = []
    for note_id in self._note_ids_for_export(col, options.limit):
      my_notes.append(self._map_note(col, col.get_note(note_id)))
    text = print_notes(my_notes)
    Path(options.out_path).write_text(text, encoding="utf-8")

  def _map_note(self, col: Collection, anki_note: Note) -> NoteNodes:
    return NoteNodes(
      type=PropertyNode(name="type", value=anki_note.note_type()["name"]),
      deck=PropertyNode(name="deck", value=self._deck_name(col, anki_note)),
      tags=PropertyNode(name="tags", value=" ".join(anki_note.tags)),
      guid=FieldNode(name="id", value=anki_note.guid),
      fields=[
        FieldNode(name=name, value=html_to_markdown(value))
        for name, value in anki_note.items() if value
      ],
    )

  def _note_ids_for_export(self, col: Collection, limit: ExportLimit) -> Sequence[NoteId]:
    match limit:
      case None:
        return col.find_notes("")
      case NoteIdsLimit(note_ids=note_ids):
        return note_ids
      case CardIdsLimit(card_ids=card_ids):
        return self._note_ids_for_card_ids(col, card_ids)
      case DeckIdLimit(deck_id=deck_id):
        return self._note_ids_for_card_ids(col, col.decks.cids(deck_id, children=True))
    return ()

  def _note_ids_for_card_ids(self, col: Collection, card_ids: Sequence[CardId]) -> Sequence[NoteId]:
    if card_ids:
      return col.db.list(
        f"select distinct nid from cards where id in {ids2str(card_ids)} order by nid"
      )
    return ()

  def _deck_name(self, col: Collection, note: Note) -> str:
    for card in note.cards():
      return col.decks.get(card.did)["name"]
    return "Default"


def exporters_hook(exporters_list: list) -> None:
  exporters_list.append(NotesExporter)
