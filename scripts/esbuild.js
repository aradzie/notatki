import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformAsync } from "@babel/core";
import reactCompiler from "babel-plugin-react-compiler";

export function pathTo(base, ...segments) {
  return path.resolve(path.dirname(fileURLToPath(base)), ...segments);
}

/**
 * katex/dist/katex.min.css lists woff2, woff, and ttf fallbacks for every
 * @font-face. WOFF2 alone covers every browser in active use, so drop the
 * other two before esbuild's dataurl loader gets a chance to inline them —
 * otherwise the bundled CSS carries ~3x more embedded font data than needed.
 * Pair with a `loader` map that only maps `.woff2` (not `.woff`/`.ttf`), so a
 * future reference to those formats fails the build loudly instead of
 * silently re-inflating it.
 *
 * @return {import('esbuild').Plugin}
 */
export function stripKatexFontsPlugin() {
  return {
    name: "strip-katex-fonts",
    setup(build) {
      build.onLoad({ filter: /katex.*\.css$/, namespace: "file" }, async (args) => {
        const contents = await readFile(args.path, "utf8");
        const stripped = contents.replace(/,url\([^)]*\)\s*format\("(?:woff|truetype)"\)/g, "");
        if (stripped === contents) {
          throw new Error(
            `strip-katex-fonts: ` +
              `expected to strip woff/truetype font references from ${args.path}, ` +
              `but found none — katex's CSS format may have changed.`,
          );
        }
        return { contents: stripped, loader: "css" };
      });
    },
  };
}

/**
 * Instead of writing assets as raw JS/CSS files, wrap each one as a TypeScript
 * module exporting the compiled content as a string, so it can be imported
 * like any other TypeScript source (e.g. `import CSS from "./asset.css.ts"`).
 *
 * @return {import('esbuild').Plugin}
 */
export function wrapAsJsModules(outDir) {
  return {
    name: "wrap-as-js-modules",
    setup(build) {
      build.onEnd(async (result) => {
        for (const file of result.outputFiles ?? []) {
          const { ext } = path.parse(file.path);
          const data =
            `// This file is generated, do not edit.\n\n` + //
            `export default ${JSON.stringify(file.text.trim())};\n`;
          await writeFile(path.join(outDir, `asset${ext}.ts`), data);
        }
      });
    },
  };
}

/**
 * @return {import('esbuild').Plugin}
 */
export function reactCompilerPlugin() {
  return {
    name: "react-compiler",
    setup(build) {
      build.onLoad({ filter: /\.(ts|tsx)$/ }, async ({ path }) => {
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
}
