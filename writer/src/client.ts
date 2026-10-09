import DOMPurify from "dompurify";
import { marked } from "marked";
import type { Draft, PostDocument } from "./model";
import { siteManager } from "./site-manager";
import "../../astro/public/assets/styles/global.css";
import "./style.css";
import editor from "./editor.html?raw";

if (!document.getElementById("workspace")) document.body.insertAdjacentHTML("afterbegin", editor);
const apiBase = document.querySelector<HTMLMetaElement>('meta[name="writer-api"]')?.content ?? "";
const loginNonceKey = "writer.login-nonce";
const sessionKey = "writer.session";
const returned = new URLSearchParams(location.hash.slice(1));
if (apiBase && returned.has("session")) {
  const candidate = returned.get("session") ?? "";
  if (/^[a-f0-9]{64}$/.test(candidate) && returned.get("state") === sessionStorage.getItem(loginNonceKey))
    sessionStorage.setItem(sessionKey, candidate);
  sessionStorage.removeItem(loginNonceKey);
  history.replaceState(null, "", location.pathname);
}
let sessionToken = apiBase ? sessionStorage.getItem(sessionKey) ?? "" : "";
const mediaUrls = new Map<string, Promise<string>>();

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const title = element<HTMLInputElement>("title");
const description = element<HTMLInputElement>("description");
const body = element<HTMLTextAreaElement>("body");
const category = element<HTMLSelectElement>("category");
const tags = element<HTMLInputElement>("tags");
const date = element<HTMLInputElement>("date");
const slug = element<HTMLInputElement>("slug");
let csrf = "";
let current: Draft | null = null;
let dirty = false;
let conflict = false;
let locked = false;
let switching = false;
let saveFlight: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout>;
let drafts: { id: string; title: string; sourcePath: string | null; updated: string }[] = [];
let posts: { path: string; sha: string }[] | null = null;
let showingPosts = false;

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  if (csrf) headers.set("X-CSRF-Token", csrf);
  if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`);
  const result = await fetch(`${apiBase}${path}`, { ...init, headers, credentials: apiBase ? "omit" : "same-origin" });
  const data = await result.json().catch(() => {
    throw new ApiError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", result.status);
  });
  if (!result.ok) throw new ApiError(data.error ?? "요청을 처리하지 못했습니다.", result.status);
  return data as T;
}
const manager = siteManager(api, leave);

function status(value: string) {
  element("save-status").textContent = value;
}
function notice(message: string) {
  const target = element("notice");
  target.textContent = message;
  target.hidden = false;
}
function report(error: unknown) {
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  if (error instanceof ApiError && error.status === 409) conflict = true;
  status("저장 확인 필요");
  notice(message);
}
function read(): PostDocument {
  return {
    ...current!.document,
    title: title.value,
    description: description.value,
    body: body.value,
    category: category.value,
    date: date.value,
    slug: slug.value,
    tags: tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}
function setLocked(value: boolean) {
  locked = value;
  for (const id of ["save", "publish", "attach", "new-post", "logout"]) element<HTMLButtonElement>(id).disabled = value;
  for (const field of [title, description, body, category, tags, date, slug]) field.disabled = value;
  if (current?.document.sourcePath) slug.disabled = true;
  if (current?.document.sourcePath) {
    date.disabled = true;
  }
}
function showDraft(value: Draft) {
  clearTimeout(timer);
  current = value;
  dirty = false;
  conflict = false;
  const doc = value.document;
  title.value = doc.title;
  description.value = doc.description;
  body.value = doc.body;
  date.value = doc.date;
  tags.value = doc.tags.join(", ");
  slug.value = doc.slug;
  if (![...category.options].some((item) => item.value === doc.category)) category.add(new Option(doc.category, doc.category));
  category.value = doc.category;
  slug.disabled = Boolean(doc.sourcePath);
  date.disabled = Boolean(doc.sourcePath);
  category.disabled = false;
  element("empty").hidden = true;
  element("editor").hidden = false;
  element("notice").hidden = true;
  element("document-state").textContent = doc.sourcePath ? "수정 중 · 발행 전까지 비공개" : "비공개 초안";
  status("모든 변경사항 저장됨");
  updatePreview();
  renderList();
}
async function save(): Promise<void> {
  if (saveFlight) {
    await saveFlight;
    if (dirty) return save();
    return;
  }
  if (!current || !dirty) return;
  if (conflict) throw new Error("다른 기기의 변경과 충돌했습니다. 먼저 내용을 내려받고 목록에서 초안을 다시 열어 주세요.");
  const snapshot = read();
  const id = current.id;
  const version = current.version;
  status("저장 중…");
  saveFlight = (async () => {
    const saved = await api<Draft>(`/api/drafts/${id}`, { method: "PUT", body: JSON.stringify({ document: snapshot, version }) });
    if (current?.id === id) {
      current = saved;
      dirty = JSON.stringify(read()) !== JSON.stringify(snapshot);
      status(dirty ? "저장 대기 중" : "모든 변경사항 저장됨");
    }
    const entry = drafts.find((item) => item.id === id);
    if (entry) {
      entry.title = snapshot.title;
      entry.updated = saved.updated;
      renderList();
    }
  })();
  try {
    await saveFlight;
  } catch (error) {
    report(error);
    throw error;
  } finally {
    saveFlight = null;
  }
}
async function leave(): Promise<boolean> {
  if (locked) return false;
  if (conflict && dirty)
    return window.confirm("다른 기기의 변경과 충돌해 현재 내용이 저장되지 않았습니다. 내려받기로 내용을 보관한 뒤 이동하세요. 그래도 이동할까요?");
  try {
    await save();
    if (dirty) await save();
    return true;
  } catch {
    return false;
  }
}
function scheduleSave() {
  dirty = true;
  status("저장 대기 중");
  clearTimeout(timer);
  timer = setTimeout(() => {
    void save().catch(() => {});
  }, 1500);
  updatePreview();
}
for (const input of [title, description, body, category, tags, date, slug])
  input.addEventListener("input", (event) => {
    if (event instanceof InputEvent && event.isComposing) {
      dirty = true;
      clearTimeout(timer);
      status("작성 중…");
      return;
    }
    scheduleSave();
  });
body.addEventListener("compositionstart", () => clearTimeout(timer));
body.addEventListener("compositionend", scheduleSave);
title.addEventListener("blur", () => {
  if (!current?.document.sourcePath && !slug.value && title.value.trim()) {
    slug.value =
      title.value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || `post-${current!.id.slice(0, 8)}`;
    scheduleSave();
  }
});
window.addEventListener("beforeunload", (event) => {
  if (dirty || saveFlight || locked || manager.isDirty()) {
    event.preventDefault();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && dirty) void save().catch(() => {});
});
window.addEventListener("online", () => {
  if (dirty && !conflict) void save().catch(() => {});
});

function updatePreview() {
  if (!current) return;
  element("word-count").textContent = `${body.value.length.toLocaleString()}자`;
  if (element("preview-panel").hidden) return;
  element("preview-title").textContent = title.value || "제목 없는 글";
  element("preview-date").textContent = `${date.value} · 0xnefertt`;
  element("preview-tags").replaceChildren(
    ...tags.value
      .split(",")
      .filter((tag) => tag.trim())
      .map((tag) => {
        const span = document.createElement("span");
        span.textContent = `#${tag.trim()}`;
        return span;
      })
  );
  // Markdown is untrusted; raw scripts, event handlers, and unsafe links must never run.
  element("preview-body").innerHTML = DOMPurify.sanitize(marked.parse(body.value, { async: false }) as string, {
    FORBID_TAGS: ["form", "input", "button", "style", "iframe"],
  });
  for (const img of element("preview-body").querySelectorAll("img")) {
    const source = img.getAttribute("src") ?? "";
    if (source.startsWith("/assets/")) img.src = `https://0xnefertt.github.io${source}`;
    if (apiBase && source.startsWith("/api/media/")) {
      img.removeAttribute("src");
      if (!mediaUrls.has(source))
        mediaUrls.set(
          source,
          fetch(`${apiBase}${source}`, { headers: { Authorization: `Bearer ${sessionToken}` }, credentials: "omit" }).then(async (response) => {
            if (!response.ok) throw new Error("이미지를 불러오지 못했습니다.");
            return URL.createObjectURL(await response.blob());
          })
        );
      void mediaUrls
        .get(source)!
        .then((url) => {
          if (img.isConnected) img.src = url;
        })
        .catch(() => {
          img.alt = "이미지를 불러오지 못했습니다.";
        });
    }
  }
}
function view(preview: boolean) {
  element("write-panel").hidden = preview;
  element("preview-panel").hidden = !preview;
  element("write-tab").setAttribute("aria-pressed", String(!preview));
  element("preview-tab").setAttribute("aria-pressed", String(preview));
  if (preview) updatePreview();
}
element("write-tab").addEventListener("click", () => view(false));
element("preview-tab").addEventListener("click", () => view(true));
element("save").addEventListener("click", () => void save().catch(() => {}));
element("download").addEventListener("click", () => {
  if (!current) return;
  const doc = read();
  const content = `---\n${Object.entries({
    title: doc.title,
    date: doc.date,
    description: doc.description,
    categories: [doc.category],
    tags: doc.tags,
    draft: true,
  })
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n")}\n---\n\n${doc.body}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${doc.date}-${doc.slug || "draft"}.md`;
  link.click();
  URL.revokeObjectURL(url);
  notice("본문을 내려받았습니다. 첨부 이미지는 비공개 초안에 보관됩니다.");
});

