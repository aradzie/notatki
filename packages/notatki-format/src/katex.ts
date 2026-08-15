import { type KatexOptions, renderToString } from "katex";

const defaultOptions = {
  output: "html",
  strict: true,
  throwOnError: false,
} as const satisfies KatexOptions;

export function katexDisplay(value: string, options: KatexOptions): string {
  options = { ...defaultOptions, ...options, displayMode: true };
  try {
    return renderToString(value, options) + "\n";
  } catch (err) {
    // Sometimes KaTeX throws errors even if throwOnError is false.
    // In such a case we should handle the errors ourselves.
    if (options.throwOnError) {
      throw err;
    } else {
      return `<span style="color:red">${(err as Error).message}</span>`;
    }
  }
}

export function katexInline(value: string, options: KatexOptions): string {
  options = { ...defaultOptions, ...options, displayMode: false };
  try {
    return renderToString(value, options);
  } catch (err) {
    // Sometimes KaTeX throws errors even if throwOnError is false.
    // In such a case we should handle the errors ourselves.
    if (options.throwOnError) {
      throw err;
    } else {
      return `<span style="color:red">${(err as Error).message}</span>`;
    }
  }
}
