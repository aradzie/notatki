function isNoteNode(node) {
  return node.type === "note";
}

function isTombstoneNode(node) {
  return node.type === "tombstone";
}

function isCommentNode(node) {
  return node.type === "comment";
}

export { isCommentNode, isNoteNode, isTombstoneNode };
