import { ModelMap, type Note, type NoteError, NoteList, NoteParser } from "@notatki/core";
import { type ReviveState } from "@notatki/vscode-protocol";
import { useEffect, useState } from "react";
import { queue } from "./messages.ts";
import { type Selection } from "./selection.ts";
import { vscode } from "./vscode.ts";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [errors, setErrors] = useState<NoteError[]>([]);
  useEffect(() => {
    return queue.subscribe((message) => {
      switch (message.type) {
        case "update": {
          const { uri, locked, text, models } = message;

          // Remember the preview state to be able to restore the preview by the extension.
          vscode.setState({ type: "revive", uri, locked } as ReviveState);

          // Parse and render the notes.
          const parser = new NoteParser(new NoteList(new ModelMap(models)));
          parser.parseNotes(uri, text);
          const { notes, errors } = parser;
          if (errors.length > 0) {
            setSelection({ start: 0, end: 0 });
            setErrors([...errors]);
          } else {
            setNotes([...notes]);
            setSelection({ start: 0, end: 0 });
            setErrors([]);
          }
          break;
        }
        case "select": {
          const { start, end } = message;
          setSelection({ start, end });
          break;
        }
      }
    });
  }, []);
  return { notes, selection, errors };
}
