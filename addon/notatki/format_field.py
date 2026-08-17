from collections.abc import Callable
from typing import cast

import markdownify
import mistune

from .mistune_math import math

ImageResolver = Callable[[str], str]


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
