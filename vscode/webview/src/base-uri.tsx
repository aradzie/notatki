import { createContext, useContext } from "react";

const BaseUriContext = createContext("");

function useBaseUri(): string {
  return useContext(BaseUriContext);
}

function BaseUriProvider({ baseUri, children }: { baseUri: string; children: any }) {
  return <BaseUriContext value={baseUri}>{children}</BaseUriContext>;
}

export { BaseUriProvider, useBaseUri };
