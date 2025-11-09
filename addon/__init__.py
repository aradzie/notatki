def initialize_addon():
  import os
  import sys

  sys.path.append(os.path.join(os.path.dirname(__file__), ".venv", "lib", "python3.12", "site-packages"))

  from aqt import gui_hooks

  from .notatki.export_json import exporters_hook
  from .notatki.import_json import init_importer

  init_importer()
  gui_hooks.exporters_list_did_initialize.append(exporters_hook)


if __name__ != "test":
  initialize_addon()
