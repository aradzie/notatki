import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  bundle: true,
  format: "cjs",
  target: "esnext",
  platform: "node",
  external: ["vscode"],
  sourcemap: true,
  minify: true,
  plugins: [],
});
