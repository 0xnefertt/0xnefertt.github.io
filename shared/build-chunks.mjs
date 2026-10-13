// Keep editor dependencies independently cacheable in both the site and Worker UI.
export function writerChunks() {
  return {
    groups: [
      { name: "editor", test: /node_modules\/(?:@tiptap|prosemirror-|orderedmap|w3c-keyname|rope-sequence|crelt)/ },
      { name: "markdown", test: /node_modules\/(?:yaml|marked|turndown|dompurify)\// },
    ],
  };
}