async function refreshDrafts() {
  drafts = (await api<{ drafts: typeof drafts }>("/api/drafts")).drafts;
  renderList();
}
function renderList() {
  element<HTMLInputElement>("search").placeholder = showingPosts ? "글 주소로 검색" : "제목으로 검색";
  const search = element<HTMLInputElement>("search").value.toLowerCase();
  const container = element("post-list");
  container.replaceChildren();
  const items = showingPosts
    ? (posts ?? []).map((post) => ({
        label: post.path.split("/").at(-1)!.replace(/\.md$/, ""),
        detail: post.path.split("/").slice(1, -1).join(" / "),
        action: () => openPost(post.path),
        selected: current?.document.sourcePath === post.path,
      }))
    : drafts.map((draft) => ({
        label: draft.title || "제목 없는 글",
        detail: `${draft.sourcePath ? "수정 중" : "비공개 초안"} · ${new Date(draft.updated).toLocaleDateString("ko-KR")}`,
        action: () => openDraft(draft.id),
        selected: current?.id === draft.id,
      }));
  for (const item of items.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(search))) {
    const button = document.createElement("button");
    button.className = "post-item";
    button.setAttribute("aria-current", String(item.selected));
    const label = document.createElement("strong");
    label.textContent = item.label;
    const detail = document.createElement("small");
    detail.textContent = item.detail;
    button.append(label, detail);
    button.addEventListener("click", () => void item.action().catch(report));
    container.append(button);
  }
  if (!container.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = search ? "검색 결과가 없습니다." : showingPosts ? "불러온 글이 없습니다." : "아직 초안이 없습니다.";
    container.append(empty);
  }
}
async function openDraft(id: string) {
  if (switching) return;
  switching = true;
  try {
    if (!(await leave())) return;
    showDraft(await api<Draft>(`/api/drafts/${id}`));
  } finally {
    switching = false;
  }
}
async function openPost(path: string) {
  if (switching) return;
  switching = true;
  try {
    if (!(await leave())) return;
    showDraft(await api<Draft>("/api/posts/open", { method: "POST", body: JSON.stringify({ path }) }));
    await refreshDrafts();
  } finally {
    switching = false;
  }
}
element("search").addEventListener("input", renderList);
element("draft-tab").addEventListener("click", () => {
  showingPosts = false;
  element("draft-tab").setAttribute("aria-pressed", "true");
  element("post-tab").setAttribute("aria-pressed", "false");
  void refreshDrafts().catch(report);
});
element("post-tab").addEventListener("click", () => {
  showingPosts = true;
  element("draft-tab").setAttribute("aria-pressed", "false");
  element("post-tab").setAttribute("aria-pressed", "true");
  void (async () => {
    if (!posts) {
      status("기존 글 불러오는 중…");
      posts = (await api<{ posts: NonNullable<typeof posts> }>("/api/posts")).posts;
      status("기존 글을 불러왔습니다");
    }
    renderList();
  })().catch(report);
});
element("new-post").addEventListener(
  "click",
  () =>
    void (async () => {
      if (switching) return;
      if (!category.value) {
        status("카테고리를 추가한 뒤 새 글을 작성해 주세요.");
        return;
      }
      switching = true;
      try {
        if (!(await leave())) return;
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const document: PostDocument = {
          title: "",
          description: "",
          date,
          slug: "",
          category: category.value,
          tags: [],
          body: "",
          metadata: {},
          sourcePath: null,
          sourceSha: null,
        };
        showDraft(await api<Draft>("/api/drafts", { method: "POST", body: JSON.stringify({ document }) }));
        showingPosts = false;
        element("draft-tab").setAttribute("aria-pressed", "true");
        element("post-tab").setAttribute("aria-pressed", "false");
        await refreshDrafts();
        view(false);
        title.focus();
      } finally {
        switching = false;
      }
    })().catch(report)
);

