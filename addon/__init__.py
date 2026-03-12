def initialize_addon():
  import sys
  from pathlib import Path

  sys.path.insert(0, str(Path(__file__).parent / "vendor.zip"))

  from aqt import mw, gui_hooks
  from .notatki.import_directory import init_import_directory
  from .notatki.import_file import init_import_file
  from .notatki.export_notes import exporters_hook

  if mw: init_import_directory(mw)
  init_import_file()
  gui_hooks.exporters_list_did_initialize.append(exporters_hook)


if __name__ != "test":
  initialize_addon()
