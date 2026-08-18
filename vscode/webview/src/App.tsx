import { DocumentProvider } from "./document.tsx";
import { ErrorList } from "./ErrorList.tsx";
import { NoteList1 } from "./NoteList.tsx";
import { Toolbar } from "./Toolbar.tsx";
import { useNotes } from "./use-notes.ts";
import { ViewProvider } from "./view.tsx";

export function App() {
  const { notes, selection, errors, baseUri, sourceText } = useNotes();
  return (
    <ViewProvider>
      <DocumentProvider baseUri={baseUri} sourceText={sourceText}>
        <Toolbar />
        <NoteList1 notes={notes} selection={selection} />
        {errors.length > 0 && <ErrorList errors={errors} />}
      </DocumentProvider>
    </ViewProvider>
  );
}
