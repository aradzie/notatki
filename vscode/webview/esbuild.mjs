import { problemMatcherPlugin } from "@notatki/scripts/esbuild.js";
import esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/index.tsx"],
    outfile: "../extension/assets/preview.js",
    bundle: true,
    format: "esm",
    target: "esnext",
    sourcemap: true,
    minify: production,
    logLevel: "silent",
    loader: {
      ".woff2": "dataurl",
      ".woff": "dataurl",
      ".ttf": "dataurl",
    },
    plugins: [
      /* Add to the end of the plugin array. */
      problemMatcherPlugin,
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
