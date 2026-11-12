import { parseFragment, serialize } from "parse5";
import { youtubeFrameAttributes, youtubeVideo } from "../shared/youtube.mts";

// Turndown preserves rich tables as HTML, including the editor's video nodes.
function renderTableVideos(html) {
  const table = parseFragment(html);
  function visit(node) {
    if (node.tagName === "p" && node.attrs.some((attr) => attr.name === "data-youtube") && node.childNodes.length === 1) {
      const video = youtubeVideo(node.childNodes[0].value ?? "");
      if (video) {
        node.tagName = node.nodeName = "iframe";
        node.attrs = Object.entries(youtubeFrameAttributes(video)).map(([name, value]) => ({ name, value }));
        node.childNodes = [];
      }
    }
    node.childNodes?.forEach(visit);
  }
  visit(table);
  return serialize(table);
}

// Match the original paragraph so explicit Markdown links and code stay as written.
export function markdownYoutube() {
  return (tree, file) => {
    const source = String(file);
    function visit(node) {
      if (node.type === "paragraph" && node.children.length === 1 && node.position) {
        const video = youtubeVideo(source.slice(node.position.start.offset, node.position.end.offset).trim());
        if (video) {
          node.data = { hName: "iframe", hProperties: youtubeFrameAttributes(video), hChildren: [] };
          return;
        }
      }
      if (node.type === "html" && /^<table\b/i.test(node.value) && node.value.includes("data-youtube")) node.value = renderTableVideos(node.value);
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
