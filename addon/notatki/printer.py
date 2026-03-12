from .data import ModelNodes, NoteNodes


def print_models(models: list[ModelNodes]) -> str:
  lines = Lines()

  for model in models:
    lines.separate()

    lines.append(f"model {model.name}")

    if model.cloze:
      lines.separate()
      lines.append("cloze")

    if model.fields:
      lines.separate()
      for field_node in model.fields:
        lines.append(f"field {field_node.name}")

    for card_node in model.cards:
      lines.separate()
      lines.append(f"card {card_node.name}")
      lines.separate()
      lines.append("front")
      lines.append(card_node.front)
      lines.append("~~~")
      lines.separate()
      lines.append("back")
      lines.append(card_node.back)
      lines.append("~~~")

    if model.styles:
      lines.separate()
      lines.append("styles")
      lines.append(model.styles)
      lines.append("~~~")

  return str(lines)


def print_notes(notes: list[NoteNodes]) -> str:
  lines = Lines()

  for note in notes:
    lines.separate()

    if note.type:
      lines.append(f"!type: {note.type.value}")
    if note.deck:
      lines.append(f"!deck: {note.deck.value}")
    if note.tags:
      lines.append(f"!tags: {note.tags.value}")
    lines.separate()

    if note.guid:
      lines.append(f"!id: {note.guid.value}")

    for field_node in note.fields:
      if "\n" in field_node.value:
        lines.append(f"!{field_node.name}:")
        lines.append(field_node.value)
      else:
        lines.append(f"!{field_node.name}: {field_node.value}")

    lines.append("~~~")

  return str(lines)


class Lines:
  def __init__(self):
    self._parts: list[str] = []
    self._sep: bool = False

  def separate(self) -> None:
    self._sep = True

  def append(self, line: str) -> None:
    if line:
      if self._sep:
        if self._parts:
          self._parts.append("")
        self._sep = False
      self._parts.extend(line.splitlines())

  def __str__(self):
    return "\n".join(self._parts) + "\n" if self._parts else ""
