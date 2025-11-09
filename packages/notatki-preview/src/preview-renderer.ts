import { type Note, type NoteList, type Output } from "@notatki/core";
import { CardData } from "./card-data.js";
import { type CardTemplates } from "./card-templates.js";
import { escapeHtml } from "./html.js";
import { type PreviewOptions } from "./preview-options.js";

export type RendererContext = Readonly<{
  options: Readonly<PreviewOptions>;
  templates: CardTemplates;
  notes: NoteList;
  out: Output;
}>;

export class PreviewRenderer<Context extends RendererContext = RendererContext> {
  static readonly defaultStylesheets: readonly string[] = [
    `https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css`, //
  ];

  static readonly defaultStyles: readonly string[] = [
    `:root { color-scheme: light dark; }`,
    `.card-list { display: flex; flex-flow: row wrap; justify-content: center; align-items: center; gap: 1rem; }`,
    `.card-list-item { flex: 0 1 auto; min-width: 20rem; padding: 0 1rem; border: 1px dotted #666; }`,
    `.prop { font-size: 0.75em; color: #666; }`,
    `.prop-name { font-weight: bold; font-style: normal; }`,
    `.prop-value { font-weight: normal; font-style: normal; }`,
    `img { max-width: 100%; }`,
    `li { text-align: start; }`,
    `pre { text-align: left; }`,
    `hr { height: 1px; margin: 1em 0; border: none; background-color: #666; }`,
  ];

  #stylesheets: string[] = [...PreviewRenderer.defaultStylesheets];
  #styles: string[] = [...PreviewRenderer.defaultStyles];

  get stylesheets(): string[] {
    return [...this.#stylesheets];
  }

  set stylesheets(value: string[]) {
    this.#stylesheets = [...value];
  }

  get styles(): string[] {
    return [...this.#styles];
  }

  set styles(value: string[]) {
    this.#styles = [...value];
  }

  render(ctx: Context) {
    ctx.out.print(`<!doctype html>`);
    ctx.out.print(`<html>`);
    this.renderHead(ctx);
    this.renderBody(ctx);
    ctx.out.print(`</html>`);
  }

  renderHead(ctx: Context) {
    ctx.out.print(`<head>`);
    ctx.out.print(`<meta charset="UTF-8">`);
    ctx.out.print(`<title>${escapeHtml(ctx.options.title)}</title>`);
    this.renderStylesheets(ctx);
    this.renderCommonStyles(ctx);
    this.renderModelStyles(ctx);
    ctx.out.print(`</head>`);
  }

  renderStylesheets(ctx: Context) {
    for (const stylesheet of this.#stylesheets) {
      ctx.out.print(`<link rel="stylesheet" href="${escapeHtml(stylesheet)}" crossOrigin="anonymous">`);
    }
  }

  renderCommonStyles(ctx: Context) {
    ctx.out.print(`<style>`);
    for (const style of this.#styles) {
      ctx.out.print(style);
    }
    ctx.out.print(`</style>`);
  }

  renderModelStyles(ctx: Context) {
    for (const type of ctx.notes.types) {
      if (type.styles) {
        ctx.out.print(`<style>`);
        ctx.out.print(`[data-type="${type.name}"] {`);
        ctx.out.print(type.styles);
        ctx.out.print(`}`);
        ctx.out.print(`</style>`);
      }
    }
  }

  renderBody(ctx: Context) {
    ctx.out.print(`<body>`);
    this.renderCardList(ctx);
    ctx.out.print(`</body>`);
  }

  renderCardList(ctx: Context) {
    ctx.out.print(`<main class="card-list">`);
    for (const note of ctx.notes) {
      this.renderNoteCardList(ctx, note);
    }
    ctx.out.print(`</main>`);
  }

  renderNoteCardList(ctx: Context, note: Note) {
    for (const card of note.type.cards) {
      const data = new CardData(note.type, card, note);
      if (ctx.options.showFront) {
        this.renderFrontCard(ctx, data);
      }
      if (ctx.options.showBack) {
        this.renderBackCard(ctx, data);
      }
    }
  }

  renderFrontCard(ctx: Context, data: CardData) {
    this.renderCard(ctx, data, "front");
  }

  renderBackCard(ctx: Context, data: CardData) {
    this.renderCard(ctx, data, "back");
  }

  renderCard(ctx: Context, data: CardData, side: "front" | "back") {
    ctx.out.print(`<div class="card-list-item">`);
    if (ctx.options.showDetails) {
      ctx.out.print(prop("Type", `${data.note.type.name}::${data.card.name}::${sideName(side)}`));
      ctx.out.print(prop("Deck", data.note.deck));
      ctx.out.print(prop("Tags", data.note.tags));
    }
    ctx.out.print(`<div data-type="${escapeHtml(data.note.type.name)}">`);
    ctx.out.print(`<div class="card">`);
    ctx.out.print(this.renderCardContents(ctx, data, side));
    ctx.out.print(`</div>`);
    ctx.out.print(`</div>`);
    ctx.out.print(`</div>`);
  }

  renderCardContents(ctx: Context, data: CardData, side: "front" | "back"): string {
    return ctx.templates.render(data, side);
  }
}

function prop(name: string, value: string) {
  return (
    `<p class="prop">` +
    `<span class="prop-name">${escapeHtml(name)}:</span> ` +
    `<span class="prop-value">${escapeHtml(value)}</span>` +
    `</p>`
  );
}

function sideName(side: "front" | "back"): string {
  switch (side) {
    case "front":
      return "Front";
    default:
      return "Back";
  }
}
