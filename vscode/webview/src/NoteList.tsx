import { type Note } from "@notatki/core";
import { clsx } from "clsx";
import { Note1 } from "./Note.tsx";
import * as cn from "./NoteList.module.css";
import { type Selection } from "./selection.ts";
import { useView } from "./view.tsx";

export function NoteList1({ notes, selection }: { notes: Note[]; selection: Selection }) {
  const { view } = useView();
  return (
    <div className={cn.root}>
      <div
        className={clsx({
          [cn.alignLeft]: view.align === "left",
          [cn.alignCenter]: view.align === "center",
          [cn.alignWidth]: view.align === "width",
        })}
      >
        <p>{notes.length} note(s)</p>
        {notes.map((value, index) => (
          <Note1 key={index} note={value} selection={selection} />
        ))}
      </div>
    </div>
  );
}
