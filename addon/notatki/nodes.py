from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class Location:
  path: Path | None = None
  line: int = 0


@dataclass(slots=True)
class ParseError(Location):
  message: str = ""

  def __str__(self) -> str:
    if self.path and self.line:
      return f"{self.path}:{self.line} {self.message}"
    if self.path:
      return f"{self.path} {self.message}"
    return f"<unknown> {self.message}"


@dataclass(slots=True)
class Node(Location):
  pass


@dataclass(slots=True)
class PropertyNode(Node):
  name: str = ""
  value: str = ""


@dataclass(slots=True)
class FieldNode(Node):
  name: str = ""
  value: str = ""


@dataclass(slots=True)
class NoteNodes(Location):
  properties: list[PropertyNode] = field(default_factory=list)
  fields: list[FieldNode] = field(default_factory=list)


@dataclass(slots=True)
class ModelNameNode(Node):
  value: str = ""


@dataclass(slots=True)
class ModelIdNode(Node):
  value: int = 0


@dataclass(slots=True)
class ModelClozeNode(Node):
  value: bool = True


@dataclass(slots=True)
class ModelFieldNode(Node):
  name: str = ""
  required: bool = True


@dataclass(slots=True)
class ModelCardSideNode(Node):
  text: str = ""


@dataclass(slots=True)
class ModelCardNode(Node):
  name: str = ""
  front: ModelCardSideNode | None = None
  back: ModelCardSideNode | None = None


@dataclass(slots=True)
class ModelStyleNode(Node):
  style: str = ""


@dataclass(slots=True)
class ModelNodes(Location):
  name: ModelNameNode | None = None
  id: ModelIdNode | None = None
  cloze: ModelClozeNode | None = None
  fields: list[ModelFieldNode] = field(default_factory=list)
  cards: list[ModelCardNode] = field(default_factory=list)
  styles: ModelStyleNode | None = None
