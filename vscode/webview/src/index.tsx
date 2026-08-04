import "katex/dist/katex.min.css";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";

createRoot(document.getElementById("main") as HTMLElement).render(<App />);
