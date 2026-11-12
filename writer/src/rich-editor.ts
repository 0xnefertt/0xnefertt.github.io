import { Editor, Node } from "@tiptap/core";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { cleanHtml, editorBody, requiresSource, richToMarkdown, safeImage, safeLink, videoFrame } from "./rich-content";
import { youtubeVideo } from "../../shared/youtube.mjs";

const Youtube = Node.create({
  name: "youtube",
  group: "block",
  atom: true,
  addAttributes: () => ({ url: { default: null } }),
  parseHTML: () => [
    {
      tag: "p[data-youtube]",
      priority: 60,
      getAttrs: (el) => {
        const video = youtubeVideo(el.textContent ?? "");
        return video ? { url: video.url } : false;
      },
    },
  ],
  renderHTML: ({ node }) => ["p", { "data-youtube": "true" }, node.attrs.url],
  addNodeView:
    () =>
    ({ node }) => {
      const wrapper = document.createElement("div");
      const video = youtubeVideo(node.attrs.url);
      if (video) wrapper.append(videoFrame(video));
      return { dom: wrapper };
    },
});

type BodyImage = { src: string; alt: string };
const ImagePair = Node.create({
  name: "imagePair",
  group: "block",
  content: "image{0,2}",
  isolating: true,
  parseHTML: () => [{ tag: 'p[data-image-pair="true"]', priority: 60 }],
  renderHTML: () => ["p", { "data-image-pair": "true" }, 0],
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _previous, state) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const tr = state.tr;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.childCount < 2) {
              tr.replaceWith(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize), node.content);
              return false;
            }
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});

