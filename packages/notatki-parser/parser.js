import { parse, SyntaxError } from "./parser$.js";

function parseNoteList(input, grammarSource) {
  return parse(input, { grammarSource, startRule: "NoteList" });
}

function parseModelList(input, grammarSource) {
  return parse(input, { grammarSource, startRule: "ModelList" });
}

function parseTemplate(input, grammarSource) {
  return parse(input, { grammarSource, startRule: "Template" });
}

function parseCloze(input, grammarSource) {
  return parse(input, { grammarSource, startRule: "ClozeText" });
}

export { parseCloze, parseModelList, parseNoteList, parseTemplate, SyntaxError };
