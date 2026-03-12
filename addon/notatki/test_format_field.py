from .format_field import html_to_markdown, markdown_to_html


def test_markdown_to_html_converts_basic_html_structure() -> None:
  assert markdown_to_html("# Title\n\nBody") == "<h1>Title</h1>\n<p>Body</p>\n"


def test_markdown_to_html_with_math() -> None:
  assert markdown_to_html("Inline \\(x\\) and \\[y+z\\]") == (
    "<p>Inline \\( x \\) and \\[ y+z \\]</p>\n"
  )
  assert markdown_to_html("Inline $x$ and $$y+z$$") == (
    "<p>Inline \\( x \\) and \\[ y+z \\]</p>\n"
  )
  assert markdown_to_html(r"\[ a & b \] and \( x < y \)") == (
    "<p>\\[ a &amp; b \\] and \\( x &lt; y \\)</p>\n"
  )


def test_html_to_markdown_converts_basic_html_structure() -> None:
  html = "<h1>Title</h1>\n<p>Body</p>\n"

  assert html_to_markdown(html) == "# Title\n\nBody"


def test_html_to_markdown_with_math() -> None:
  assert html_to_markdown("<p><code>$x$</code> and \\(y\\)</p>\n") == (
    r"`$x$` and \( y \)"
  )
  assert html_to_markdown("<p>Before</p>\n<p>\\[x + y\\]</p>\n") == (
    "Before\n\n\\[ x + y \\]"
  )
  assert html_to_markdown("<p>\\[a &amp; b\\] and \\(x &lt; y\\)</p>\n") == (
    r"\[ a & b \] and \( x < y \)"
  )
  assert html_to_markdown("<pre><code>$$not math$$\n</code></pre>\n") == (
    "```\n$$not math$$\n```"
  )
