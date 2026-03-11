from dataclasses import dataclass, field

from anki.models import NotetypeDict, ModelManager


@dataclass
class JModelField:
  name: str


@dataclass
class JModelCard:
  name: str
  front: str
  back: str


@dataclass
class JModel:
  name: str
  cloze: bool
  fields: list[JModelField]
  cards: list[JModelCard]
  styles: str

  def to_model(self, models: ModelManager) -> NotetypeDict:
    model = models.new(self.name)
    model["type"] = 1 if self.cloze else 0
    for jfield in self.fields:
      field = models.new_field(jfield.name)
      models.add_field(model, field)
    for jcard in self.cards:
      template = models.new_template(jcard.name)
      template["qfmt"] = jcard.front
      template["afmt"] = jcard.back
      models.add_template(model, template)
    model["css"] = self.styles
    return model

  @classmethod
  def from_model(cls, model: NotetypeDict) -> 'JModel':
    return JModel(
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


@dataclass
class JNote:
  guid: str
  type: str
  deck: str
  tags: list[str]
  fields: dict[str, str]


@dataclass
class JCollection:
  models: list[JModel] = field(default_factory=list)
  notes: list[JNote] = field(default_factory=list)
