from dataclasses import dataclass, field


@dataclass(slots=True)
class Location:
  path: str = "<unknown>"
  line: int = 0


@dataclass(slots=True)
class ParseError(Location):
  message: str = ""

  def __str__(self) -> str:
    if self.line:
      return f"{self.path}:{self.line} {self.message}"
    else:
      return f"{self.path} {self.message}"


@dataclass(slots=True)
class PropertyNode(Location):
  name: str = ""
  value: str = ""


@dataclass(slots=True)
class FieldNode(Location):
  name: str = ""
  value: str = ""


@dataclass(slots=True)
class NoteNodes(Location):
  type: PropertyNode | None = None
  deck: PropertyNode | None = None
  tags: PropertyNode | None = None
  guid: FieldNode | None = None
  fields: list[FieldNode] = field(default_factory=list)
  end: Location = field(default_factory=Location)


@dataclass(slots=True)
class NoteState:
  type: str = "Basic"
  deck: str = "Default"
  tags: str = ""

  def process_notes(self, notes: list[NoteNodes]) -> None:
    for note in notes:
      self.get_from(note)
      self.set_to(note)

  def get_from(self, note_nodes: NoteNodes) -> None:
    if note_nodes.type is not None:
      self.type = note_nodes.type.value
    if note_nodes.deck is not None:
      self.deck = note_nodes.deck.value
    if note_nodes.tags is not None:
      self.tags = note_nodes.tags.value

  def set_to(self, note_nodes: NoteNodes) -> None:
    if note_nodes.type is None:
      note_nodes.type = PropertyNode(name="type", value=self.type)
    if note_nodes.deck is None:
      note_nodes.deck = PropertyNode(name="deck", value=self.deck)
    if note_nodes.tags is None:
      note_nodes.tags = PropertyNode(name="tags", value=self.tags)


@dataclass(slots=True)
class ModelFieldNode(Location):
  name: str = ""
  required: bool = True


@dataclass(slots=True)
class ModelCardNode(Location):
  name: str = ""
  front: str = ""
  back: str = ""


@dataclass(slots=True)
class ModelNodes(Location):
  name: str = ""
  cloze: bool = False
  fields: list[ModelFieldNode] = field(default_factory=list)
  cards: list[ModelCardNode] = field(default_factory=list)
  styles: str = ""