async function attach(file: File) {
  if (!current || locked) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 1024 * 1024)
    throw new Error("1MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요.");
  await save();
  setLocked(true);
  status("이미지 저장 중…");
  try {
    const result = await api<{ url: string }>(`/api/drafts/${current.id}/media`, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const alt = file.name.replace(/[\[\]\\\n]/g, "");
    body.setRangeText(`\n![${alt}](${result.url})\n`, body.selectionStart, body.selectionEnd, "end");
    scheduleSave();
  } finally {
    setLocked(false);
  }
}
element("attach").addEventListener("click", () => element<HTMLInputElement>("image-file").click());
element("image-file").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) void attach(input.files[0]).catch(report);
  input.value = "";
});
body.addEventListener("paste", (event) => {
  const file = [...(event.clipboardData?.items ?? [])].find((item) => item.type.startsWith("image/"))?.getAsFile();
  if (file) {
    event.preventDefault();
    void attach(file).catch(report);
  }
});
body.addEventListener("dragover", (event) => {
  if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
});
body.addEventListener("drop", (event) => {
  if (event.dataTransfer?.files.length) {
    event.preventDefault();
    void attach(event.dataTransfer.files[0]).catch(report);
  }
});
const dialog = element<HTMLDialogElement>("publish-dialog");
element("publish").addEventListener("click", () => dialog.showModal());
dialog.addEventListener("close", () => {
  if (dialog.returnValue !== "publish" || !current || locked) return;
  void (async () => {
    await save();
    if (dirty) await save();
    setLocked(true);
    status("발행 중…");
    try {
      const result = await api<{ draft: Draft; workflowUrl: string }>(`/api/drafts/${current!.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ version: current!.version }),
      });
      showDraft(result.draft);
      posts = null;
      notice("글을 발행했습니다. 블로그에 반영되는 중입니다. ");
      const link = document.createElement("a");
      link.href = result.workflowUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "배포 상태 확인";
      element("notice").append(link);
      await refreshDrafts();
      status("발행 완료 · 사이트 반영 대기");
    } finally {
      setLocked(false);
    }
  })().catch(report);
});
element("logout").addEventListener(
  "click",
  () =>
    void (async () => {
      if (!manager.canLogout() || !(await leave())) return;
      await api("/api/logout", { method: "POST" });
      sessionStorage.removeItem(sessionKey);
      sessionToken = "";
      current = null;
      dirty = false;
      location.reload();
    })().catch(report)
);

async function start() {
  element<HTMLAnchorElement>("login-link").href = apiBase ? `${apiBase}/auth/login?editor=site` : "/auth/login";
  try {
    const session = await api<{ csrf: string }>("/api/session");
    csrf = session.csrf;
    element("workspace").hidden = false;
    element("admin-nav").hidden = false;
    element("logout").hidden = false;
    status("연결됨");
    await refreshDrafts();
    void manager.load();
  } catch (error) {
    element("login-screen").hidden = false;
    status("관리자 로그인");
    const login = new URLSearchParams(location.search).get("login");
    const message = element("login-message");
    if (login) {
      message.textContent = login === "owner-only" ? "0xnefertt 본인 계정으로 로그인해 주세요." : "로그인을 완료하지 못했습니다. 다시 시도해 주세요.";
      history.replaceState(null, "", location.pathname);
    }
    if (!(error instanceof ApiError) || error.status !== 401) {
      message.textContent = error instanceof Error ? error.message : "서버에 연결할 수 없습니다.";
      if (error instanceof ApiError && error.status === 503) element("login-link").hidden = true;
    }
  }
}
element("login-link").addEventListener("click", (event) => {
  if (!apiBase) return;
  event.preventDefault();
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(loginNonceKey, nonce);
  location.href = `${apiBase}/auth/login?editor=site&client_state=${encodeURIComponent(nonce)}`;
});
void start();
