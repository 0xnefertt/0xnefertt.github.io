// Remark plugin: expands literal `**bold**` markers that survive into text nodes
// (e.g. bold markers inside imported or generated content) into real
// `strong` nodes so they render as bold instead of raw asterisks.

function expandStrongText(value) {
  const nodes = [];
  const strongPattern = /\*\*([^*\n]+?)\*\*/g;
  let cursor = 0;
  let match;

  while ((match = strongPattern.exec(value)) !== null) {
    if (match.index > cursor) {
      nodes.push({
        type: "text",
        value: value.slice(cursor, match.index),
      });
    }

    nodes.push({
      type: "strong",
      children: [
        {
          type: "text",
          value: match[1],
        },
      ],
    });

    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) {
    nodes.push({
      type: "text",
      value: value.slice(cursor),
    });
  }

  return nodes;
}

function visit(node) {
  if (!node || !Array.isArray(node.children)) {
    return;
  }

  node.children = node.children.flatMap((child) => {
    if (child.type === "text" && child.value.includes("**")) {
      return expandStrongText(child.value);
    }

    visit(child);
    return child;
  });
}

export function markdownStrongFallback() {
  return (tree) => {
    visit(tree);
  };
}
