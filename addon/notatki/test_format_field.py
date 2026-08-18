from .format_field import html_to_markdown, markdown_to_html


def test_markdown_to_html_converts_basic_html_structure() -> None:
  assert markdown_to_html("# Title\n\nBody") == "<h1>Title</h1>\n<p>Body</p>\n"


def test_markdown_to_html_without_image_resolver_leaves_src_unchanged() -> None:
  assert markdown_to_html("![alt](diagram.png)") == (
    '<p><img src="diagram.png" alt="alt" /></p>\n'
  )


def test_markdown_to_html_with_image_resolver_rewrites_src() -> None:
  html = markdown_to_html(
    "![alt](diagram.png)",
    image_resolver=lambda href: f"resolved-{href}",
  )

  assert html == '<p><img src="resolved-diagram.png" alt="alt" /></p>\n'


def test_markdown_to_html_with_math() -> None:
  assert markdown_to_html("a \\(inline\\) and \\[display\\] b") == (
    '<p>a <span class="math">\\(inline\\)</span> and '
    '<span class="display-math">\\[display\\]</span> b</p>\n'
  )
  assert markdown_to_html("a $inline$ and $$display$$ b") == (
    '<p>a <span class="math">\\(inline\\)</span> and '
    '<span class="display-math">\\[display\\]</span> b</p>\n'
  )


def test_markdown_to_html_preserves_raw_html_tags_but_escapes_stray_chars() -> None:
  # Literal HTML tags written in the source pass through as real markup,
  # e.g. for styling that Markdown itself has no syntax for.
  assert markdown_to_html("<b>bold</b> and <sub>sub</sub>") == (
    "<p><b>bold</b> and <sub>sub</sub></p>\n"
  )
  # Stray "<", ">", "&" that aren't part of a recognized HTML tag are still escaped.
  assert markdown_to_html("1 < 2 and 3 > 4 and a & b") == (
    "<p>1 &lt; 2 and 3 &gt; 4 and a &amp; b</p>\n"
  )


def test_markdown_to_html_escapes_html_special_chars_in_math() -> None:
  assert markdown_to_html("\\(a & b > c\\)") == (
    '<p><span class="math">\\(a &amp; b &gt; c\\)</span></p>\n'
  )
  assert markdown_to_html("\\[a & b > c\\]") == (
    '<p><span class="display-math">\\[a &amp; b &gt; c\\]</span></p>'
  )


def test_html_to_markdown_converts_basic_html_structure() -> None:
  html = "<h1>Title</h1>\n<p>Body</p>\n"

  assert html_to_markdown(html) == "# Title\n\nBody"


def test_html_to_markdown_without_image_resolver_leaves_src_unchanged() -> None:
  assert html_to_markdown('<img src="foo.jpg" alt="bar">') == "![bar](foo.jpg)"


def test_html_to_markdown_with_image_resolver_rewrites_src() -> None:
  markdown = html_to_markdown(
    '<img src="foo.jpg" alt="bar">',
    image_resolver=lambda href: f"resolved-{href}",
  )

  assert markdown == "![bar](resolved-foo.jpg)"


def test_html_to_markdown_with_math() -> None:
  assert html_to_markdown("<p>\\(math\\) and $alt math$</p>\n") == (
    r"\(math\) and $alt math$"
  )
  assert html_to_markdown("<p><code>$x$</code> and \\(y\\)</p>\n") == (
    r"`$x$` and \(y\)"
  )
  assert html_to_markdown("<p>Before</p>\n<p>\\[x + y\\]</p>\n") == (
    "Before\n\n\\[x + y\\]"
  )
  assert html_to_markdown("<p>\\[a &amp; b\\]</p><p>and</p><p>\\(x &lt; y\\)</p>\n") == (
    "\\[a & b\\]\n\nand\n\n\\(x < y\\)"
  )
  assert html_to_markdown("<pre><code>$$not math$$\n</code></pre>\n") == (
    "```\n$$not math$$\n```"
  )


def test_html_to_markdown_does_not_escape_special_chars_inside_math() -> None:
  # "*" and "_" inside math have no Markdown meaning and must survive verbatim, while the same
  # characters outside math still get backslash-escaped so they don't turn into emphasis on re-import.
  assert html_to_markdown("<p>*bold* and \\(a * b\\)</p>\n") == (
    r"\*bold\* and \(a * b\)"
  )
  assert html_to_markdown("<p>\\(a_1\\) and b_c</p>\n") == (r"\(a_1\) and b\_c")


def test_html_to_markdown_does_not_escape_special_chars_inside_block_math() -> None:
  html = "<p>Before</p>\n<p>\\[\na_1 * b\n\\]</p>\n"

  assert html_to_markdown(html) == "Before\n\n\\[\na_1 * b\n\\]"


def test_html_to_markdown_never_treats_dollar_delimiters_as_math() -> None:
  # Anki only ever supports \( \) / \[ \] -- $ / $$ are normalized to those on import (see
  # mistune_math.render_tex), so a literal "$" on export is always plain text, never math, and
  # whatever it delimits is escaped normally rather than passed through verbatim.
  assert html_to_markdown("<p>$a_1 * b$ and $5 * $10</p>\n") == (
    r"$a\_1 \* b$ and $5 \* $10"
  )


def test_markdown_html_markdown_roundtrip_preserves_math() -> None:
  # Special chars in math source must survive a full markdown_to_html -> html_to_markdown roundtrip.
  # $ / $$ delimiters are normalized to \( \) / \[ \] along the way, since that's the only form Anki
  # itself supports -- the roundtrip is expected to change delimiter style, not content.
  cases = [
    (r"Inline: \(a_1 * b\) done.", r"Inline: \(a_1 * b\) done."),
    (r"Inline dollar: $a_1 * b$ done.", r"Inline dollar: \(a_1 * b\) done."),
    (r"Display single line: \[a_1 * b\] done.", r"Display single line: \[a_1 * b\] done."),
    (r"Display dollar single line: $$a_1 * b$$ done.", r"Display dollar single line: \[a_1 * b\] done."),
    ("Solve:\n\\[\na_1 * b\n\\]\n", "Solve:\n\n\\[\na_1 * b\n\\]"),
    ("Solve:\n$$\na_1 * b\n$$\n", "Solve:\n\n\\[\na_1 * b\n\\]"),
  ]

  for source, expected in cases:
    assert html_to_markdown(markdown_to_html(source)) == expected
