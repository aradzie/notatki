import { type NoteError } from "@notatki/core";
import * as cn from "./ErrorList.module.css";
import { revealRange } from "./navigate.ts";

export function ErrorList({ errors }: { errors: NoteError[] }) {
  return (
    <div className={cn.root}>
      {errors.map(({ message, location }, index) => (
        <p
          key={index}
          className={cn.error}
          onClick={(ev) => {
            ev.preventDefault();
            revealRange(location);
          }}
        >
          <strong>{message}</strong>
          {" at "}
          {String(location.source)}:{location.start.line}:{location.start.column}
        </p>
      ))}
    </div>
  );
}
