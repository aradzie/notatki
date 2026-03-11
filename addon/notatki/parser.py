import re
from pathlib import Path
from typing import Callable

from .nodes import (
  FieldNode,
  ModelCardNode,
  ModelCardSideNode,
  ModelClozeNode,
  ModelFieldNode,
  ModelNameNode,
  ModelNodes,
  ModelStyleNode,
  Node,
  NoteNodes,
  ParseError,
  PropertyNode,
)


def _collapse_ws(text: str) -> str:
  return " ".join(text.split())


def _rstrip_line(line: str) -> str:
  return line.rstrip("\r\n")


def _trim_line_text(text: str) -> str:
  return text.rstrip(" \t")


def _field_name_pattern() -> str:
  return r"[-_A-Za-z0-9]+(?:[ \t]+[-_A-Za-z0-9]+)*"


class NoteParser:
  _FIELD_RE = re.compile(rf"^!(?P<name>{_field_name_pattern()}):(?P<value>.*)$")
  _END_RE = re.compile(r"^~~~[ \t]*$")
  _BLANK_RE = re.compile(r"^[ \t]*$")
  _PROPERTY_NAMES = {"type", "deck", "tags"}

  def __init__(self, path: Path | None = None):
    self.path = path
    self.line = 1
    self.errors: list[ParseError] = []
    self.notes: list[NoteNodes] = []
    self._current_note: NoteNodes | None = None
    self._current_field: FieldNode | None = None
    self._current_field_lines: list[str] | None = None
    self._handlers: list[tuple[re.Pattern[str], Callable[[re.Match[str], str], bool]]] = [
      (self._BLANK_RE, self._handle_blank),
      (self._END_RE, self._handle_end),
      (self._FIELD_RE, self._handle_field_like),
    ]

  def push(self, line: str):
    current_line = self.line
    text = _rstrip_line(line)

    if self._current_field is not None and not self._matches_structural(text):
      self._current_field_lines.append(_trim_line_text(text))
      self.line += 1
      return

    for pattern, handler in self._handlers:
      match = pattern.match(text)
      if match is None:
        continue
      handled = handler(match, text)
      self.line += 1
      if handled:
        return
      break
    else:
      self._error(current_line, f'Unexpected note line: "{text}"')
      self.line += 1

  def finish(self):
    self._finish_current_field()
    if self._current_note is not None and self._current_note.fields:
      self._error(self.line, "Unterminated note. Expected a closing '~~~' line.")

  def _matches_structural(self, text: str) -> bool:
    return self._END_RE.match(text) is not None or self._FIELD_RE.match(text) is not None

  def _handle_blank(self, match: re.Match[str], text: str) -> bool:
    return True

  def _handle_end(self, match: re.Match[str], text: str) -> bool:
    self._finish_current_field()
    if self._current_note is not None and self._current_note.fields:
      self.notes.append(self._current_note)
    self._current_note = None
    return True

  def _handle_field_like(self, match: re.Match[str], text: str) -> bool:
    name = _collapse_ws(match.group("name"))
    value = match.group("value").lstrip(" \t")
    if self._current_note is None:
      self._current_note = NoteNodes(path=self.path)

    # Property names are only special before the first regular field in a note.
    if not self._current_note.fields and name.lower() in self._PROPERTY_NAMES:
      self._finish_current_field()
      node = PropertyNode(
        path=self.path,
        line=self.line,
        name=name.lower(),
        value=_collapse_ws(value),
      )
      self._current_note.properties.append(node)
      return True

    self._finish_current_field()
    node = FieldNode(path=self.path, line=self.line, name=name, value="")
    self._current_note.fields.append(node)
    self._current_field = node
    self._current_field_lines = [_trim_line_text(value)]
    return True

  def _finish_current_field(self):
    if self._current_field is None or self._current_field_lines is None:
      return
    self._current_field.value = "\n".join(self._current_field_lines).strip()
    self._current_field = None
    self._current_field_lines = None

  def _error(self, line: int, message: str):
    self.errors.append(ParseError(path=self.path, line=line, message=message))


