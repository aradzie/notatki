from pathlib import Path

from anki.collection import Collection
from aqt import AnkiQt, QAction, QFileDialog
from aqt.operations import QueryOp

from .import_state import ImportState


def init_import_directory(mw: AnkiQt):
  def start_import(col: Collection, path: str) -> ImportState:
    mw.create_backup_now()
    state = ImportState.from_directory(col, Path(path))
    state.start()
    return state

  def on_success(state: ImportState):
    state.report()
    mw.reset()

  def import_dir():
    path = QFileDialog.getExistingDirectory(
      caption="Notes Directory",
      options=QFileDialog.Option.ShowDirsOnly,
    )
    if path:
      QueryOp(
        parent=mw,
        op=lambda col: start_import(col, path),
        success=on_success,
      ).with_progress().run_in_background()

  action = QAction("Import Models and Notes...", mw)
  action.triggered.connect(import_dir)
  mw.form.menuCol.insertActions(mw.form.menuCol.actions()[4], [action])
