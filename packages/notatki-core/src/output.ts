export class Output {
  readonly #lines: string[] = [];
  #separate = false;
  #text: string | null = null;

  separate(): void {
    if (this.#lines.length > 0) {
      this.#separate = true;
      this.#text = null;
    }
  }

  print(line: string): void {
    if (line.length > 0) {
      if (this.#separate) {
        this.#lines.push("");
        this.#separate = false;
      }
      this.#lines.push(line);
      this.#text = null;
    }
  }

  toString(): string {
    return (this.#text ??= this.#lines.join("\n") + "\n");
  }
}

// Dedents `lines` by their shortest common leading-whitespace prefix (blank/whitespace-only lines
// don't count toward that minimum, and are left empty rather than padded), then re-indents every
// non-blank line with `indent` spaces. Bails out and returns `lines` unchanged if any line's
// leading whitespace contains a tab, since tabs and spaces can't be measured against each other.
export function reindentLines(lines: string[], indent: number): string[] {
  const out = [];
  let prefixLength = Infinity;
  for (const line of lines) {
    let i = 0;
    while (i < line.length) {
      if (line[i] === "\t") {
        return [...lines];
      }
      if (line[i] !== " ") {
        break;
      }
      i += 1;
    }
    if (i < line.length) {
      out.push(line);
      if (i < prefixLength) {
        prefixLength = i;
      }
    } else {
      out.push("");
    }
  }
  if (prefixLength === Infinity) {
    prefixLength = 0;
  }
  const prefix = " ".repeat(indent);
  return out.map((line) => (line === "" ? "" : prefix + line.substring(prefixLength)));
}
