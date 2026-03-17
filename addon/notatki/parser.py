import re
from enum import StrEnum, auto

from .data import (
  FieldNode,
  ModelCardNode,
  ModelFieldNode,
  ModelNodes,
  Location,
  NoteNodes,
  NoteState,
  ParseError,
  PropertyNode,
)


def _collapse_ws(text: str) -> str:
  return " ".join(text.split())


def _field_name_pattern() -> str:
  return r"[-_A-Za-z0-9]+(?:[ \t]+[-_A-Za-z0-9]+)*"


class NoteParser:
  _FIELD_RE = re.compile(rf"^!(?P<name>{_field_name_pattern()}):(?P<value>.*)$")
  _END_RE = re.compile(r"^~~~[ \t]*$")

  def __init__(self, path: str) -> None:
    self.errors: list[ParseError] = []
    self.notes: list[NoteNodes] = []
    self._path = path
    self._line = 1
    self._note_location: Location | None = None
    self._current_field: FieldNode | None = None
    self._type: PropertyNode | None = None
    self._deck: PropertyNode | None = None
    self._tags: PropertyNode | None = None
    self._guid: FieldNode | None = None
    self._fields: list[FieldNode] = []

  def push(self, line: str) -> None:
    line = line.rstrip()
    if m := self._FIELD_RE.match(line):
      self._handle_field_like(m)
    elif self._END_RE.match(line):
      self._handle_end()
    else:
      self._handle_text(line)
    self._line += 1

  def finish(self) -> None:
    if (
      self._type is not None
      or self._deck is not None
      or self._tags is not None
      or self._guid is not None
      or len(self._fields)
    ):
      self._error("Unterminated note. Expected a closing '~~~' line.")
    NoteState().process_notes(self.notes)

  def _handle_text(self, line: str) -> None:
    if self._current_field is not None:
      if self._current_field.value:
        self._current_field.value += "\n" + line
      else:
        self._current_field.value = line
    elif line:
      self._error("Unexpected text outside a multiline field.")

  def _handle_end(self) -> None:
    note_location = self._note_location or Location(path=self._path, line=self._line)
    self.notes.append(
      NoteNodes(
        path=note_location.path,
        line=note_location.line,
        type=self._type,
        deck=self._deck,
        tags=self._tags,
        guid=self._guid,
        fields=self._fields,
        end=Location(path=self._path, line=self._line)
      ),
    )
    self._note_location = None
    self._current_field = None
    self._type = None
    self._deck = None
    self._tags = None
    self._guid = None
    self._fields = []

  def _handle_field_like(self, match: re.Match[str]) -> None:
    self._current_field = None
    name = _collapse_ws(match.group("name")).lower()
    value = match.group("value")
    match name:
      case "type":
        if self._type is not None:
          self._error(f"Duplicate property '{name}'.")
          return
        if len(self._fields):
          self._error(f"Unexpected property '{name}'.")
          return
        self._type = PropertyNode(
          path=self._path,
          line=self._line,
          name=name,
          value=_collapse_ws(value),
        )
      case "deck":
        if self._deck is not None:
          self._error(f"Duplicate property '{name}'.")
          return
        if len(self._fields):
          self._error(f"Unexpected property '{name}'.")
          return
        self._deck = PropertyNode(
          path=self._path,
          line=self._line,
          name=name,
          value=_collapse_ws(value),
        )
      case "tags":
        if self._tags is not None:
          self._error(f"Duplicate property '{name}'.")
          return
        if len(self._fields):
          self._error(f"Unexpected property '{name}'.")
          return
        self._tags = PropertyNode(
          path=self._path,
          line=self._line,
          name=name,
          value=_collapse_ws(value),
        )
      case _:
        field = FieldNode(
          path=self._path,
          line=self._line,
          name=name,
          value=value.strip(),
        )
        self._note_location = self._note_location or field
        self._current_field = field
        self._fields.append(field)

  def _error(self, message: str) -> None:
    self.errors.append(ParseError(path=self._path, line=self._line, message=message))


