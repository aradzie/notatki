from dataclasses import dataclass

from .data import (
  JModel,
  JModelCard,
  JModelField,
  JNote,
)
from .format_field import markdown_to_html
from .models import INTERNAL_MODELS
from .nodes import (
  FieldNode,
  ModelFieldNode,
  ModelNodes,
  Node,
  NoteNodes,
  ParseError,
  PropertyNode,
)


@dataclass(slots=True)
class ModelInfo:
  model: JModel
  field_names: dict[str, str]
  required_fields: set[str]


@dataclass(slots=True)
class NoteState:
  type_name: str = "Basic"
  deck: str = ""
  tags: str = ""


class Checker:
  errors: list[ParseError]
  models: list[JModel]
  notes: list[JNote]
  _model_by_name: dict[str, ModelInfo]
  _ids: dict[str, ParseError]

  def check(self, models: list[ModelNodes], notes: list[NoteNodes]):
    self.errors = []
    self.models = []
    self.notes = []
    self._model_by_name = {}
    self._ids = {}

    for model in INTERNAL_MODELS:
      self._register_model_info(model)

    for model_nodes in models:
      self._check_model(model_nodes)

    state = NoteState()
    for note_nodes in notes:
      self._check_note(note_nodes, state)

  def _check_model(self, model_nodes: ModelNodes):
    name = model_nodes.name.value
    name_key = name.lower()
    if name_key in self._model_by_name:
      self._error(model_nodes.name, model_nodes.name.line, f'Duplicate model: "{name}"')
      return

    had_error = False
    seen_fields: dict[str, ModelFieldNode] = {}
    jfields: list[JModelField] = []
    required_fields: set[str] = set()
    for field_node in model_nodes.fields:
      key = field_node.name.lower()
      if key in seen_fields:
        self._error(field_node, field_node.line, f'Duplicate field: "{field_node.name}"')
        had_error = True
        continue
      seen_fields[key] = field_node
      jfields.append(JModelField(name=field_node.name))
      if field_node.required:
        required_fields.add(key)

    seen_cards: set[str] = set()
    jcards: list[JModelCard] = []
    for card_node in model_nodes.cards:
      card_key = card_node.name.lower()
      if card_key in seen_cards:
        self._error(card_node, card_node.line, f'Duplicate card: "{card_node.name}"')
        had_error = True
        continue
      seen_cards.add(card_key)
      jcards.append(JModelCard(
        name=card_node.name,
        front=card_node.front.text if card_node.front is not None else "",
        back=card_node.back.text if card_node.back is not None else "",
      ))

    if had_error:
      return

    jmodel = JModel(
      name=name,
      cloze=model_nodes.cloze is not None and model_nodes.cloze.value,
      fields=jfields,
      cards=jcards,
      styles=model_nodes.styles.style if model_nodes.styles is not None else "",
    )
    self.models.append(jmodel)
    self._model_by_name[name_key] = ModelInfo(
      model=jmodel,
      field_names={field.name.lower(): field.name for field in jfields},
      required_fields=required_fields,
    )

  def _check_note(self, note_nodes: NoteNodes, state: NoteState):
    seen_properties: set[str] = set()
    note_type_name = state.type_name
    deck = state.deck
    tags = state.tags

    for prop in note_nodes.properties:
      key = prop.name.lower()
      if key in seen_properties:
        self._error(prop, prop.line, f'Duplicate property: "{prop.name}"')
        continue
      seen_properties.add(key)
      if key == "type":
        note_type_name = prop.value
      elif key == "deck":
        deck = prop.value
      elif key == "tags":
        tags = prop.value

    model = self._lookup_model(note_type_name)
    if model is None:
      line = self._property_line(note_nodes.properties, "type")
      self._error(note_nodes, line, f'Unknown note type: "{note_type_name}"')
      return

    state.type_name = model.model.name
    state.deck = deck
    state.tags = tags

    seen_fields: set[str] = set()
    present_fields: set[str] = set()
    note_id = ""
    fields: dict[str, str] = {}
    had_error = False

    for field_node in note_nodes.fields:
      field_key = field_node.name.lower()
      if field_key in seen_fields:
        self._error(field_node, field_node.line, f'Duplicate field: "{field_node.name}"')
        had_error = True
        continue
      seen_fields.add(field_key)

      if field_key == "id":
        note_id = field_node.value
        continue

      model_field_name = model.field_names.get(field_key)
      if model_field_name is None:
        self._error(field_node, field_node.line, f'Unknown field: "{field_node.name}"')
        had_error = True
        continue
      fields[model_field_name] = markdown_to_html(field_node.value)
      present_fields.add(field_key)

    for required_key in model.required_fields:
      if required_key not in present_fields:
        field_name = model.field_names[required_key]
        self._error(note_nodes, self._note_line(note_nodes), f'Missing required field: "{field_name}"')
        had_error = True

    if not note_id:
      self._error(note_nodes, self._note_line(note_nodes), "Missing note id.")
      return

    if not self._register_id(
      note_id,
      ParseError(
        path=note_nodes.path,
        line=self._field_line(note_nodes.fields, "id"),
        message=f'Duplicate ID: "{note_id}"',
      ),
    ):
      had_error = True

    if had_error:
      return

    self.notes.append(JNote(
      guid=note_id,
      type=model.model.name,
      deck=deck,
      tags=[tag for tag in tags.split() if tag],
      fields=fields,
    ))

  def _lookup_model(self, name: str) -> ModelInfo | None:
    return self._model_by_name.get(name.lower())

  def _register_model_info(self, model: JModel):
    field_names = {field.name.lower(): field.name for field in model.fields}
    required_fields = set(field_names.keys())
    if model.name.lower() == "cloze":
      required_fields.discard("back extra")
    elif model.name.lower() == "basic (optional reversed card)":
      required_fields.discard("add reverse")
    self._model_by_name[model.name.lower()] = ModelInfo(
      model=model,
      field_names=field_names,
      required_fields=required_fields,
    )

  def _register_id(self, key: str, error: ParseError) -> bool:
    if key in self._ids:
      first = self._ids[key]
      if all(existing.line != first.line or existing.message != first.message for existing in self.errors):
        self.errors.append(first)
      self.errors.append(error)
      return False
    self._ids[key] = error
    return True

  def _property_line(self, properties: list[PropertyNode], name: str) -> int:
    key = name.lower()
    for prop in properties:
      if prop.name.lower() == key:
        return prop.line
    return self._note_line_from_properties(properties)

  def _field_line(self, fields: list[FieldNode], name: str) -> int:
    key = name.lower()
    for field in fields:
      if field.name.lower() == key:
        return field.line
    return self._note_line_from_fields(fields)

  def _note_line(self, note_nodes: NoteNodes) -> int:
    line = self._note_line_from_properties(note_nodes.properties)
    if line:
      return line
    return self._note_line_from_fields(note_nodes.fields)

  def _note_line_from_properties(self, properties: list[PropertyNode]) -> int:
    if properties:
      return properties[0].line
    return 0

  def _note_line_from_fields(self, fields: list[FieldNode]) -> int:
    if fields:
      return fields[0].line
    return 0

  def _error(self, node: Node | ModelNodes | NoteNodes | None, line: int, message: str):
    path = node.path if node is not None else None
    self.errors.append(ParseError(path=path, line=line, message=message))
