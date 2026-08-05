import re
from collections.abc import Callable
from html import escape, unescape

import markdownify
import mistune

ImageResolver = Callable[[str], str]

CODE_BLOCK = re.compile(r"```.*?```", re.S)
INLINE_CODE = re.compile(r"`[^`]*`")

MATH_PATTERN_IN = re.compile(
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

MATH_PATTERN_OUT = re.compile(
  r"""
      \\\[(.+?)\\\]
    | \\\((.+?)\\\)
  """,
  re.VERBOSE | re.S,
)


def _key(i: int) -> str:
  return f"@@MATH{i}@@"


class _ImageAwareRenderer(mistune.HTMLRenderer):
  def __init__(self, image_resolver: ImageResolver | None) -> None:
    super().__init__(escape=False)
    self._image_resolver = image_resolver

  def image(self, text: str, url: str, title: str | None = None) -> str:
    if self._image_resolver is not None:
      url = self._image_resolver(url)
    return super().image(text, url, title)


class _ImageAwareConverter(markdownify.MarkdownConverter):
  def __init__(self, image_resolver: ImageResolver | None, heading_style: str) -> None:
    super().__init__(heading_style=heading_style)
    self._image_resolver = image_resolver

  def convert_img(self, el, text, parent_tags):  # noqa: ANN001
    if self._image_resolver is not None:
      el["src"] = self._image_resolver(el.attrs.get("src", None) or "")
    return super().convert_img(el, text, parent_tags)


def markdown_to_html(text: str, image_resolver: ImageResolver | None = None) -> str:
  blocks: list[str] = []

  def store(block: str) -> str:
    key = _key(len(blocks))
    blocks.append(block)
    return key

  def math_replace(m: re.Match[str]) -> str:
    full = m.group(0)

    # $$ ... $$ → \[ ... \]
    if full.startswith("$$"):
      content = escape(m.group(2).strip())
      return store(r"\[ " + content + r" \]")

    # $ ... $ → \( ... \)
    if full.startswith("$"):
      content = escape(m.group(3).strip())
      return store(r"\( " + content + r" \)")

    # \[ ... \]
    if full.startswith(r"\["):
      content = escape(m.group(4).strip())
      return store(r"\[ " + content + r" \]")

    # \( ... \)
    if full.startswith(r"\("):
      content = escape(m.group(5).strip())
      return store(r"\( " + content + r" \)")

    return store(full)  # Unreachable.

  def extract(s: str) -> str:
    s = CODE_BLOCK.sub(lambda m: store(m.group(0)), s)
    s = INLINE_CODE.sub(lambda m: store(m.group(0)), s)
    s = MATH_PATTERN_IN.sub(math_replace, s)
    return s

  def restore(s: str) -> str:
    for i, block in enumerate(blocks):
      s = s.replace(_key(i), block)
    return s

  markdown = mistune.create_markdown(
    renderer=_ImageAwareRenderer(image_resolver),
    plugins=["strikethrough", "footnotes", "table", "speedup"],
  )
  return restore(markdown(extract(text)))


def html_to_markdown(html: str, image_resolver: ImageResolver | None = None) -> str:
  blocks: list[str] = []

  def store(block: str) -> str:
    key = _key(len(blocks))
    blocks.append(block)
    return key

  def math_replace(m: re.Match[str]) -> str:
    full = m.group(0)

    # \[ ... \]
    if full.startswith(r"\["):
      content = unescape(m.group(1).strip())
      return store(r"\[ " + content + r" \]")

    # \( ... \)
    if full.startswith(r"\("):
      content = unescape(m.group(2).strip())
      return store(r"\( " + content + r" \)")

    return store(full)  # Unreachable.

  def extract(s: str) -> str:
    return MATH_PATTERN_OUT.sub(math_replace, s)

  def restore(s: str) -> str:
    for i, block in enumerate(blocks):
      s = s.replace(_key(i), block)
    return s

  converter = _ImageAwareConverter(image_resolver, heading_style="ATX")
  return restore(converter.convert(extract(html)))
