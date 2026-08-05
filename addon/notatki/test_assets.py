from pathlib import Path

import pytest
from anki.collection import Collection

from .assets import ImportAssetManager, NullExportAssetManager, RealExportAssetManager
from .data import FieldNode


@pytest.fixture
def col(tmp_path):
  collection = Collection(str(tmp_path / "coll.anki2"))
  yield collection
  collection.close()


def _field(tmp_path, value: str = "") -> FieldNode:
  return FieldNode(path=str(tmp_path / "notes.note"), line=1, name="Front", value=value)


def test_resolver_imports_local_image_under_content_hashed_name(tmp_path, col):
  image = tmp_path / "diagram.png"
  image.write_bytes(b"fake png bytes")

  manager = ImportAssetManager()
  resolve = manager.resolver(_field(tmp_path))

  assert resolve("diagram.png") == "diagram-86610c40ef.png"
  assert manager.errors == []

  manager.import_to(col)

  assert col.media.have("diagram-86610c40ef.png")
  assert (Path(col.media.dir()) / "diagram-86610c40ef.png").read_bytes() == b"fake png bytes"


def test_resolver_reports_error_for_missing_file(tmp_path, col):
  manager = ImportAssetManager()
  resolve = manager.resolver(_field(tmp_path))

  href = resolve("missing.png")

  assert href == "missing.png"
  assert len(manager.errors) == 1
  assert "missing.png" in manager.errors[0].message
  assert manager.errors[0].path == str(tmp_path / "notes.note")
  assert manager.errors[0].line == 1


def test_resolver_leaves_remote_urls_unchanged(tmp_path):
  manager = ImportAssetManager()
  resolve = manager.resolver(_field(tmp_path))

  href = resolve("https://example.com/diagram.png")

  assert href == "https://example.com/diagram.png"
  assert manager.errors == []


def test_resolver_leaves_absolute_paths_unchanged(tmp_path):
  image = tmp_path / "diagram.png"
  image.write_bytes(b"fake png bytes")

  manager = ImportAssetManager()
  resolve = manager.resolver(_field(tmp_path))

  href = resolve(str(image))

  assert href == str(image)
  assert manager.errors == []


def test_resolver_dedups_identical_name_and_content_across_fields(tmp_path):
  sub_dir = tmp_path / "sub"
  sub_dir.mkdir()

  image_a = tmp_path / "diagram.png"
  image_a.write_bytes(b"same bytes")
  image_b = sub_dir / "diagram.png"
  image_b.write_bytes(b"same bytes")

  manager = ImportAssetManager()
  resolve_a = manager.resolver(_field(tmp_path))
  resolve_b = manager.resolver(FieldNode(path=str(sub_dir / "notes.note"), line=1, name="Front"))

  filename_a = resolve_a("diagram.png")
  filename_b = resolve_b("diagram.png")

  assert filename_a == filename_b


def test_resolver_keeps_same_named_files_with_different_content_distinct(tmp_path, col):
  sub_dir = tmp_path / "sub"
  sub_dir.mkdir()

  image_a = tmp_path / "diagram.png"
  image_a.write_bytes(b"content a")
  image_b = sub_dir / "diagram.png"
  image_b.write_bytes(b"content b")

  manager = ImportAssetManager()
  resolve_a = manager.resolver(_field(tmp_path))
  resolve_b = manager.resolver(FieldNode(path=str(sub_dir / "notes.note"), line=1, name="Front"))

  filename_a = resolve_a("diagram.png")
  filename_b = resolve_b("diagram.png")

  assert filename_a != filename_b
  assert filename_a.startswith("diagram-")
  assert filename_b.startswith("diagram-")

  manager.import_to(col)

  assert (Path(col.media.dir()) / filename_a).read_bytes() == b"content a"
  assert (Path(col.media.dir()) / filename_b).read_bytes() == b"content b"


def test_import_to_skips_already_present_media(tmp_path, col):
  image = tmp_path / "diagram.png"
  image.write_bytes(b"fake png bytes")

  manager = ImportAssetManager()
  resolve = manager.resolver(_field(tmp_path))
  filename = resolve("diagram.png")

  manager.import_to(col)
  manager.import_to(col)  # Must not raise or duplicate-rename on the second call.

  assert col.media.have(filename)


def test_export_recorder_records_existing_media_and_export_to_copies_it(tmp_path, col):
  data = b"fake png bytes"
  filename = "diagram.png"
  col.media.write_data(filename, data)

  manager = RealExportAssetManager()
  record = manager.recorder(col, guid="guid-1", field_name="Front")

  assert record(filename) == filename
  assert manager.errors == []

  out_dir = tmp_path / "out"
  out_dir.mkdir()
  manager.export_to(out_dir)

  assert (out_dir / filename).read_bytes() == data


def test_export_recorder_reports_error_for_missing_media(col):
  manager = RealExportAssetManager()
  record = manager.recorder(col, guid="guid-1", field_name="Front")

  href = record("missing.png")

  assert href == "missing.png"
  assert len(manager.errors) == 1
  assert "missing.png" in manager.errors[0].message
  assert "guid-1" in manager.errors[0].path
  assert "Front" in manager.errors[0].path


def test_export_recorder_leaves_remote_urls_unchanged(col):
  manager = RealExportAssetManager()
  record = manager.recorder(col, guid="guid-1", field_name="Front")

  href = record("https://example.com/diagram.png")

  assert href == "https://example.com/diagram.png"
  assert manager.errors == []


def test_export_to_writes_a_file_referenced_by_multiple_fields_only_once(tmp_path, col):
  data = b"fake png bytes"
  filename = "shared.png"
  col.media.write_data(filename, data)

  manager = RealExportAssetManager()
  record_front = manager.recorder(col, guid="guid-1", field_name="Front")
  record_back = manager.recorder(col, guid="guid-1", field_name="Back")

  assert record_front(filename) == filename
  assert record_back(filename) == filename

  out_dir = tmp_path / "out"
  out_dir.mkdir()
  manager.export_to(out_dir)

  assert [path.name for path in out_dir.iterdir()] == [filename]
  assert (out_dir / filename).read_bytes() == data


def test_null_export_manager_leaves_src_unchanged_and_records_nothing(tmp_path, col):
  data = b"fake png bytes"
  col.media.write_data("diagram.png", data)

  manager = NullExportAssetManager()
  record = manager.recorder(col, guid="guid-1", field_name="Front")

  assert record("diagram.png") == "diagram.png"
  assert manager.errors == []


def test_null_export_manager_reports_no_error_for_missing_media(col):
  manager = NullExportAssetManager()
  record = manager.recorder(col, guid="guid-1", field_name="Front")

  assert record("missing.png") == "missing.png"
  assert manager.errors == []


def test_null_export_manager_export_to_writes_nothing(tmp_path, col):
  col.media.write_data("diagram.png", b"fake png bytes")

  manager = NullExportAssetManager()
  record = manager.recorder(col, guid="guid-1", field_name="Front")
  record("diagram.png")

  out_dir = tmp_path / "out"
  out_dir.mkdir()
  manager.export_to(out_dir)

  assert list(out_dir.iterdir()) == []
