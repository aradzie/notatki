from collections import defaultdict

from .data import (
  FieldNode,
  ModelNodes,
  NoteNodes,
  ParseError,
)


class Checker:
  def __init__(self) -> None:
    self.errors: list[ParseError] = []

  def check_models(self, models: list[ModelNodes]) -> None:
    seen_names: set[str] = set()

    for model in models:
      model_name = model.name.lower()
      if model_name in seen_names:
        self.errors.append(
          ParseError(
            path=model.path,
            line=model.line,
            message=f"Duplicate model '{model.name}'.",
          )
        )
      else:
        seen_names.add(model_name)

      seen_field_names: set[str] = set()
      for field in model.fields:
        field_name = field.name.lower()
        if field_name in seen_field_names:
          self.errors.append(
            ParseError(
              path=field.path,
              line=field.line,
              message=f"Duplicate field '{field.name}'.",
            )
          )
        else:
          seen_field_names.add(field_name)

      seen_card_names: set[str] = set()
      for card in model.cards:
        card_name = card.name.lower()
        if card_name in seen_card_names:
          self.errors.append(
            ParseError(
              path=card.path,
              line=card.line,
              message=f"Duplicate card '{card.name}'.",
            )
          )
        else:
          seen_card_names.add(card_name)

  def check_notes(self, notes: list[NoteNodes]) -> None:
    notes_by_guid: defaultdict[str, list[NoteNodes]] = defaultdict(list)

    for note in notes:
      guid_field: FieldNode | None = None

      seen_field_names: set[str] = set()
      for field in note.fields:
        field_name = field.name.lower()
        if field_name in seen_field_names:
          self.errors.append(
            ParseError(
              path=field.path,
              line=field.line,
              message=f"Duplicate field '{field.name}'.",
            )
          )
        else:
          seen_field_names.add(field_name)
          if field_name == "id":
            guid_field = field

      if guid_field:
        note.guid = guid_field
        note.fields.remove(guid_field)

      if not note.guid:
        self.errors.append(
          ParseError(
            path=note.end.path,
            line=note.end.line,
            message="Note must have an id field.",
          )
        )
      elif not note.guid.value:
        self.errors.append(
          ParseError(
            path=note.guid.path,
            line=note.guid.line,
            message="Note must have a non-emtpy id value.",
          )
        )
      else:
        notes_by_guid[note.guid.value].append(note)

      if not note.fields:
        self.errors.append(
          ParseError(
            path=note.end.path,
            line=note.end.line,
            message="Note must have at least one model field.",
          )
        )

    for guid, notes_with_guid in notes_by_guid.items():
      if len(notes_with_guid) > 1:
        locations = ", ".join(
          f"{note.guid.path}:{note.guid.line}" for note in notes_with_guid if note.guid
        )
        first_note = notes_with_guid[0]
        self.errors.append(
          ParseError(
            path=first_note.guid.path,
            line=first_note.guid.line,
            message=f"Duplicate note id '{guid}' at {locations}.",
          )
        )
