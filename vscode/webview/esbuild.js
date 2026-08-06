import { reactCompilerPlugin, stripKatexFontsPlugin } from "@notatki/scripts/esbuild.js";
import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.tsx"],
  outfile: "../extension/assets/preview.js",
  bundle: true,
  format: "esm",
  target: "esnext",
  sourcemap: true,
  minify: true,
  loader: {
    ".woff2": "dataurl",
  },
  plugins: [stripKatexFontsPlugin(), reactCompilerPlugin()],
});
