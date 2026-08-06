import { type Note, type NoteList, type Output } from "@notatki/core";
import CSS from "./asset.css.ts";
import JS from "./asset.js.ts";
import { CardData } from "./card-data.ts";
import { type CardTemplates } from "./card-templates.ts";
import { escapeHtml } from "./html.ts";
import { type ImageResolver } from "./image-resolver.ts";
import { type PreviewOptions } from "./preview-options.ts";

export type RendererContext = Readonly<{
  options: Readonly<PreviewOptions>;
  templates: CardTemplates;
  notes: NoteList;
  out: Output;
  resolver: ImageResolver;
}>;

export class PreviewRenderer<Context extends RendererContext = RendererContext> {
  #styles: string[] = [CSS];
  #scripts: string[] = [JS];

  get styles(): string[] {
    return [...this.#styles];
  }

  set styles(value: string[]) {
    this.#styles = [...value];
  }

  get scripts(): string[] {
    return [...this.#scripts];
  }

  set scripts(value: string[]) {
    this.#scripts = [...value];
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
    this.renderCommonStyles(ctx);
    this.renderModelStyles(ctx);
    this.renderScripts(ctx);
    ctx.out.print(`</head>`);
  }

  renderCommonStyles(ctx: Context) {
    for (const style of this.#styles) {
      ctx.out.print(`<style>`);
      ctx.out.print(style);
      ctx.out.print(`</style>`);
    }
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

  renderScripts(ctx: Context) {
    for (const script of this.#scripts) {
      ctx.out.print(`<script type="module">`);
      ctx.out.print(script);
      ctx.out.print(`</script>`);
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
      const data = new CardData(note.type, card, note, ctx.resolver);
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
