from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict

from anki.models import NotetypeDict
from dataclasses_json import dataclass_json, DataClassJsonMixin
from marshmallow import EXCLUDE


@dataclass_json
@dataclass
class JModelField(DataClassJsonMixin):
  name: str


@dataclass_json
@dataclass
class JModelCard(DataClassJsonMixin):
  name: str
  front: str
  back: str


@dataclass_json
@dataclass
class JModel(DataClassJsonMixin):
  id: int
  name: str
  cloze: bool
  fields: List[JModelField]
  cards: List[JModelCard]
  styles: str

  @classmethod
  def from_model(cls, model: NotetypeDict) -> 'JModel':
    return JModel(
      id=model["id"],
      name=model["name"],
      cloze=model["type"] == 1,
      fields=[
        JModelField(
          name=v["name"],
        ) for v in model["flds"]
      ],
      cards=[
        JModelCard(
          name=v["name"],
          front=v["qfmt"],
          back=v["afmt"]
        ) for v in model["tmpls"]
      ],
      styles=model["css"],
    )


@dataclass_json
@dataclass
class JNote(DataClassJsonMixin):
  guid: str
  type: str
  deck: str
  tags: List[str]
  fields: Dict[str, str]


@dataclass_json
@dataclass
class JCollection(DataClassJsonMixin):
  models: Optional[List[JModel]] = field(default_factory=list)
  notes: Optional[List[JNote]] = field(default_factory=list)

  @classmethod
  def load(cls, data: Any) -> 'JCollection':
    return JCollection.schema().load(data, unknown=EXCLUDE)

  def save(self):
    return JCollection.schema().dump(self)
