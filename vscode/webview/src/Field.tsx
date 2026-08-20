import { type NoteField } from "@notatki/core";
import { formatField, renderMathAsHtml, resolveWithBaseUri, showClozeDeletions } from "@notatki/format";
import { type LocationRange } from "@notatki/parser";
import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import { useDocument } from "./document.tsx";
import * as cn from "./Field.module.css";
import { revealRange } from "./navigate.ts";
import { isVisible, type Selection } from "./selection.ts";

function firstNonWhitespaceOffset(sourceText: string, loc: LocationRange): number {
  const { offset: end } = loc.end;
  let offset = loc.start.offset;
  while (offset < end && /\s/.test(sourceText.charAt(offset))) {
    offset++;
  }
  return offset;
}

export function Field1({ field, selection }: { field: NoteField; selection: Selection }) {
  const loc = field.node?.loc ?? null;
  const ref = useRef<HTMLDivElement>(null);
  const visible = isVisible(loc, selection);
  const { baseUri, sourceText } = useDocument();
  useEffect(() => {
    if (visible) {
      const { current } = ref;
      if (current != null) {
        current.scrollIntoView({
          behavior: "instant",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [visible]);
  return (
    <div
      ref={ref}
      className={clsx(cn.root, { [cn.active]: visible })}
      onClick={() => {
        const { node } = field;
        if (node != null) {
          const offset =
            field.value !== "" ? firstNonWhitespaceOffset(sourceText, node.value.loc) : node.name.loc.end.offset;
          const position = { offset, line: 0, column: 0 };
          revealRange({ source: node.loc.source, start: position, end: position });
        }
      }}
    >
      <p className={cn.field}>
        <strong className={cn.name}>{field.name}</strong>:
      </p>
      <FieldValue value={field.value} baseUri={baseUri} />
    </div>
  );
}

function FieldValue({ value, baseUri }: { value: string; baseUri: string }) {
  const math = renderMathAsHtml({ output: "html", throwOnError: false }, showClozeDeletions);
  const html = formatField(value, math, resolveWithBaseUri(baseUri));
  return <div className={cn.value} dangerouslySetInnerHTML={{ __html: html }} />;
}
