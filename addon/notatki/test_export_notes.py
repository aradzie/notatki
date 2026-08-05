from pathlib import Path

import pytest
from anki.collection import Collection
from aqt.import_export.exporting import ExportOptions

from .export_notes import NotesExporter


@pytest.fixture
def col(tmp_path):
  collection = Collection(str(tmp_path / "coll.anki2"))
  yield collection
  collection.close()


def _options(out_path: Path, include_media: bool = True) -> ExportOptions:
  return ExportOptions(
    out_path=str(out_path),
    include_scheduling=False,
    include_deck_configs=False,
    include_media=include_media,
    include_tags=True,
    include_html=True,
    include_deck=True,
    include_notetype=True,
    include_guid=True,
    legacy_support=False,
    limit=None,
  )


def _add_note(col: Collection, front: str) -> None:
  note = col.new_note(col.models.by_name("Basic"))
  note["Front"] = front
  col.add_note(note, col.decks.id("Default"))


def test_export_notes_copies_referenced_image_next_to_the_note_file(tmp_path, col):
  col.media.write_data("diagram.png", b"fake png bytes")
  _add_note(col, '<img src="diagram.png">')

  out_path = tmp_path / "out" / "notes.note"
  out_path.parent.mkdir()

  exporter = NotesExporter()
  asset_manager = exporter._export_notes(col, _options(out_path))

  assert asset_manager.errors == []
  assert "![](diagram.png)" in out_path.read_text(encoding="utf-8")
  assert (out_path.parent / "diagram.png").read_bytes() == b"fake png bytes"


def test_export_notes_reports_error_for_missing_image(tmp_path, col):
  _add_note(col, '<img src="missing.png">')

  out_path = tmp_path / "out" / "notes.note"
  out_path.parent.mkdir()

  exporter = NotesExporter()
  asset_manager = exporter._export_notes(col, _options(out_path))

  assert len(asset_manager.errors) == 1
  assert "missing.png" in asset_manager.errors[0].message
  assert not (out_path.parent / "missing.png").exists()


def test_export_notes_writes_image_shared_by_two_notes_only_once(tmp_path, col):
  col.media.write_data("shared.png", b"fake png bytes")
  _add_note(col, '<img src="shared.png">')
  _add_note(col, '<img src="shared.png">')

  out_path = tmp_path / "out" / "notes.note"
  out_path.parent.mkdir()

  exporter = NotesExporter()
  asset_manager = exporter._export_notes(col, _options(out_path))

  assert asset_manager.errors == []
  written = [p.name for p in out_path.parent.iterdir() if p != out_path]
  assert written == ["shared.png"]


def test_export_notes_skips_media_when_include_media_is_false(tmp_path, col):
  col.media.write_data("diagram.png", b"fake png bytes")
  _add_note(col, '<img src="diagram.png">')

  out_path = tmp_path / "out" / "notes.note"
  out_path.parent.mkdir()

  exporter = NotesExporter()
  asset_manager = exporter._export_notes(col, _options(out_path, include_media=False))

  assert asset_manager.errors == []
  assert "![](diagram.png)" in out_path.read_text(encoding="utf-8")
  written = [p.name for p in out_path.parent.iterdir() if p != out_path]
  assert written == []


def test_export_notes_skips_missing_media_error_when_include_media_is_false(tmp_path, col):
  _add_note(col, '<img src="missing.png">')

  out_path = tmp_path / "out" / "notes.note"
  out_path.parent.mkdir()

  exporter = NotesExporter()
  asset_manager = exporter._export_notes(col, _options(out_path, include_media=False))

  assert asset_manager.errors == []
