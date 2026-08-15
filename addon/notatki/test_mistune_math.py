import pytest

import mistune

from .mistune_math import MathRenderer, math


def render(markdown: str) -> str:
  md = mistune.create_markdown(
    escape=False,
    plugins=[
      math(
        MathRenderer(
          display=lambda code: f"<dm>{code.strip()}</dm>",
          inline=lambda code: f"<im>{code.strip()}</im>",
        )
      )
    ],
  )
  return md(markdown).strip()


def test_smoke():
  assert render("") == ""


def test_ignored_in_html_comments():
  assert render(r"<!-- \(x\) -->") == r"<!-- \(x\) -->"
  assert render(r"<!-- \[x\] -->") == r"<!-- \[x\] -->"
  assert render(r"<!-- $x$ -->") == r"<!-- $x$ -->"
  assert render(r"<!-- $$x$$ -->") == r"<!-- $$x$$ -->"


def test_ignored_in_html_elements():
  assert render(r"<div>\(x\)</div>") == r"<div>\(x\)</div>"
  assert render(r"<div>\[x\]</div>") == r"<div>\[x\]</div>"
  assert render(r"<div>$x$</div>") == r"<div>$x$</div>"
  assert render(r"<div>$$x$$</div>") == r"<div>$$x$$</div>"


@pytest.mark.skip(reason="todo: indented code blocks")
def test_ignored_in_indented_code_blocks():
  pass


def test_ignored_in_fenced_code_blocks():
  assert render("```\n\\(x\\)\n```") == "<pre><code>\\(x\\)\n</code></pre>"
  assert render("```\n\\[x\\]\n```") == "<pre><code>\\[x\\]\n</code></pre>"
  assert render("```\n$x$\n```") == "<pre><code>$x$\n</code></pre>"
  assert render("```\n$$x$$\n```") == "<pre><code>$$x$$\n</code></pre>"


def test_ignored_in_code_spans():
  assert render(r"`\(x\)`") == r"<p><code>\(x\)</code></p>"
  assert render(r"`\[x\]`") == r"<p><code>\[x\]</code></p>"
  assert render(r"`$x$`") == "<p><code>$x$</code></p>"
  assert render(r"`$$x$$`") == "<p><code>$$x$$</code></p>"


def test_parsed_inside_headers():
  assert render(r"# a \(x\) b") == "<h1>a <im>x</im> b</h1>"
  assert render(r"# a \[x\] b") == "<h1>a <dm>x</dm> b</h1>"
  assert render(r"# a $x$ b") == "<h1>a <im>x</im> b</h1>"
  assert render(r"# a $$x$$ b") == "<h1>a <dm>x</dm> b</h1>"


def test_parsed_inside_paragraphs():
  assert render(r"a \(x\) b") == "<p>a <im>x</im> b</p>"
  assert render(r"a \[x\] b") == "<p>a <dm>x</dm> b</p>"
  assert render(r"a $x$ b") == "<p>a <im>x</im> b</p>"
  assert render(r"a $$x$$ b") == "<p>a <dm>x</dm> b</p>"


def test_parsed_inside_lists():
  assert render(r"- a \(x\) b") == "<ul>\n<li>a <im>x</im> b</li>\n</ul>"
  assert render(r"- a \[x\] b") == "<ul>\n<li>a <dm>x</dm> b</li>\n</ul>"
  assert render(r"- a $x$ b") == "<ul>\n<li>a <im>x</im> b</li>\n</ul>"
  assert render(r"- a $$x$$ b") == "<ul>\n<li>a <dm>x</dm> b</li>\n</ul>"


def test_parsed_inside_blockquotes():
  assert render(r"> a \(x\) b") == "<blockquote>\n<p>a <im>x</im> b</p>\n</blockquote>"
  assert render(r"> a \[x\] b") == "<blockquote>\n<p>a <dm>x</dm> b</p>\n</blockquote>"
  assert render(r"> a $x$ b") == "<blockquote>\n<p>a <im>x</im> b</p>\n</blockquote>"
  assert render(r"> a $$x$$ b") == "<blockquote>\n<p>a <dm>x</dm> b</p>\n</blockquote>"


