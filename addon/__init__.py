def initialize_addon():
  import os
  import sys

  sys.path.append(os.path.join(os.path.dirname(__file__), ".venv", "lib", "python3.12", "site-packages"))

  from aqt import mw, gui_hooks
  from aqt.qt import QAction

  from .notatki.export_json import exporters_hook
  from .notatki.import_json import import_notes_from_json

  action = QAction("Import Notes from JSON", mw)
  action.triggered.connect(import_notes_from_json)
  mw.form.menuCol.insertAction(mw.form.menuCol.actions()[2], action)

  gui_hooks.exporters_list_did_initialize.append(exporters_hook)


if __name__ != "test":
  initialize_addon()
