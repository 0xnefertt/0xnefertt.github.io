import type { Draft } from "./model";

type Attachment = { id: string; url: string; mime: string; size: number; used: boolean };
type Api = <T>(path: string, init?: RequestInit) => Promise<T>;

export function mediaManager(options: {
  api: Api;
  current: () => Draft | null;
  isLocked: () => boolean;
  lock: (value: boolean) => void;
  save: () => Promise<void>;
  accept: (draft: Draft) => void;
  imageSrc: (source: string) => Promise<string>;
  release: (source: string) => void;
  report: (error: unknown) => void;
}) {
  const panel = document.getElementById("media-manager") as HTMLDetailsElement;
  const list = document.getElementById("media-list")!;
  const count = document.getElementById("media-count")!;
  const dialog = document.getElementById("media-delete-dialog") as HTMLDialogElement;
  const refresh = document.getElementById("media-refresh") as HTMLButtonElement;
  let revision = 0;
  let pending: { draftId: string; file: Attachment } | null = null;

  async function load() {
    const draft = options.current();
    if (!draft || !panel.open) return;
    const requestRevision = ++revision;
    count.textContent = "첨부 이미지를 불러오는 중…";
    list.replaceChildren();
    const result = await options.api<{ media: Attachment[] }>(`/api/drafts/${draft.id}/media`);
    if (requestRevision !== revision || options.current()?.id !== draft.id) return;
    count.textContent = `${result.media.length}/20개 · ${(result.media.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB`;
    if (!result.media.length) {
      list.textContent = "비공개 첨부 이미지가 없습니다.";
      return;
    }
    for (const file of result.media) {
      const row = document.createElement("div");
      row.className = "media-item";
      const image = document.createElement("img");
      image.alt = "첨부 이미지 미리보기";
      void options
        .imageSrc(file.url)
        .then((source) => {
          if (requestRevision === revision) image.src = source;
        })
        .catch(() => {
          image.alt = "이미지를 불러오지 못했습니다.";
        });
      const label = document.createElement("span");
      label.textContent = `${file.mime.replace("image/", "").toUpperCase()} · ${(file.size / 1024).toFixed(0)} KB · ${file.used ? "사용 중" : "미사용"}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "삭제";
      remove.dataset.used = String(file.used);
      remove.disabled = file.used || options.isLocked();
      remove.addEventListener("click", () => {
        if (options.isLocked() || options.current()?.id !== draft.id) return;
        pending = { draftId: draft.id, file };
        dialog.returnValue = "";
        dialog.showModal();
      });
      row.append(image, label, remove);
      list.append(row);
    }
  }

  async function reload() {
    if (options.isLocked()) return;
    options.lock(true);
    try {
      await options.save();
      await load();
    } finally {
      options.lock(false);
    }
  }
  panel.addEventListener("toggle", () => {
    if (panel.open) void reload().catch(options.report);
  });
  refresh.addEventListener("click", () => void reload().catch(options.report));
  dialog.addEventListener("close", () => {
    const selection = pending;
    pending = null;
    if (dialog.returnValue !== "delete" || !selection || options.isLocked() || options.current()?.id !== selection.draftId) return;
    void (async () => {
      options.lock(true);
      try {
        await options.save();
        const result = await options.api<{ draft: Draft }>(`/api/drafts/${selection.draftId}/media/${selection.file.id}`, {
          method: "DELETE",
          body: JSON.stringify({ version: options.current()!.version }),
        });
        options.accept(result.draft);
        options.release(selection.file.url);
        await load();
      } finally {
        options.lock(false);
      }
    })().catch(options.report);
  });
  return {
    changed: () => {
      revision++;
      pending = null;
      list.replaceChildren();
      count.textContent = "";
      if (panel.open) void load().catch(options.report);
    },
    setLocked: (locked: boolean) => {
      refresh.disabled = locked;
      for (const button of list.querySelectorAll<HTMLButtonElement>("button")) {
        button.disabled = locked || button.dataset.used === "true";
      }
    },
  };
}
