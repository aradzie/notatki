import re

import mistune

CODE_BLOCK = re.compile(r"```.*?```", re.S)
INLINE_CODE = re.compile(r"`[^`]*`")

MATH_PATTERN = re.compile(
  r"""
    (?<!\\)
    (
        \$\$([^$]+?)\$\$
      | \$([^$\n]+?)\$
      | \\\[(.+?)\\\]
      | \\\((.+?)\\\)
    )
    """,
  re.VERBOSE | re.S,
)


def _key(i: int) -> str:
  return f"@@MATH{i}@@"


class MathExtractor:
  def __init__(self):
    self.blocks = []

  def _store(self, text: str) -> str:
    key = _key(len(self.blocks))
    self.blocks.append(text)
    return key

  def _math_replace(self, m: re.Match[str]) -> str:
    full = m.group(0)

    # $$ ... $$ → \[ ... \]
    if full.startswith("$$"):
      content = m.group(2).strip()
      return self._store(r"\[" + content + r"\]")

    # $ ... $ → \( ... \)
    if full.startswith("$"):
      content = m.group(3).strip()
      return self._store(r"\(" + content + r"\)")

    # \[ ... \]
    if full.startswith(r"\["):
      content = m.group(4).strip()
      return self._store(r"\[" + content + r"\]")

    # \( ... \)
    if full.startswith(r"\("):
      content = m.group(5).strip()
      return self._store(r"\(" + content + r"\)")

    return self._store(full)

  def extract(self, text: str) -> str:
    text = CODE_BLOCK.sub(lambda m: self._store(m.group(0)), text)
    text = INLINE_CODE.sub(lambda m: self._store(m.group(0)), text)
    text = MATH_PATTERN.sub(self._math_replace, text)
    return text

  def restore(self, text: str) -> str:
    for i, block in enumerate(self.blocks):
      text = text.replace(_key(i), block)
    return text


markdown = mistune.Markdown(
  mistune.HTMLRenderer(),
  plugins=[],
)


def markdown_to_html(text: str) -> str:
  extractor = MathExtractor()
  return extractor.restore(markdown(extractor.extract(text)))
