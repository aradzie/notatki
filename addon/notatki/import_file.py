from pathlib import Path

from anki.collection import Collection
from aqt import AnkiQt
from aqt.import_export.importing import Importer, IMPORTERS
from aqt.operations import QueryOp

from .import_state import ImportState


class FileImporter(Importer):
  accepted_file_endings = [".model", ".note"]

  @classmethod
  def do_import(cls, mw: AnkiQt, path: str) -> None:
    def start_import(col: Collection) -> ImportState:
      mw.create_backup_now()
      state = ImportState.from_file(col, Path(path))
      state.start()
      return state

    def on_success(state: ImportState) -> None:
      state.report()
      mw.reset()

    QueryOp(
      parent=mw,
      op=lambda col: start_import(col),
      success=on_success,
    ).with_progress().run_in_background()


def init_import_file() -> None:
  IMPORTERS.append(FileImporter)
