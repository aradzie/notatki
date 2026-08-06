import { pathTo, stripKatexFontsPlugin, wrapAsJsModules } from "@notatki/scripts/esbuild.js";
import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  outfile: "asset.js",
  bundle: true,
  format: "esm",
  target: "esnext",
  sourcemap: false,
  minify: true,
  write: false,
  loader: {
    ".woff2": "dataurl",
  },
  plugins: [stripKatexFontsPlugin(), wrapAsJsModules(pathTo(import.meta.url, "../notatki-preview/src"))],
});