class ModelParser:
  _MODEL_RE = re.compile(r"^model[ \t]+(?P<name>.+?)[ \t]*$")
  _CLOZE_RE = re.compile(r"^cloze[ \t]*$")
  _FIELD_RE = re.compile(rf"^field[ \t]+(?P<name>{_field_name_pattern()})(?P<optional>\?)?[ \t]*$")
  _CARD_RE = re.compile(r"^card[ \t]+(?P<name>.+?)[ \t]*$")
  _FRONT_RE = re.compile(r"^front[ \t]*$")
  _BACK_RE = re.compile(r"^back[ \t]*$")
  _STYLES_RE = re.compile(r"^styles[ \t]*$")
  _END_RE = re.compile(r"^~~~[ \t]*$")

  class _State(StrEnum):
    EXPECT_MODEL = auto()
    EXPECT_CLOZE_OR_FIELD = auto()
    EXPECT_FIELD_OR_CARD = auto()
    EXPECT_FRONT = auto()
    EXPECT_FRONT_END = auto()
    EXPECT_BACK = auto()
    EXPECT_BACK_END = auto()
    EXPECT_CARD_OR_STYLES = auto()
    EXPECT_STYLES_END = auto()

  def __init__(self, path: str) -> None:
    self.errors: list[ParseError] = []
    self.models: list[ModelNodes] = []
    self._path = path
    self._line = 1
    self._state = self._State.EXPECT_MODEL
    self._model_line: int | None = None
    self._model_name: str | None = None
    self._model_cloze = False
    self._model_fields: list[ModelFieldNode] = []
    self._model_cards: list[ModelCardNode] = []
    self._model_styles = ""
    self._card_line: int | None = None
    self._card_name: str | None = None
    self._card_front: str | None = None
    self._card_back: str | None = None
    self._multiline_lines: list[str] | None = None

  def push(self, line: str) -> None:
    line = line.rstrip()

    if self._state in {
      self._State.EXPECT_FRONT_END,
      self._State.EXPECT_BACK_END,
      self._State.EXPECT_STYLES_END,
    }:
      if self._END_RE.match(line):
        self._finish_multiline()
      else:
        self._multiline_lines.append(line)
      self._line += 1
      return

    if line == "":
      pass  # Skip an empty line.
    elif match := self._MODEL_RE.match(line):
      self._handle_model(match)
    elif self._CLOZE_RE.match(line):
      self._handle_cloze()
    elif match := self._FIELD_RE.match(line):
      self._handle_field(match)
    elif match := self._CARD_RE.match(line):
      self._handle_card(match)
    elif self._FRONT_RE.match(line):
      self._handle_front()
    elif self._BACK_RE.match(line):
      self._handle_back()
    elif self._STYLES_RE.match(line):
      self._handle_styles()
    elif self._END_RE.match(line):
      self._handle_end()
    else:
      self._error("Unexpected text outside a multiline block.")
    self._line += 1

  def finish(self) -> None:
    if self._state in {
      self._State.EXPECT_FRONT_END,
      self._State.EXPECT_BACK_END,
      self._State.EXPECT_STYLES_END,
    }:
      self._error("Unterminated multiline block. Expected a closing '~~~' line.")
      self._finish_multiline()
    self._finish_model()

  def _handle_model(self, match: re.Match[str]) -> None:
    self._finish_model()
    self._model_line = self._line
    self._model_name = _collapse_ws(match.group("name"))
    self._model_cloze = False
    self._model_fields = []
    self._model_cards = []
    self._model_styles = ""
    self._card_line = None
    self._card_name = None
    self._card_front = None
    self._card_back = None
    self._state = self._State.EXPECT_CLOZE_OR_FIELD

  def _handle_cloze(self) -> None:
    if self._state is not self._State.EXPECT_CLOZE_OR_FIELD:
      self._error("Unexpected close flag.")
      return
    self._model_cloze = True
    self._state = self._State.EXPECT_FIELD_OR_CARD

  def _handle_field(self, match: re.Match[str]) -> None:
    if self._state not in {
      self._State.EXPECT_CLOZE_OR_FIELD,
      self._State.EXPECT_FIELD_OR_CARD,
    }:
      self._error("Unexpected field.")
      return
    self._model_fields.append(
      ModelFieldNode(
        path=self._path,
        line=self._line,
        name=_collapse_ws(match.group("name")),
        required=match.group("optional") is None,
      ),
    )
    self._state = self._State.EXPECT_FIELD_OR_CARD

  def _handle_card(self, match: re.Match[str]) -> None:
    if self._state not in {
      self._State.EXPECT_FIELD_OR_CARD,
      self._state.EXPECT_CARD_OR_STYLES,
    }:
      self._error("Unexpected card.")
      return
    self._finish_card()
    self._card_line = self._line
    self._card_name = _collapse_ws(match.group("name"))
    self._card_front = None
    self._card_back = None
    self._state = self._State.EXPECT_FRONT

  def _handle_front(self) -> None:
    if self._state is not self._State.EXPECT_FRONT:
      self._error("Unexpected card front.")
      return
    self._card_front = ""
    self._start_multiline()
    self._state = self._State.EXPECT_FRONT_END

  def _handle_back(self) -> None:
    if self._state is not self._State.EXPECT_BACK:
      self._error("Unexpected card back.")
      return
    self._card_back = ""
    self._start_multiline()
    self._state = self._State.EXPECT_BACK_END

  def _handle_styles(self) -> None:
    if self._state is not self._state.EXPECT_CARD_OR_STYLES:
      self._error("Unexpected styles.")
      return
    self._finish_card()
    self._model_styles = ""
    self._start_multiline()
    self._state = self._State.EXPECT_STYLES_END

  def _handle_end(self) -> None:
    self._error("Unexpected '~~~' outside a multiline block.")

  def _start_multiline(self) -> None:
    self._multiline_lines = []

  def _finish_multiline(self) -> None:
    if self._multiline_lines is None:
      return
    value = "\n".join(self._multiline_lines).strip()
    self._multiline_lines = None
    match self._state:
      case self._State.EXPECT_FRONT_END:
        self._card_front = value
        self._state = self._State.EXPECT_BACK
      case self._State.EXPECT_BACK_END:
        self._card_back = value
        self._state = self._State.EXPECT_CARD_OR_STYLES
      case self._State.EXPECT_STYLES_END:
        self._model_styles = value
        self._finish_model()

  def _finish_model(self) -> None:
    if self._model_name is None:
      return
    self._finish_card()
    self.models.append(
      ModelNodes(
        path=self._path,
        line=self._model_line,
        name=self._model_name,
        cloze=self._model_cloze,
        fields=self._model_fields,
        cards=self._model_cards,
        styles=self._model_styles,
      )
    )
    self._model_line = None
    self._model_name = None
    self._model_cloze = False
    self._model_fields = []
    self._model_cards = []
    self._model_styles = ""
    self._card_line = None
    self._card_name = None
    self._card_front = None
    self._card_back = None
    self._state = self._State.EXPECT_MODEL

  def _finish_card(self) -> None:
    if self._card_name is None:
      return
    self._model_cards.append(
      ModelCardNode(
        path=self._path,
        line=self._card_line,
        name=self._card_name,
        front=self._card_front or "",
        back=self._card_back or "",
      )
    )
    self._card_line = None
    self._card_name = None
    self._card_front = None
    self._card_back = None
    self._state = self._State.EXPECT_CARD_OR_STYLES

  def _error(self, message: str) -> None:
    self.errors.append(ParseError(path=self._path, line=self._line, message=message))