def test_inline_math():
  assert render(r"\(x\)") == "<p><im>x</im></p>"
  assert render(r"a\(x\)b") == "<p>a<im>x</im>b</p>"
  assert render(r"a\(x\)\(y\)b") == "<p>a<im>x</im><im>y</im>b</p>"


def test_inline_alt_math():
  assert render(r"$x$") == "<p><im>x</im></p>"
  assert render(r"a$x$b") == "<p>a<im>x</im>b</p>"
  assert render(r"a$x$$y$b") == "<p>a<im>x</im><im>y</im>b</p>"


def test_inline_alt_math_rejects_surrounding_whitespace():
  assert render(r"$ x $") == "<p>$ x $</p>"
  assert render(r"$x $") == "<p>$x $</p>"
  assert render(r"$ x$") == "<p>$ x$</p>"
  assert render(r"$ $") == "<p>$ $</p>"
  assert render("the $ symbol and the $ sign") == "<p>the $ symbol and the $ sign</p>"


def test_display_math():
  assert render(r"\[x\]") == "<p><dm>x</dm></p>"
  assert render(r"a\[x\]b") == "<p>a<dm>x</dm>b</p>"
  assert render(r"a\[x\]\[y\]b") == "<p>a<dm>x</dm><dm>y</dm>b</p>"


def test_display_alt_math():
  assert render(r"$$x$$") == "<p><dm>x</dm></p>"
  assert render(r"a$$x$$b") == "<p>a<dm>x</dm>b</p>"
  assert render(r"a$$x$$$$y$$b") == "<p>a<dm>x</dm><dm>y</dm>b</p>"


def test_ignore_escaped():
  assert render(r"\\(x\)") == r"<p>\(x)</p>"
  assert render(r"\\[x\]") == r"<p>\[x]</p>"
  assert render(r"\\(x\\)") == r"<p>\(x\)</p>"
  assert render(r"\\[x\\]") == r"<p>\[x\]</p>"


def test_ignore_escaped_alt():
  assert render(r"\$x$") == "<p>$x$</p>"
  assert render(r"\$x\$") == "<p>$x$</p>"
  assert render(r"\$\$x$$") == "<p>$$x$$</p>"
  assert render(r"\$\$x\$\$") == "<p>$$x$$</p>"


def test_ambiguous_alt():
  assert render(r"$") == "<p>$</p>"
  assert render(r"$$") == "<p>$$</p>"
  assert render(r"$$$") == "<p>$$$</p>"
  assert render(r"$$$$") == "<p>$$$$</p>"
  assert render(r"$$$$$") == "<p>$$$$$</p>"
  assert render(r"$x") == "<p>$x</p>"
  assert render(r"x$") == "<p>x$</p>"
  assert render(r"$$x") == "<p>$$x</p>"
  assert render(r"x$$") == "<p>x$$</p>"
  assert render(r"$$x$") == "<p>$<im>x</im></p>"
  assert render(r"$x$$") == "<p><im>x</im>$</p>"
  assert render(r"$$$x$") == "<p>$$<im>x</im></p>"
  assert render(r"$x$$$") == "<p><im>x</im>$$</p>"
  assert render(r"$$$x$$") == "<p>$<dm>x</dm></p>"
  assert render(r"$$x$$$") == "<p><dm>x</dm>$</p>"
  assert render(r"$$$x$$$") == "<p>$<dm>x</dm>$</p>"
  assert render(r"$$$$x$$$$") == "<p>$$<dm>x</dm>$$</p>"


def test_display_math_spans_newlines():
  assert render("a \\[x\ny\\] b") == "<p>a <dm>x\ny</dm> b</p>"
  assert render("a $$x\ny$$ b") == "<p>a <dm>x\ny</dm> b</p>"


def test_inline_math_does_not_span_newlines():
  assert render("a \\(x\ny\\) b") == "<p>a (x\ny) b</p>"
  assert render("a $x\ny$ b") == "<p>a $x\ny$ b</p>"
