import DOMPurify from "dompurify";
import { marked } from "marked";
import { documentCollection, profileMetadata, renderPost, type Draft, type PostDocument, type ContentCollection } from "./model";
import { collectionEditor } from "./collection-editor";
import { safeImage } from "./rich-content";
import { siteManager } from "./site-manager";
import { richEditor } from "./rich-editor";
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
let selectedCollection: ContentCollection = "blog";
const contentLabels = { blog: "글", books: "책", projects: "프로젝트", about: "소개" };

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
const manager = siteManager(api, leave, selectCollection);
const composer = richEditor({
  onChange: scheduleSave,
  onComposition: (active) => {
    clearTimeout(timer);
    if (active) status("작성 중…");
  },
  upload: attach,
  imageSrc,
  report,
});
const details = collectionEditor(scheduleSave);

function configureCollection(kind: ContentCollection) {
  const label = contentLabels[kind];
  const object = kind === "projects" || kind === "about" ? `${label}를` : `${label}을`;
  element("workspace").dataset.collection = kind;
  element("new-post").textContent = kind === "books" ? "＋ 새 책 기록" : kind === "projects" ? "＋ 새 프로젝트 작성" : "＋ 새 글 쓰기";
  element<HTMLButtonElement>("new-post").disabled = kind === "blog" && !category.value;
  element("library-search-label").textContent = `${label} 찾기`;
  element("post-tab").textContent = `기존 ${label}`;
  element("empty-kind").textContent = kind.toUpperCase();
  element("empty-heading").textContent = `${object} 선택하세요`;
  element("empty-description").textContent = `새 ${object} 작성하거나 목록에서 수정할 항목을 선택하세요.`;
  element("title-label").textContent = kind === "books" ? "책 제목" : kind === "projects" ? "프로젝트 이름" : "게시글 제목";
  element("blog-category-field").hidden = kind !== "blog";
  element("blog-date-field").hidden = kind !== "blog";
  element("title-row").hidden = kind === "about";
  element("extra-settings").hidden = kind === "about";
  element("description-label").textContent = kind === "about" ? "검색 결과에 표시할 소개" : "한 줄 요약";
  element("cover-attach").textContent = kind === "about" ? "프로필 사진 첨부" : "표지 이미지 첨부";
  element("extra-settings-heading").textContent = kind === "blog" ? "추가 정보 · 태그, 날짜, 주소" : "추가 정보 · 태그, 주소";
  description.placeholder =
    kind === "books"
      ? "독서 기록을 짧게 요약하세요 (선택)"
      : kind === "projects"
        ? "프로젝트를 짧게 소개하세요"
        : kind === "about"
          ? "블로그와 작성자를 짧게 소개하세요"
          : "글의 내용을 짧게 요약하세요";
  element("collection-settings").hidden = kind === "blog";
  element("collection-settings-heading").textContent =
    kind === "books"
      ? "도서 정보 · 저자, 표지, 독서 상태"
      : kind === "about"
        ? "프로필 · 이름, 소개, 사진"
        : "프로젝트 정보 · 이미지, 분류 등 (선택)";
  element<HTMLDetailsElement>("collection-settings").open = kind !== "projects";
  element("publish-heading").textContent = kind === "about" ? "소개와 프로필을 반영할까요?" : `이 ${object} 발행할까요?`;
  element("publish").textContent = kind === "about" ? "소개 반영하기" : "발행하기";
  element("library-note").textContent = `초안은 자동으로 비공개 저장됩니다. 발행하면 ${
    kind === "books" ? "책장" : kind === "projects" ? "프로젝트 페이지" : "블로그"
  }에 공개됩니다.`;
}
async function selectCollection(kind: ContentCollection): Promise<boolean> {
  if (switching) return false;
  if (selectedCollection === kind) return true;
  switching = true;
  const menus = ["posts", "books", "projects", "about", "categories", "favorites"].map((item) => element<HTMLButtonElement>(`manage-${item}`));
  menus.forEach((button) => {
    button.disabled = true;
  });
  try {
    const result = await api<{ drafts: typeof drafts }>(`/api/drafts?collection=${kind}`);
    const existingAbout = result.drafts.find((draft) => draft.sourcePath === "_pages/about.md");
    const aboutDraft =
      kind === "about"
        ? existingAbout
          ? await api<Draft>(`/api/drafts/${existingAbout.id}`)
          : await api<Draft>("/api/posts/open", { method: "POST", body: JSON.stringify({ path: "_pages/about.md" }) })
        : null;
    selectedCollection = kind;
    current = null;
    dirty = false;
    conflict = false;
    clearTimeout(timer);
    drafts = result.drafts;
    posts = null;
    showingPosts = false;
    element<HTMLInputElement>("search").value = "";
    element("draft-tab").setAttribute("aria-pressed", "true");
    element("post-tab").setAttribute("aria-pressed", "false");
    element("editor").hidden = true;
    element("empty").hidden = false;
    configureCollection(kind);
    details.load(kind, {});
    if (aboutDraft) showDraft(aboutDraft);
    renderList();
    status(aboutDraft ? "모든 변경사항 저장됨" : "연결됨");
    return true;
  } catch (error) {
    report(error);
    return false;
  } finally {
    switching = false;
    menus.forEach((button) => {
      button.disabled = false;
    });
  }
}
async function imageSrc(source: string): Promise<string> {
  if (source.startsWith("/assets/")) return `https://0xnefertt.github.io${source}`;
  if (!source.startsWith("/api/media/")) return source;
  if (!mediaUrls.has(source))
    mediaUrls.set(
      source,
      fetch(`${apiBase}${source}`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
        credentials: apiBase ? "omit" : "same-origin",
      }).then(async (response) => {
        if (!response.ok) throw new Error("이미지를 불러오지 못했습니다.");
        return URL.createObjectURL(await response.blob());
      })
    );
  return mediaUrls.get(source)!;
}

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
  status(element("editor").hidden ? message : "저장 확인 필요");
  notice(message);
}
function read(): PostDocument {
  return {
    ...current!.document,
    collection: selectedCollection,
    metadata: details.read(current!.document.metadata),
    title: title.value,
    description: description.value,
    body: composer.getBody(),
    category: selectedCollection === "blog" ? category.value : "",
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
  composer.setLocked(value);
  details.setLocked(value);
  for (const id of ["save", "publish", "attach", "source-attach", "cover-attach", "new-post", "logout"])
    element<HTMLButtonElement>(id).disabled = value;
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
  selectedCollection = documentCollection(doc);
  configureCollection(selectedCollection);
  details.load(selectedCollection, doc.metadata);
  title.value = doc.title;
  description.value = doc.description;
  composer.load(doc.body);
  date.value = doc.date;
  tags.value = doc.tags.join(", ");
  slug.value = doc.slug;
  if (selectedCollection === "blog" && ![...category.options].some((item) => item.value === doc.category))
    category.add(new Option(doc.category, doc.category));
  category.value = doc.category;
  slug.disabled = Boolean(doc.sourcePath);
  date.disabled = Boolean(doc.sourcePath);
  category.disabled = false;
  element("empty").hidden = true;
  element("editor").hidden = false;
  element("notice").hidden = true;
  element("document-state").textContent = doc.sourcePath ? "수정 중 · 발행 전까지 비공개" : "비공개 초안";
  status("모든 변경사항 저장됨");
  view(false);
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
  if (!current) return;
  dirty = true;
  status(composer.isComposing() ? "작성 중…" : "저장 대기 중");
  clearTimeout(timer);
  if (composer.isComposing()) return;
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
        .replace(/-+/g, "-") ||
      `${selectedCollection === "books" ? "book" : selectedCollection === "projects" ? "project" : "post"}-${current!.id.slice(0, 8)}`;
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
  element("word-count").textContent = `${composer.characters().toLocaleString()}자`;
  if (element("preview-panel").hidden) return;
  element("preview-title").textContent = title.value || "제목 없는 글";
  const metadata = details.read(current.document.metadata);
  const profile = profileMetadata(metadata);
  if (selectedCollection === "about") element("preview-title").textContent = String(profile.name ?? "0xnefertt");
  element("preview-date").textContent =
    selectedCollection === "blog"
      ? `${date.value} · 0xnefertt`
      : selectedCollection === "books"
        ? [metadata.author, metadata.status, metadata.stars !== undefined ? `${metadata.stars}/5` : ""].filter(Boolean).join(" · ")
        : selectedCollection === "about"
          ? String(profile.location ?? "Vancouver, Canada")
          : [metadata.category, metadata.status, metadata.period, metadata.role].filter(Boolean).join(" · ");
  const cover = element<HTMLImageElement>("preview-cover");
  cover.alt = selectedCollection === "about" ? "프로필 사진 미리보기" : "표지 미리보기";
  let image = String(selectedCollection === "about" ? profile.image ?? "" : metadata[selectedCollection === "books" ? "cover" : "img"] ?? "");
  if (image.startsWith("assets/")) image = "/" + image;
  if (image && !image.includes("/")) image = "/assets/img/" + image;
  cover.hidden = selectedCollection === "blog" || !safeImage(image);
  cover.classList.toggle("preview-avatar", selectedCollection === "about");
  cover.dataset.source = image;
  if (!cover.hidden)
    void imageSrc(image)
      .then((url) => {
        if (cover.dataset.source === image) cover.src = url;
      })
      .catch(() => {
        cover.hidden = true;
      });
  for (const [id, value] of [
    ["preview-bio", profile.bio ?? "개발하며 배운 것, 캐나다에서의 일상, 관심 있는 것들을 기록합니다."],
    ["preview-subtitle", metadata.subtitle ?? ""],
  ]) {
    element(id as string).hidden = selectedCollection !== "about";
    element(id as string).textContent = String(value);
  }
  element("preview-profile-info").hidden = selectedCollection !== "about";
  element("preview-profile-info").innerHTML = selectedCollection === "about" ? DOMPurify.sanitize(String(profile.more_info ?? "")) : "";
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
  element("preview-body").innerHTML = DOMPurify.sanitize(marked.parse(composer.getBody(), { async: false }) as string, {
    FORBID_TAGS: ["form", "input", "button", "style", "iframe"],
  });
  for (const img of element("preview-body").querySelectorAll("img")) {
    const source = img.getAttribute("src") ?? "";
    if (source.startsWith("/api/media/")) img.removeAttribute("src");
    void imageSrc(source)
      .then((url) => {
        if (img.isConnected) img.src = url;
      })
      .catch(() => {
        img.alt = "이미지를 불러오지 못했습니다.";
      });
  }
}
function view(preview: boolean) {
  element("write-panel").hidden = preview;
  element("source-attach").hidden = preview || !composer.isSource();
  element("preview-panel").hidden = !preview;
  element("write-tab").setAttribute("aria-pressed", String(!preview && !composer.isSource()));
  element("source-tab").setAttribute("aria-pressed", String(!preview && composer.isSource()));
  element("preview-tab").setAttribute("aria-pressed", String(preview));
  if (preview) updatePreview();
}
element("write-tab").addEventListener("click", () => view(false));
element("source-tab").addEventListener("click", () => view(false));
element("preview-tab").addEventListener("click", () => view(true));
element("save").addEventListener("click", () => void save().catch(() => {}));
element("download").addEventListener("click", () => {
  if (!current) return;
  const doc = read();
  const content = renderPost(doc, new Map(), true);
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${selectedCollection === "blog" ? doc.date + "-" : ""}${doc.slug || "draft"}.md`;
  link.click();
  URL.revokeObjectURL(url);
  notice("본문을 내려받았습니다. 첨부 이미지는 비공개 초안에 보관됩니다.");
});

async function refreshDrafts() {
  drafts = (await api<{ drafts: typeof drafts }>(`/api/drafts?collection=${selectedCollection}`)).drafts;
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
      status(`기존 ${contentLabels[selectedCollection]} 불러오는 중…`);
      posts = (await api<{ posts: NonNullable<typeof posts> }>(`/api/posts?collection=${selectedCollection}`)).posts;
      status(`기존 ${selectedCollection === "projects" ? "프로젝트를" : contentLabels[selectedCollection] + "을"} 불러왔습니다`);
    }
    renderList();
  })().catch(report);
});
element("new-post").addEventListener(
  "click",
  () =>
    void (async () => {
      if (switching) return;
      if (selectedCollection === "blog" && !category.value) {
        status("카테고리를 추가한 뒤 새 글을 작성해 주세요.");
        return;
      }
      switching = true;
      try {
        if (!(await leave())) return;
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const document: PostDocument = {
          collection: selectedCollection,
          title: "",
          description: "",
          date,
          slug: "",
          category: selectedCollection === "blog" ? category.value : "",
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

async function attach(file: File, target: "body" | "cover" | "img" | "profile.image" = "body") {
  if (!current || locked) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 1024 * 1024)
    throw new Error("1MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요.");
  setLocked(true);
  status("이미지 저장 중…");
  try {
    await save();
    const result = await api<{ url: string }>(`/api/drafts/${current.id}/media`, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const alt = file.name.replace(/[\[\]\\\n]/g, "");
    if (target === "body") composer.insertImage(result.url, alt);
    else details.setImage(target, result.url);
    scheduleSave();
  } finally {
    setLocked(false);
  }
}
element("attach").addEventListener("click", () => element<HTMLInputElement>("image-file").click());
element("source-attach").addEventListener("click", () => element<HTMLInputElement>("image-file").click());
element("cover-attach").addEventListener("click", () => element<HTMLInputElement>("cover-image-file").click());
element("cover-image-file").addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0])
    void attach(input.files[0], selectedCollection === "books" ? "cover" : selectedCollection === "about" ? "profile.image" : "img").catch(report);
  input.value = "";
});
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
      notice(
        selectedCollection === "about"
          ? "소개와 프로필을 발행했습니다. 블로그에 반영되는 중입니다. "
          : "글을 발행했습니다. 블로그에 반영되는 중입니다. "
      );
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
