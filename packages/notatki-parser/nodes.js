function isNoteNode(node) {
  return node.type === "note";
}

function isTombstoneNode(node) {
  return node.type === "tombstone";
}

export { isNoteNode, isTombstoneNode };
