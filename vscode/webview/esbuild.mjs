import { readFile } from "node:fs/promises";
import { transformAsync } from "@babel/core";
import { problemMatcherPlugin } from "@notatki/scripts/esbuild.js";
import reactCompiler from "babel-plugin-react-compiler";
import esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const reactCompilerPlugin = {
  name: "react-compiler",
  setup(build) {
    build.onLoad({ filter: /\.tsx?$/ }, async ({ path }) => {
      const source = await readFile(path, "utf8");
      const { code } = await transformAsync(source, {
        filename: path,
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["jsx", "typescript"] },
        plugins: [reactCompiler],
      });
      return { contents: code, loader: path.endsWith(".tsx") ? "tsx" : "ts" };
    });
  },
};

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
      reactCompilerPlugin,
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
