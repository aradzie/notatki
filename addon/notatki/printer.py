from .data import JModel, JNote


def print_models(models: list[JModel]) -> str:
  parts: list[str] = []
  for index, model in enumerate(models):
    if index > 0:
      parts.append("")

    parts.append(f"model {model.name}")

    if model.cloze:
      parts.append("")
      parts.append("cloze")

    for field in model.fields:
      parts.append("")
      parts.append(f"field {field.name}")

    for card in model.cards:
      parts.append("")
      parts.append(f"card {card.name}")
      parts.append("")
      parts.append("front")
      parts.extend(_multiline_lines(card.front))
      parts.append("~~~")
      parts.append("")
      parts.append("back")
      parts.extend(_multiline_lines(card.back))
      parts.append("~~~")

    if model.styles:
      parts.append("")
      parts.append("styles")
      parts.extend(_multiline_lines(model.styles))
      parts.append("~~~")

  if not parts:
    return ""
  return "\n".join(parts) + "\n"


def print_notes(notes: list[JNote]) -> str:
  parts: list[str] = []
  for index, note in enumerate(notes):
    if index > 0:
      parts.append("")

    parts.append(f"!type: {note.type}")
    parts.append(f"!deck: {note.deck}")
    parts.append(f"!tags: {' '.join(note.tags)}")
    parts.append("")
    parts.append(f"!id: {note.guid}")

    for name, value in note.fields.items():
      parts.extend(_print_note_field(name, value))

    parts.append("~~~")

  if not parts:
    return ""
  return "\n".join(parts) + "\n"


def _multiline_lines(text: str) -> list[str]:
  if not text:
    return []
  return text.splitlines()


def _print_note_field(name: str, value: str) -> list[str]:
  if "\n" in value:
    return [f"!{name.lower()}:", *value.splitlines()]
  return [f"!{name.lower()}: {value}"]
