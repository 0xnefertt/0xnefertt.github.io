import { parseFragment, serialize } from "parse5";
import { youtubeFrameAttributes, youtubeVideo } from "../shared/youtube.mts";

// Sized videos and videos inside rich tables are stored as HTML markers.
function renderHtmlVideos(html) {
  const fragment = parseFragment(html);
  function visit(node) {
    if (node.tagName === "p" && node.attrs.some((attr) => attr.name === "data-youtube") && node.childNodes.length === 1) {
      const video = youtubeVideo(node.childNodes[0].value ?? "");
      if (video) {
        node.tagName = node.nodeName = "iframe";
        node.attrs = Object.entries(youtubeFrameAttributes(video, node.attrs.find((attr) => attr.name === "data-width")?.value)).map(
          ([name, value]) => ({ name, value })
        );
        node.childNodes = [];
      }
    }
    node.childNodes?.forEach(visit);
  }
  visit(fragment);
  return serialize(fragment);
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
      if (node.type === "html" && /<p\s[^>]*\bdata-youtube[=\s>]/i.test(node.value)) node.value = renderHtmlVideos(node.value);
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
