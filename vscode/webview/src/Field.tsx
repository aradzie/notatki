import { type NoteField } from "@notatki/core";
import { formatField, renderHtml, resolveWithBaseUri, showClozeDeletions } from "@notatki/format";
import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import { useBaseUri } from "./base-uri.tsx";
import * as cn from "./Field.module.css";
import { revealRange } from "./navigate.ts";
import { isVisible, type Selection } from "./selection.ts";

export function Field1({ field, selection }: { field: NoteField; selection: Selection }) {
  const loc = field.node?.loc ?? null;
  const ref = useRef<HTMLDivElement>(null);
  const visible = isVisible(loc, selection);
  const baseUri = useBaseUri();
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
        if (loc != null) {
          revealRange(loc);
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
  const html = formatField(
    value,
    renderHtml({ output: "html", throwOnError: false }, showClozeDeletions),
    resolveWithBaseUri(baseUri),
  );
  return <div className={cn.value} dangerouslySetInnerHTML={{ __html: html }} />;
}
