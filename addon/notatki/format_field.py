import re
from collections.abc import Callable
from typing import cast

import markdownify
import mistune

from .mistune_math import BLOCK_DISPLAY_MATH_PATTERN, DISPLAY_MATH_PATTERN, INLINE_MATH_PATTERN, math

ImageResolver = Callable[[str], str]

# Matches a math fragment (delimiters included) wherever it appears in a text node, so it can be
# carved out and left unescaped -- see _ImageAwareConverter.escape. Anki itself only ever supports the
# \( \) / \[ \] delimiters, so only those patterns are matched here -- a literal "$" in exported HTML
# is always plain text, never math. Block is listed first so a standalone `\[ ... \]` span is preferred
# over the single-line interpretation when both would match at the same position, mirroring the
# priority mistune_math.py's plugin registration already encodes.
MATH_PATTERN = re.compile(
  "|".join([BLOCK_DISPLAY_MATH_PATTERN, DISPLAY_MATH_PATTERN, INLINE_MATH_PATTERN]),
  re.MULTILINE,
)


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

  def escape(self, text: str, parent_tags: set[str]) -> str:
    # Math fragments (\( \), \[ \]) are opaque LaTeX source: characters like `*` and `_`
    # inside them have no Markdown meaning and must survive verbatim, so only the text
    # between math fragments goes through the normal escaping.
    pieces = []
    last_end = 0
    for m in MATH_PATTERN.finditer(text):
      pieces.append(super().escape(text[last_end : m.start()], parent_tags))
      pieces.append(m.group(0))
      last_end = m.end()
    pieces.append(super().escape(text[last_end:], parent_tags))
    return "".join(pieces)


def markdown_to_html(text: str, image_resolver: ImageResolver | None = None) -> str:
  markdown = mistune.create_markdown(
    renderer=_ImageAwareRenderer(image_resolver),
    plugins=[math(), "table"],
  )
  # The "html" renderer always produces a str, never the token list mistune's
  # generic return type also allows.
  return cast(str, markdown(text))


def html_to_markdown(html: str, image_resolver: ImageResolver | None = None) -> str:
  converter = _ImageAwareConverter(image_resolver, heading_style="ATX")
  return converter.convert(html)
