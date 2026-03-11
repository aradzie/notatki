from .data import (
  JModel,
  JModelCard,
  JModelField,
)

INTERNAL_MODELS = [
  JModel(
    name="Basic",
    cloze=False,
    fields=[
      JModelField(name="Front"),
      JModelField(name="Back"),
    ],
    cards=[
      JModelCard(
        name="Card 1",
        front="{{Front}}",
        back="{{FrontSide}}<hr>{{Back}}",
      ),
    ],
    styles="",
  ),
  JModel(
    name="Basic (and reversed card)",
    cloze=False,
    fields=[
      JModelField(name="Front"),
      JModelField(name="Back"),
    ],
    cards=[
      JModelCard(
        name="Card 1",
        front="{{Front}}",
        back="{{FrontSide}}<hr>{{Back}}",
      ),
      JModelCard(
        name="Card 2",
        front="{{Back}}",
        back="{{FrontSide}}<hr>{{Front}}",
      ),
    ],
    styles="",
  ),
  JModel(
    name="Basic (optional reversed card)",
    cloze=False,
    fields=[
      JModelField(name="Front"),
      JModelField(name="Back"),
      JModelField(name="Add Reverse"),
    ],
    cards=[
      JModelCard(
        name="Card 1",
        front="{{Front}}",
        back="{{FrontSide}}<hr>{{Back}}",
      ),
      JModelCard(
        name="Card 2",
        front="{{#Add Reverse}}{{Back}}{{/Add Reverse}}",
        back="{{FrontSide}}<hr>{{Front}}",
      ),
    ],
    styles="",
  ),
  JModel(
    name="Basic (type in the answer)",
    cloze=False,
    fields=[
      JModelField(name="Front"),
      JModelField(name="Back"),
    ],
    cards=[
      JModelCard(
        name="Card 1",
        front="{{Front}}<br>{{type:Back}}",
        back="{{Front}}<hr>{{Back}}",
      ),
    ],
    styles="",
  ),
  JModel(
    name="Cloze",
    cloze=True,
    fields=[
      JModelField(name="Text"),
      JModelField(name="Back Extra"),
    ],
    cards=[
      JModelCard(
        name="Cloze",
        front="{{cloze:Text}}",
        back="{{cloze:Text}}<br>{{Back Extra}}",
      ),
    ],
    styles="",
  ),
]