type Options = {
  onChange: () => void;
  onComposition: (active: boolean) => void;
  upload: (files: File[]) => Promise<void>;
  imageSrc: (value: string) => Promise<string>;
  report: (error: unknown) => void;
};
export function richEditor(options: Options) {
  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const source = el<HTMLTextAreaElement>("body");
  const toolbar = el<HTMLFieldSetElement>("rich-toolbar");
  let editor: Editor | null = null;
  let raw = "";
  let edited = false;
  let sourceMode = false;
  let locked = false;
  let composing = false;
  let supported = true;
  const uploads = (event: ClipboardEvent | DragEvent) => {
    const transfer = "clipboardData" in event ? event.clipboardData : event.dataTransfer;
    const files = Array.from(transfer?.files ?? []);
    if (!files.length) return false;
    event.preventDefault();
    void options.upload(files).catch(options.report);
    return true;
  };
  const PrivateImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        "data-image-width": {
          default: null,
          parseHTML: (element) => {
            const width = element.getAttribute("data-image-width");
            return ["25", "50", "75", "100"].includes(width ?? "") ? width : null;
          },
        },
      };
    },
    addNodeView() {
      return ({ node }) => {
        const image = document.createElement("img");
        image.alt = node.attrs.alt ?? "";
        image.title = node.attrs.title ?? "";
        for (const attr of ["data-image-width", "width", "height"]) {
          if (node.attrs[attr] != null) image.setAttribute(attr, String(node.attrs[attr]));
        }
        let disposed = false;
        void options
          .imageSrc(node.attrs.src)
          .then((src) => {
            if (!disposed) image.src = src;
          })
          .catch(() => {
            if (!disposed) image.alt = "이미지를 불러오지 못했습니다.";
          });
        return {
          dom: image,
          destroy: () => {
            disposed = true;
          },
        };
      };
    },
  });
  function make(value: string) {
    editor?.destroy();
    editor = new Editor({
      element: el("rich-body"),
      extensions: [
        StarterKit.configure({ link: { openOnClick: false, isAllowedUri: safeLink, HTMLAttributes: { target: null, rel: "noopener noreferrer" } } }),
        TextStyleKit,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: null }),
        TableKit.configure({ table: { resizable: false } }),
        Youtube,
        ImagePair,
        PrivateImage.configure({ allowBase64: false }),
        Placeholder.configure({ placeholder: "본문 내용을 입력하거나 이미지를 붙여넣으세요." }),
      ],
      content: `${editorBody(value)}<p></p>`,
      editable: !locked,
      editorProps: {
        attributes: { role: "textbox", "aria-label": "글 본문", "aria-multiline": "true", spellcheck: "true" },
        transformPastedHTML: cleanHtml,
        handlePaste: (view, event) => {
          if (uploads(event)) return true;
          const { $from, empty } = view.state.selection;
          if (!view.editable || !empty || $from.parent.type.name !== "paragraph" || $from.parent.content.size) return false;
          const video = youtubeVideo(event.clipboardData?.getData("text/plain").trim() ?? "");
          if (!video || !editor) return false;
          return editor.commands.insertContent({ type: "youtube", attrs: { url: video.url } });
        },
        handleDrop: (_view, event) => uploads(event),
      },
      onUpdate: () => {
        edited = true;
        options.onChange();
        updateTools();
      },
      onSelectionUpdate: updateTools,
      onTransaction: updateTools,
    });
    editor.view.dom.addEventListener("compositionstart", () => {
      composing = true;
      options.onComposition(true);
    });
    editor.view.dom.addEventListener("compositionend", () => {
      composing = false;
      options.onComposition(false);
      options.onChange();
    });
    updateTools();
  }
  // Only combine neighboring images in the same block container. Never move text into the row.
  function nextImageRange(e: Editor) {
    const selection = e.state.selection;
    if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return null;
    const parent = selection.$from.parent;
    if (parent.type.name === "imagePair") return null;
    let end = selection.to;
    for (let i = selection.$from.index() + 1; i < parent.childCount; i++) {
      const next = parent.child(i);
      end += next.nodeSize;
      if (next.type.name === "image") return { from: selection.from, to: end, images: [selection.node, next] };
      if (next.type.name !== "paragraph" || next.content.size) break;
    }
    return null;
  }
  function updateTools() {
    if (!editor) return;
    for (const button of toolbar.querySelectorAll<HTMLButtonElement>("[data-mark]"))
      button.setAttribute("aria-pressed", String(editor.isActive(button.dataset.mark!)));
    for (const button of toolbar.querySelectorAll<HTMLButtonElement>("[data-align]"))
      button.setAttribute("aria-pressed", String(editor.isActive({ textAlign: button.dataset.align })));
    el<HTMLButtonElement>("rich-undo").disabled = locked || !editor.can().undo();
    el<HTMLButtonElement>("rich-redo").disabled = locked || !editor.can().redo();
    el<HTMLSelectElement>("table-action").disabled = locked || !editor.isActive("table");
    const selection = editor.state.selection;
    const imageSelected = selection instanceof NodeSelection && selection.node.type.name === "image";
    const paired = selection.$from.parent.type.name === "imagePair";
    el("image-layout-tools").hidden = !imageSelected;
    const width = el<HTMLSelectElement>("image-width");
    width.disabled = locked || paired;
    width.value = paired ? "50" : (editor.getAttributes("image")["data-image-width"] ?? "");
    const pair = el<HTMLButtonElement>("image-pair");
    pair.textContent = paired ? "나란히 배치 해제" : "다음 이미지와 나란히";
    pair.disabled = locked || (!paired && !nextImageRange(editor));
    const heading = editor.getAttributes("heading").level;
    el<HTMLSelectElement>("block-style").value = heading ? String(heading) : "0";
    const style = editor.getAttributes("textStyle");
    el<HTMLSelectElement>("font-family").value = style.fontFamily ?? "";
    el<HTMLSelectElement>("font-size").value = style.fontSize ?? "16px";
    el<HTMLSelectElement>("line-height").value = style.lineHeight ?? "1.7";
  }
  function mode(value: boolean) {
    if (!value && !supported) return;
    if (value === sourceMode) return;
    if (value) source.value = getBody();
    else {
      raw = source.value;
      edited = false;
      make(raw);
    }
    sourceMode = value;
    el("rich-body").hidden = value;
    el("source-panel").hidden = !value;
    toolbar.hidden = value;
    el("write-tab").setAttribute("aria-pressed", String(!value));
    el("source-tab").setAttribute("aria-pressed", String(value));
  }
  function load(value: string) {
    raw = value;
    edited = false;
    source.value = value;
    supported = !requiresSource(value);
    sourceMode = !supported;
    // Recreate the editor per document so undo cannot restore another post's content.
    if (supported) make(value);
    else {
      editor?.destroy();
      editor = null;
    }
    el("rich-body").hidden = sourceMode;
    el("source-panel").hidden = !sourceMode;
    toolbar.hidden = sourceMode;
    el<HTMLButtonElement>("write-tab").disabled = !supported;
    el("rich-note").textContent = supported
      ? ""
      : "이 글에는 사용자 정의 HTML 또는 특수 문법이 있어 원문 모드로 열었습니다. 원문을 그대로 수정할 수 있습니다.";
    el("rich-note").hidden = supported;
    el("write-tab").setAttribute("aria-pressed", String(!sourceMode));
    el("source-tab").setAttribute("aria-pressed", String(sourceMode));
  }
  function getBody() {
    return sourceMode ? source.value : edited && editor ? richToMarkdown(editor.getHTML()) : raw;
  }
  function run(callback: (value: Editor) => void) {
    if (!editor || locked || sourceMode) return;
    callback(editor);
    updateTools();
  }
  el<HTMLSelectElement>("image-width").addEventListener("change", (event) =>
    run((e) => {
      const width = (event.target as HTMLSelectElement).value || null;
      e.chain().focus().updateAttributes("image", { "data-image-width": width }).run();
    })
  );
  el("image-pair").addEventListener("mousedown", (event) => event.preventDefault());
  el("image-pair").addEventListener("click", () =>
    run((e) => {
      const { $from } = e.state.selection;
      const tr = e.state.tr;
      let start: number;
      if ($from.parent.type.name === "imagePair") {
        start = $from.before();
        tr.replaceWith(start, $from.after(), $from.parent.content);
      } else {
        const range = nextImageRange(e);
        if (!range) return;
        start = range.from + 1;
        tr.replaceWith(range.from, range.to, e.schema.nodes.imagePair.create(null, range.images));
      }
      e.view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, start)));
      e.view.focus();
    })
  );
  const commands: Record<string, (value: Editor) => void> = {
    bold: (e) => {
      e.chain().focus().toggleBold().run();
    },
    italic: (e) => {
      e.chain().focus().toggleItalic().run();
    },
    underline: (e) => {
      e.chain().focus().toggleUnderline().run();
    },
    strike: (e) => {
      e.chain().focus().toggleStrike().run();
    },
    code: (e) => {
      e.chain().focus().toggleCode().run();
    },
    codeBlock: (e) => {
      e.chain().focus().toggleCodeBlock().run();
    },
    bulletList: (e) => {
      e.chain().focus().toggleBulletList().run();
    },
    orderedList: (e) => {
      e.chain().focus().toggleOrderedList().run();
    },
    blockquote: (e) => {
      e.chain().focus().toggleBlockquote().run();
    },
    rule: (e) => {
      e.chain().focus().setHorizontalRule().run();
    },
    highlight: (e) => {
      e.chain().focus().toggleHighlight({ color: "#fff3a3" }).run();
    },
    clear: (e) => {
      e.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run();
    },
    undo: (e) => {
      e.chain().focus().undo().run();
    },
    redo: (e) => {
      e.chain().focus().redo().run();
    },
  };
  for (const button of toolbar.querySelectorAll<HTMLButtonElement>("[data-command]")) {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => run(commands[button.dataset.command!]));
  }
  for (const button of toolbar.querySelectorAll<HTMLButtonElement>("[data-align]")) {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () =>
      run((e) => {
        e.chain().focus().setTextAlign(button.dataset.align!).run();
      })
    );
  }
  el<HTMLSelectElement>("block-style").addEventListener("change", (event) =>
    run((e) => {
      const value = Number((event.target as HTMLSelectElement).value);
      if (value === 0) e.chain().focus().setParagraph().run();
      else
        e.chain()
          .focus()
          .setHeading({ level: value as 1 | 2 | 3 | 4 })
          .run();
    })
  );
  el<HTMLSelectElement>("font-family").addEventListener("change", (event) =>
    run((e) => {
      const value = (event.target as HTMLSelectElement).value;
      if (value) e.chain().focus().setFontFamily(value).run();
      else e.chain().focus().unsetFontFamily().run();
    })
  );
  el<HTMLSelectElement>("font-size").addEventListener("change", (event) =>
    run((e) => {
      e.chain()
        .focus()
        .setFontSize((event.target as HTMLSelectElement).value)
        .run();
    })
  );
  el<HTMLSelectElement>("line-height").addEventListener("change", (event) =>
    run((e) => {
      e.chain()
        .focus()
        .setLineHeight((event.target as HTMLSelectElement).value)
        .run();
    })
  );
  el<HTMLInputElement>("text-color").addEventListener("input", (event) =>
    run((e) => {
      e.chain()
        .focus()
        .setColor((event.target as HTMLInputElement).value)
        .run();
    })
  );
  el<HTMLSelectElement>("table-action").addEventListener("change", (event) => {
    const input = event.target as HTMLSelectElement;
    const actions: Record<string, (value: Editor) => void> = {
      row: (e) => {
        e.chain().focus().addRowAfter().run();
      },
      column: (e) => {
        e.chain().focus().addColumnAfter().run();
      },
      deleteRow: (e) => {
        e.chain().focus().deleteRow().run();
      },
      deleteColumn: (e) => {
        e.chain().focus().deleteColumn().run();
      },
      header: (e) => {
        e.chain().focus().toggleHeaderRow().run();
      },
      merge: (e) => {
        e.chain().focus().mergeCells().run();
      },
      split: (e) => {
        e.chain().focus().splitCell().run();
      },
      delete: (e) => {
        e.chain().focus().deleteTable().run();
      },
    };
    if (actions[input.value]) run(actions[input.value]);
    input.value = "";
  });
  const dialog = el<HTMLDialogElement>("insert-dialog");
  let insert: "link" | "image" | "table" | "video" = "link";
  function showDialog(kind: typeof insert) {
    if (locked || sourceMode || !editor) return;
    insert = kind;
    el("insert-heading").textContent = { link: "링크 추가", image: "이미지 주소 추가", table: "표 추가", video: "YouTube 영상 추가" }[kind];
    el<HTMLInputElement>("insert-url").placeholder = kind === "video" ? "https://youtu.be/…" : "https://example.com";
    el("insert-url-field").hidden = kind === "table";
    el("insert-alt-field").hidden = kind !== "image";
    el("insert-table-fields").hidden = kind !== "table";
    el<HTMLInputElement>("insert-url").value = kind === "link" ? (editor.getAttributes("link").href ?? "") : "";
    el<HTMLInputElement>("insert-alt").value = "";
    el("insert-error").textContent = "";
    dialog.showModal();
  }
  el("rich-video").addEventListener("click", () => showDialog("video"));
  el("rich-link").addEventListener("click", () => showDialog("link"));
  el("rich-image-url").addEventListener("click", () => showDialog("image"));
  el("rich-table").addEventListener("click", () => showDialog("table"));
  el("insert-cancel").addEventListener("click", () => dialog.close());
  el("insert-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const url = el<HTMLInputElement>("insert-url").value.trim();
    if ((insert === "link" && !safeLink(url)) || (insert === "image" && !safeImage(url))) {
      el("insert-error").textContent = "올바른 주소를 입력하세요. 이미지 주소는 https를 사용하세요.";
      return;
    }
    if (insert === "video") {
      const video = youtubeVideo(url);
      if (!video) {
        el("insert-error").textContent = "YouTube 영상의 시청 주소나 공유 주소를 입력하세요.";
        return;
      }
      run((e) =>
        e
          .chain()
          .focus()
          .insertContent({ type: "youtube", attrs: { url: video.url } })
          .run()
      );
    } else if (insert === "table") {
      const rows = Number(el<HTMLInputElement>("table-rows").value),
        cols = Number(el<HTMLInputElement>("table-columns").value);
      if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 10 || cols > 10) {
        el("insert-error").textContent = "행과 열은 1~10 사이로 입력하세요.";
        return;
      }
      run((e) => {
        e.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      });
    } else if (insert === "image") insertImage(url, el<HTMLInputElement>("insert-alt").value);
    else
      run((e) => {
        if (e.state.selection.empty && !e.isActive("link"))
          e.chain()
            .focus()
            .insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
            .run();
        else e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      });
    dialog.close();
  });
  el("rich-unlink").addEventListener("click", () =>
    run((e) => {
      e.chain().focus().extendMarkRange("link").unsetLink().run();
    })
  );
  function insertImage(src: string, alt: string) {
    if (sourceMode) {
      source.setRangeText(`\n![${alt.replace(/[\[\]\\\n]/g, "")}](${src})\n`, source.selectionStart, source.selectionEnd, "end");
      options.onChange();
    } else editor?.chain().focus().setImage({ src, alt }).run();
  }
  function insertImagePair(images: BodyImage[]) {
    if (sourceMode) {
      const row = document.createElement("p");
      row.dataset.imagePair = "true";
      for (const { src, alt } of images) {
        const image = document.createElement("img");
        image.setAttribute("src", src);
        image.alt = alt;
        row.append(image);
      }
      source.setRangeText(`\n\n${row.outerHTML}\n\n`, source.selectionStart, source.selectionEnd, "end");
      options.onChange();
    } else {
      editor
        ?.chain()
        .focus()
        .insertContent({ type: "imagePair", content: images.map((attrs) => ({ type: "image", attrs })) })
        .run();
    }
  }
  source.addEventListener("input", () => {
    supported = !requiresSource(source.value);
    el<HTMLButtonElement>("write-tab").disabled = !supported;
  });
  el("source-tab").addEventListener("click", () => mode(true));
  el("write-tab").addEventListener("click", () => mode(false));
  return {
    load,
    getBody,
    insertImage,
    insertImagePair,
    isComposing: () => composing,
    isSource: () => sourceMode,
    characters: () => (sourceMode ? source.value.length : (editor?.state.doc.textContent.length ?? raw.length)),
    setLocked: (value: boolean) => {
      locked = value;
      toolbar.disabled = value;
      editor?.setEditable(!value, false);
      updateTools();
    },
  };
}
