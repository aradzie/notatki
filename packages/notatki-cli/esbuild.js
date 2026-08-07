import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/program.ts"],
  outfile: "dist/notatki.js",
  bundle: true,
  format: "esm",
  target: "esnext",
  platform: "node",
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
  minify: true,
});