class ModelParser:
  _MODEL_RE = re.compile(r"^model[ \t]+(?P<name>.+?)[ \t]*$")
  _CLOZE_RE = re.compile(r"^cloze[ \t]*$")
  _FIELD_RE = re.compile(rf"^field[ \t]+(?P<name>{_field_name_pattern()})(?P<optional>\?)?[ \t]*$")
  _CARD_RE = re.compile(r"^card[ \t]+(?P<name>.+?)[ \t]*$")
  _FRONT_RE = re.compile(r"^front[ \t]*$")
  _BACK_RE = re.compile(r"^back[ \t]*$")
  _STYLES_RE = re.compile(r"^styles[ \t]*$")
  _END_RE = re.compile(r"^~~~[ \t]*$")
  _BLANK_RE = re.compile(r"^[ \t]*$")

  def __init__(self, path: Path):
    self.path = path
    self.line = 1
    self.errors: list[ParseError] = []
    self.models: list[ModelNodes] = []
    self._current_model: ModelNodes | None = None
    self._current_card: ModelCardNode | None = None
    self._multiline_target: tuple[Node, str] | None = None
    self._multiline_lines: list[str] | None = None
    self._handlers: list[tuple[re.Pattern[str], Callable[[re.Match[str], str], bool]]] = [
      (self._BLANK_RE, self._handle_blank),
      (self._MODEL_RE, self._handle_model),
      (self._CLOZE_RE, self._handle_cloze),
      (self._FIELD_RE, self._handle_field),
      (self._CARD_RE, self._handle_card),
      (self._FRONT_RE, self._handle_front),
      (self._BACK_RE, self._handle_back),
      (self._STYLES_RE, self._handle_styles),
      (self._END_RE, self._handle_end),
    ]

  def push(self, line: str):
    current_line = self.line
    text = _rstrip_line(line)

    if self._multiline_target is not None:
      if self._END_RE.match(text):
        self._finish_multiline()
        self.line += 1
        return
      self._multiline_lines.append(_trim_line_text(text))
      self.line += 1
      return

    for pattern, handler in self._handlers:
      match = pattern.match(text)
      if match is None:
        continue
      handled = handler(match, text)
      self.line += 1
      if handled:
        return
      break
    else:
      self._error(current_line, f'Unexpected model line: "{text}"')
      self.line += 1

  def finish(self):
    if self._multiline_target is not None:
      self._error(self.line, "Unterminated multiline block. Expected a closing '~~~' line.")
      self._finish_multiline()
    self._finish_model()

  def _handle_blank(self, match: re.Match[str], text: str) -> bool:
    return True

  def _handle_model(self, match: re.Match[str], text: str) -> bool:
    self._finish_model()
    self._current_model = ModelNodes(
      path=self.path,
      name=ModelNameNode(path=self.path, line=self.line, value=_collapse_ws(match.group("name"))),
    )
    self._current_card = None
    return True

  def _handle_cloze(self, match: re.Match[str], text: str) -> bool:
    if self._current_model is None:
      self._error(self.line, "Cloze flag found before a model header.")
      return True
    if self._current_model.cloze is not None:
      self._error(self.line, f'Model "{self._model_name()}" already has a cloze flag.')
      return True
    if self._current_model.fields or self._current_model.cards or self._current_model.styles is not None:
      self._error(self.line, "Cloze flag must appear before fields, cards, and styles.")
      return True
    self._current_model.cloze = ModelClozeNode(path=self.path, line=self.line, value=True)
    return True

  def _handle_field(self, match: re.Match[str], text: str) -> bool:
    if self._current_model is None:
      self._error(self.line, "Field found before a model header.")
      return True
    if self._current_model.cards or self._current_model.styles is not None:
      self._error(self.line, "Fields must appear before cards and styles.")
      return True
    node = ModelFieldNode(
      path=self.path,
      line=self.line,
      name=_collapse_ws(match.group("name")),
      required=match.group("optional") is None,
    )
    self._current_model.fields.append(node)
    return True

  def _handle_card(self, match: re.Match[str], text: str) -> bool:
    if self._current_model is None:
      self._error(self.line, "Card found before a model header.")
      return True
    if self._current_model.styles is not None:
      self._error(self.line, "Cards must appear before styles.")
      return True
    if self._current_card is not None and self._current_card.back is None:
      self._error(self.line, f'Card "{self._current_card.name}" is missing a back block.')
    self._current_card = ModelCardNode(
      path=self.path,
      line=self.line,
      name=_collapse_ws(match.group("name")),
    )
    self._current_model.cards.append(self._current_card)
    return True

  def _handle_front(self, match: re.Match[str], text: str) -> bool:
    if self._current_card is None:
      self._error(self.line, "Front block found before a card header.")
      return True
    if self._current_card.front is not None:
      self._error(self.line, f'Card "{self._current_card.name}" already has a front block.')
      return True
    node = ModelCardSideNode(path=self.path, line=self.line)
    self._current_card.front = node
    self._start_multiline(node, "text")
    return True

  def _handle_back(self, match: re.Match[str], text: str) -> bool:
    if self._current_card is None:
      self._error(self.line, "Back block found before a card header.")
      return True
    if self._current_card.front is None:
      self._error(self.line, f'Card "{self._current_card.name}" must define front before back.')
      return True
    if self._current_card.back is not None:
      self._error(self.line, f'Card "{self._current_card.name}" already has a back block.')
      return True
    node = ModelCardSideNode(path=self.path, line=self.line)
    self._current_card.back = node
    self._start_multiline(node, "text")
    return True

  def _handle_styles(self, match: re.Match[str], text: str) -> bool:
    if self._current_model is None:
      self._error(self.line, "Styles block found before a model header.")
      return True
    if self._current_model.styles is not None:
      self._error(self.line, f'Model "{self._model_name()}" already has a styles block.')
      return True
    node = ModelStyleNode(path=self.path, line=self.line)
    self._current_model.styles = node
    self._start_multiline(node, "style")
    return True

  def _handle_end(self, match: re.Match[str], text: str) -> bool:
    self._error(self.line, "Unexpected '~~~' outside a multiline block.")
    return True

  def _start_multiline(self, node: Node, attr: str):
    self._multiline_target = (node, attr)
    self._multiline_lines = []

  def _finish_multiline(self):
    if self._multiline_target is None or self._multiline_lines is None:
      return
    node, attr = self._multiline_target
    setattr(node, attr, "\n".join(self._multiline_lines).strip())
    self._multiline_target = None
    self._multiline_lines = None

  def _finish_model(self):
    if self._current_model is None:
      return
    if self._current_card is not None:
      if self._current_card.front is None:
        self._error(self.line, f'Card "{self._current_card.name}" is missing a front block.')
      if self._current_card.back is None:
        self._error(self.line, f'Card "{self._current_card.name}" is missing a back block.')
    self.models.append(self._current_model)
    self._current_model = None
    self._current_card = None

  def _error(self, line: int, message: str):
    self.errors.append(ParseError(path=self.path, line=line, message=message))

  def _model_name(self) -> str:
    if self._current_model is None or self._current_model.name is None:
      return "<unknown>"
    return self._current_model.name.value
