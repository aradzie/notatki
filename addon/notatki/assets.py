import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from anki.collection import Collection
from aqt.import_export.exporting import ExportOptions

from .data import FieldNode, ParseError
from .format_field import ImageResolver


def _is_local(href: str) -> bool:
  if urlparse(href).scheme:
    return False
  return not Path(href).is_absolute()


@dataclass(slots=True)
class ImportAssetManager:
  """Tracks image references found while rendering note fields.

  Resolves local Markdown image paths to Anki media filenames that keep the
  original base name (for readability) with a content-hash fragment appended
  (to stay unique and avoid clobbering an existing file with different
  content), reusing one filename per distinct source file across the whole
  import run, and later copies the resolved files into the collection's media
  folder.
  """

  errors: list[ParseError] = field(default_factory=list)
  _resolved: dict[Path, str] = field(default_factory=dict)  # source path -> media filename
  _pending: dict[str, Path] = field(default_factory=dict)  # media filename -> source path

  def resolver(self, field_node: FieldNode) -> ImageResolver:
    base_dir = Path(field_node.path).resolve().parent

    def resolve(href: str) -> str:
      if not _is_local(href):
        return href

      source = (base_dir / href).resolve()
      if filename := self._resolved.get(source):
        return filename

      if not source.is_file():
        self.errors.append(
          ParseError(
            path=field_node.path,
            line=field_node.line,
            message=f"Image file not found: '{href}'.",
          )
        )
        return href

      filename = self._hashed_filename(source)
      self._resolved[source] = filename
      self._pending[filename] = source
      return filename

    return resolve

  def import_to(self, col: Collection) -> None:
    for filename, source in self._pending.items():
      if not col.media.have(filename):
        col.media.write_data(filename, source.read_bytes())

  def _hashed_filename(self, source: Path) -> str:
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:10]
    stem = source.stem or "image"
    return f"{stem}-{digest}{source.suffix.lower()}"


@dataclass(slots=True)
class ExportAssetManager(ABC):
  """Tracks image references found while rendering note fields for export."""

  errors: list[ParseError] = field(default_factory=list)

  @staticmethod
  def create(options: ExportOptions) -> "ExportAssetManager":
    return RealExportAssetManager() if options.include_media else NullExportAssetManager()

  @abstractmethod
  def recorder(self, col: Collection, guid: str, field_name: str) -> ImageResolver:
    """Returns a callback to run on every <img> src found in the given field."""

  @abstractmethod
  def export_to(self, out_dir: Path) -> None:
    """Writes out any media files recorded by recorder() into out_dir."""


@dataclass(slots=True)
class RealExportAssetManager(ExportAssetManager):
  """Records the Anki media filenames referenced by <img> elements, then copies
  those files, each written once no matter how many fields reference it, into
  the directory holding the exported note file.
  """

  _pending: dict[str, Path] = field(default_factory=dict)  # media filename -> source path

  def recorder(self, col: Collection, guid: str, field_name: str) -> ImageResolver:
    def record(src: str) -> str:
      if not _is_local(src):
        return src

      source = Path(col.media.dir()) / src
      if not source.is_file():
        self.errors.append(
          ParseError(
            path=f"note {guid} field '{field_name}'",
            message=f"Missing image: '{src}'.",
          )
        )
        return src

      self._pending[src] = source
      return src

    return record

  def export_to(self, out_dir: Path) -> None:
    for filename, source in self._pending.items():
      (out_dir / filename).write_bytes(source.read_bytes())


@dataclass(slots=True)
class NullExportAssetManager(ExportAssetManager):
  """Does nothing; used when media export is disabled."""

  def recorder(self, col: Collection, guid: str, field_name: str) -> ImageResolver:
    def record(src: str) -> str:
      return src

    return record

  def export_to(self, out_dir: Path) -> None:
    pass
