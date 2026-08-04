import { type NoteField } from "@notatki/core";
import { formatField, renderHtml } from "@notatki/format";
import { clsx } from "clsx";
import { memo, useEffect, useRef } from "react";
import * as cn from "./Field.module.css";
import { revealRange } from "./navigate.ts";
import { isVisible, type Selection } from "./selection.ts";

const FieldValue = memo(function FieldValue({ value }: { value: string }) {
  const html = formatField(value, renderHtml({ output: "html", throwOnError: false }));
  return <div className={cn.value} dangerouslySetInnerHTML={{ __html: html }} />;
});

export function Field1({ field, selection }: { field: NoteField; selection: Selection }) {
  const loc = field.node?.loc ?? null;
  const ref = useRef<HTMLDivElement>(null);
  const visible = isVisible(loc, selection);
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
      <FieldValue value={field.value} />
    </div>
  );
}
