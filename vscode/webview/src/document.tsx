import { createContext, useContext } from "react";

type Document = {
  baseUri: string;
  sourceText: string;
};

const DocumentContext = createContext<Document>({ baseUri: "", sourceText: "" });

function useDocument(): Document {
  return useContext(DocumentContext);
}

function DocumentProvider({ baseUri, sourceText, children }: Document & { children: any }) {
  return <DocumentContext value={{ baseUri, sourceText }}>{children}</DocumentContext>;
}

export { DocumentProvider, useDocument };
