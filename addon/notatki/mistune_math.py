from collections.abc import Callable
from typing import TYPE_CHECKING, Match, NamedTuple

if TYPE_CHECKING:
  from mistune import Plugin
  from mistune.core import BaseRenderer, InlineState
  from mistune.inline_parser import InlineParser
  from mistune.markdown import Markdown

__all__ = ["MathRenderer", "math", "render_tex"]

DISPLAY_MATH_PATTERN = r"\\\[(?P<display_math_text>[\s\S]+?)\\\]"
DISPLAY_MATH_ALT_PATTERN = r"\$\$(?!\$)(?P<display_math_alt_text>[\s\S]+?)\$\$"
INLINE_MATH_PATTERN = r"\\\((?P<inline_math_text>.+?)\\\)"
INLINE_MATH_ALT_PATTERN = r"\$(?![\s$])(?P<inline_math_text_alt>.+?)(?<!\s)\$"


class MathRenderer(NamedTuple):
  display: Callable[[str], str]
  inline: Callable[[str], str]


def render_tex() -> MathRenderer:
  return MathRenderer(
    display=lambda code: '<span class="display-math">\\[' + code + "\\]</span>",
    inline=lambda code: '<span class="math">\\(' + code + "\\)</span>",
  )


def _parse_display_math(block: "InlineParser", m: Match[str], state: "InlineState") -> int:
  text = m.group("display_math_text")
  state.append_token({"type": "display_math", "raw": text})
  return m.end()


def _parse_display_math_alt(block: "InlineParser", m: Match[str], state: "InlineState") -> int:
  text = m.group("display_math_alt_text")
  state.append_token({"type": "display_math_alt", "raw": text})
  return m.end()


def _parse_inline_math(inline: "InlineParser", m: Match[str], state: "InlineState") -> int:
  text = m.group("inline_math_text")
  state.append_token({"type": "inline_math", "raw": text})
  return m.end()


def _parse_inline_math_alt(inline: "InlineParser", m: Match[str], state: "InlineState") -> int:
  text = m.group("inline_math_text_alt")
  state.append_token({"type": "inline_math_alt", "raw": text})
  return m.end()


def math(renderer: MathRenderer | None = None) -> "Plugin":
  renderer = renderer or render_tex()

  def render_display_math(base_renderer: "BaseRenderer", text: str) -> str:
    return renderer.display(text)

  def render_inline_math(base_renderer: "BaseRenderer", text: str) -> str:
    return renderer.inline(text)

  def plugin(md: "Markdown") -> None:
    # display_math and inline_math use LaTeX-style `\[ \]` / `\( \)` delimiters, which mistune's
    # built-in "escape" rule (backslash + punctuation) would otherwise consume first, since rules
    # are tried in registration order and "escape" is first by default. Registering before "escape"
    # gives our patterns priority over it.
    md.inline.register("display_math", DISPLAY_MATH_PATTERN, _parse_display_math, before="escape")
    md.inline.register("display_math_alt", DISPLAY_MATH_ALT_PATTERN, _parse_display_math_alt, before="link")
    md.inline.register("inline_math", INLINE_MATH_PATTERN, _parse_inline_math, before="escape")
    md.inline.register("inline_math_alt", INLINE_MATH_ALT_PATTERN, _parse_inline_math_alt, before="link")
    if md.renderer and md.renderer.NAME == "html":
      md.renderer.register("display_math", render_display_math)
      md.renderer.register("display_math_alt", render_display_math)
      md.renderer.register("inline_math", render_inline_math)
      md.renderer.register("inline_math_alt", render_inline_math)

  return plugin
