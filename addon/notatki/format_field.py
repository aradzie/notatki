import re
from html import escape, unescape

import markdownify
import mistune

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


def markdown_to_html(text: str) -> str:
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

  return restore(mistune.html(extract(text)))


def html_to_markdown(html: str) -> str:
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

  return restore(markdownify.markdownify(extract(html), heading_style="ATX"))
