import {
  categoryName,
  categoryOptions,
  writableCategoryOptions,
  validateSettings,
  type CategoryChild,
  type SettingsSnapshot,
  type SiteSettings,
} from "./site-settings";
import type { ContentCollection } from "./model";

type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
const sections = ["posts", "books", "projects", "about", "site", "description", "resources", "privacy", "categories", "favorites"] as const;
type SettingField = {
  path: string;
  label: string;
  type?: "textarea" | "number" | "checkbox" | "list";
  max?: number;
  min?: number;
  limit?: number;
  note?: string;
};
const settingFields: Record<"site" | "resources" | "privacy", SettingField[]> = {
  site: [
    { path: "siteTitle", label: "사이트 이름 · 로고 텍스트, Footer", max: 100 },
    { path: "blogName", label: "블로그 제목", max: 100 },
    { path: "email", label: "이메일", max: 254, note: "비워 두면 Footer와 Privacy의 이메일 링크를 숨깁니다." },
    { path: "githubUrl", label: "GitHub 링크", max: 2000 },
    { path: "xUrl", label: "X 링크", max: 2000 },
    { path: "defaultOgImage", label: "공유 기본 이미지 주소", max: 2000, note: "이미지 주소 또는 /assets/ 경로. 비워 두면 파비콘을 사용합니다." },
    { path: "latestPostsLimit", label: "홈 화면 최근 글 수", type: "number", min: 1, limit: 20 },
  ],
  resources: [
    { path: "resourcesDescription", label: "Resources 영어 소개", type: "textarea", max: 500 },
    { path: "resourcesDescriptionKo", label: "Resources 한국어 소개", type: "textarea", max: 500 },
    { path: "usefulInfo.enabled", label: "Useful Info 표시", type: "checkbox" },
    { path: "usefulInfo.location", label: "날씨 지역 이름", max: 100 },
    { path: "usefulInfo.latitude", label: "위도", type: "number", min: -90, limit: 90 },
    { path: "usefulInfo.longitude", label: "경도", type: "number", min: -180, limit: 180 },
    { path: "usefulInfo.baseCurrency", label: "기준 통화", max: 3, note: "USD, CAD, KRW 같은 3자리 통화 코드" },
    { path: "usefulInfo.targetCurrencies", label: "비교 통화", type: "list", max: 100, note: "쉼표로 구분하세요. 예: KRW, CAD" },
  ],
  privacy: [
    { path: "privacy.body", label: "Privacy 영어 본문", type: "textarea", max: 30000 },
    { path: "privacy.bodyKo", label: "Privacy 한국어 본문", type: "textarea", max: 30000 },
  ],
};
export function siteManager(api: Api, leave: () => Promise<boolean>, selectContent: (kind: ContentCollection) => Promise<boolean>) {
  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  let settings: SiteSettings | null = null;
  let sha = "";
  let usage: Record<string, number> = {};
  let changed = false;
  let busy = false;
  let savedPaths = new Set<string>();
  let section: (typeof sections)[number] = "posts";
  const expanded = new WeakSet<object>();
  const message = (value: string) => {
    el("settings-status").textContent = value;
  };
  function dirty() {
    changed = true;
    message("변경사항이 있습니다. 저장하면 블로그에 반영됩니다.");
    el<HTMLButtonElement>("settings-save").disabled = busy;
  }
  function refreshOptions(allowDefault = true) {
    if (!settings) return;
    const select = el<HTMLSelectElement>("category");
    const parent = el<HTMLSelectElement>("category-parent");
    const value = select.value;
    const locale = el<HTMLSelectElement>("content-language").value === "ko" ? "ko" : "en";
    const wasEmpty = allowDefault && !value && (!parent.value || el("editor").hidden);
    const parentSlug = value.split("/")[0] || parent.value || settings.categories[0]?.slug || "";
    parent.replaceChildren(...settings.categories.map((group) => new Option(categoryName(group, locale), group.slug)));
    if (parentSlug && !settings.categories.some((group) => group.slug === parentSlug)) {
      const legacy = new Option(`${parentSlug} · 기존 분류`, parentSlug);
      legacy.disabled = true;
      parent.add(legacy);
    }
    parent.value = parentSlug;
    const options = writableCategoryOptions(settings, locale).filter((option) => option.value.startsWith(`${parentSlug}/`));
    select.replaceChildren(new Option("하위 분류를 선택하세요", ""), ...options.map((item) => new Option(item.label, item.value)));
    if (value && !options.some((item) => item.value === value)) {
      const legacy = new Option(`${value} · 하위 분류 선택 필요`, value);
      legacy.disabled = true;
      select.add(legacy);
    }
    select.value = value || (wasEmpty ? options[0]?.value ?? "" : "");
    updateNewButton();
  }
  function updateNewButton() {
    el<HTMLButtonElement>("new-post").disabled =
      el("workspace").dataset.collection === "blog" &&
      (!settings || !writableCategoryOptions(settings).some((option) => option.value === el<HTMLSelectElement>("category").value));
  }
  el("category-parent").addEventListener("change", () => {
    const select = el<HTMLSelectElement>("category");
    select.value = "";
    refreshOptions(false);
    select.dispatchEvent(new select.ownerDocument.defaultView!.Event("input", { bubbles: true }));
  });
  el("category").addEventListener("change", updateNewButton);
  function apply(snapshot: SettingsSnapshot) {
    settings = validateSettings(snapshot.settings);
    sha = snapshot.sha;
    usage = snapshot.usage;
    savedPaths = new Set(categoryOptions(settings).map((item) => item.value));
    changed = false;
    render();
    refreshOptions();
    message("저장된 설정을 불러왔습니다.");
  }
  async function load() {
    if (busy) return;
    busy = true;
    el<HTMLFieldSetElement>("settings-fields").disabled = true;
    el<HTMLButtonElement>("settings-save").disabled = true;
    try {
      apply(await api<SettingsSnapshot>("/api/site-settings"));
    } catch (error) {
      message(error instanceof Error ? error.message : "설정을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.");
    } finally {
      busy = false;
      el<HTMLFieldSetElement>("settings-fields").disabled = !settings;
      el<HTMLButtonElement>("settings-save").disabled = !changed;
    }
  }
  function input(
    label: string,
    value: string,
    update: (value: string) => void,
    options: { readonly?: boolean; max?: number; placeholder?: string } = {}
  ) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const field = document.createElement("input");
    field.value = value;
    field.maxLength = options.max ?? 100;
    field.readOnly = options.readonly ?? false;
    field.placeholder = options.placeholder ?? "";
    field.addEventListener("input", () => {
      update(field.value);
      dirty();
    });
    wrapper.append(field);
    return wrapper;
  }
  function action(label: string, callback: () => void, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", () => {
      callback();
      dirty();
      render();
    });
    return button;
  }
  function order<T>(values: T[], index: number, title: string, canRemove = true) {
    const controls = document.createElement("div");
    controls.className = "row-actions";
    const move = (amount: number) => {
      const [value] = values.splice(index, 1);
      values.splice(index + amount, 0, value);
    };
    const up = action("↑", () => move(-1), index === 0);
    up.setAttribute("aria-label", `${title} 위로`);
    const down = action("↓", () => move(1), index === values.length - 1);
    down.setAttribute("aria-label", `${title} 아래로`);
    const remove = action("삭제", () => values.splice(index, 1), !canRemove);
    remove.setAttribute("aria-label", `${title} 삭제`);
    controls.append(up, down, remove);
    return controls;
  }
  function groupShell(group: object, name: string, count: string, index: number) {
    const card = document.createElement("details");
    card.className = "manager-group";
    const summary = document.createElement("summary");
    summary.textContent = `${name || "새 그룹"} · ${count}`;
    card.open = expanded.has(group) || index === 0;
    card.addEventListener("toggle", () => {
      if (card.open) expanded.add(group);
      else expanded.delete(group);
    });
    const content = document.createElement("div");
    content.className = "manager-group-body";
    card.append(summary, content);
    return { card, content, summary };
  }
  function categoryRow(value: CategoryChild, path: string, groupSlug?: string) {
    const row = document.createElement("div");
    row.className = "category-row";
    const name = input("영어 이름", value.name, (next) => {
      value.name = next;
    });
    const koreanName = input(
      "한국어 이름",
      value.name_ko ?? "",
      (next) => {
        value.name_ko = next;
      },
      { placeholder: "비워 두면 영어 이름을 표시합니다." }
    );
    const slug = input(
      "주소",
      value.slug,
      (next) => {
        value.slug = next;
      },
      { readonly: savedPaths.has(path), max: 60, placeholder: "영문 소문자·숫자·하이픈" }
    );
    const slugField = slug.querySelector("input")!;
    name.querySelector("input")!.addEventListener("blur", () => {
      if (!value.slug) {
        value.slug = value.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        slugField.value = value.slug;
      }
    });
    const note = document.createElement("small");
    note.textContent = savedPaths.has(path)
      ? `${groupSlug ? `${groupSlug}/` : ""}${value.slug} · 글/초안 ${usage[path] ?? 0}개`
      : "저장 후 주소는 고정됩니다.";
    row.append(name, koreanName, slug, note);
    return row;
  }
  function renderCategories() {
    const container = el("category-groups");
    container.replaceChildren();
    if (!settings) return;
    settings.categories.forEach((group, index) => {
      const { card, content, summary } = groupShell(group, categoryName(group, "ko"), `하위 ${group.children.length}개`, index);
      const parentRow = categoryRow(group, group.slug);
      parentRow.addEventListener("input", () => {
        summary.textContent = `${categoryName(group, "ko") || "새 그룹"} · 하위 ${group.children.length}개`;
      });
      parentRow.append(order(settings!.categories, index, `${group.name || "상위 카테고리"} 카테고리`, !usage[group.slug]));
      content.append(parentRow);
      group.children.forEach((child, childIndex) => {
        const path = `${group.slug}/${child.slug}`;
        const row = categoryRow(child, path, group.slug);
        row.classList.add("child-row");
        row.append(order(group.children, childIndex, `${child.name || "하위 카테고리"} 카테고리`, !usage[path]));
        content.append(row);
      });
      content.append(
        action("＋ 하위 카테고리 추가", () => {
          group.children.push({ name: "", slug: "" });
          expanded.add(group);
        })
      );
      container.append(card);
    });
  }
  function renderFavorites() {
    const container = el("favorite-groups");
    container.replaceChildren();
    if (!settings) return;
    settings.favorites.forEach((group, index) => {
      const { card, content, summary } = groupShell(group, group.name, `링크 ${group.items.length}개`, index);
      const heading = document.createElement("div");
      heading.className = "manager-group-heading";
      const name = input("그룹 이름", group.name, (next) => {
        group.name = next;
        summary.textContent = `${next || "새 그룹"} · 링크 ${group.items.length}개`;
      });
      heading.append(name, order(settings!.favorites, index, `${group.name || "즐겨찾기"} 그룹`));
      content.append(heading);
      group.items.forEach((item, itemIndex) => {
        const row = document.createElement("div");
        row.className = "favorite-row";
        row.append(
          input("링크 이름", item.title, (next) => (item.title = next), { max: 200 }),
          input("링크 주소", item.href, (next) => (item.href = next), { max: 2000, placeholder: "https://example.com" }),
          input("설명 (선택)", item.note ?? "", (next) => (item.note = next), { max: 500 }),
          order(group.items, itemIndex, `${item.title || "링크"}`)
        );
        content.append(row);
      });
      content.append(
        action("＋ 링크 추가", () => {
          group.items.push({ href: "", title: "" });
          expanded.add(group);
        })
      );
      container.append(card);
    });
  }
  function renderSettingsFields() {
    if (!settings) return;
    for (const [panel, fields] of Object.entries(settingFields)) {
      const container = el(`${panel}-fields`);
      container.replaceChildren();
      for (const field of fields) {
        const keys = field.path.split(".");
        const key = keys.pop()!;
        const parent = keys.reduce((value, key) => value[key] as Record<string, unknown>, settings as unknown as Record<string, unknown>);
        const label = document.createElement("label");
        label.textContent = field.label;
        const control = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        control.id = `setting-${field.path.replaceAll(".", "-")}`;
        if (control.tagName === "TEXTAREA") {
          const textarea = control as HTMLTextAreaElement;
          textarea.rows = panel === "privacy" ? 16 : 3;
          textarea.maxLength = field.max ?? 500;
        } else {
          const input = control as HTMLInputElement;
          input.type = field.type === "checkbox" ? "checkbox" : field.type === "number" ? "number" : "text";
          input.maxLength = field.max ?? 500;
          if (field.type === "checkbox") input.checked = parent[key] === true;
          if (field.type === "number") {
            input.min = String(field.min);
            input.max = String(field.limit);
            input.step = field.path === "latestPostsLimit" ? "1" : "any";
          }
        }
        control.value = Array.isArray(parent[key]) ? (parent[key] as string[]).join(", ") : String(parent[key]);
        control.addEventListener("input", () => {
          parent[key] =
            field.type === "checkbox"
              ? (control as HTMLInputElement).checked
              : field.type === "number"
                ? control.value.trim()
                  ? Number(control.value)
                  : NaN
                : field.type === "list"
                  ? control.value.split(/[,\s]+/).filter(Boolean)
                  : control.value;
          dirty();
        });
        label.append(control);
        if (field.note) {
          const note = document.createElement("small");
          note.textContent = field.note;
          label.append(note);
        }
        container.append(label);
      }
    }
    el("privacy-updated").textContent = settings.privacy.updated;
    el("admin-site-title").textContent = settings.siteTitle;
    document.title = `Admin · ${settings.siteTitle}`;
  }
  function render() {
    if (settings) {
      el<HTMLTextAreaElement>("blog-description-en").value = settings.blogDescription;
      el<HTMLTextAreaElement>("blog-description-ko").value = settings.blogDescriptionKo;
    }
    renderSettingsFields();
    renderCategories();
    renderFavorites();
  }
  async function show(next: typeof section) {
    if (!(await leave())) return;
    const content = next === "posts" || next === "books" || next === "projects" || next === "about";
    if (content && !(await selectContent(next === "posts" ? "blog" : next))) return;
    section = next;
    el("workspace").hidden = !content;
    el("settings-panel").hidden = content;
    el("category-manager").hidden = next !== "categories";
    el("favorites-manager").hidden = next !== "favorites";
    el("blog-description-manager").hidden = next !== "description";
    for (const panel of ["site", "resources", "privacy"]) el(`${panel}-manager`).hidden = next !== panel;
    for (const item of sections) el(`manage-${item}`).setAttribute("aria-pressed", String(item === next));
    const titles: Record<string, string> = {
      site: "사이트 설정",
      description: "블로그 소개",
      resources: "Resources",
      privacy: "Privacy",
      categories: "카테고리",
      favorites: "즐겨찾기",
    };
    el("manager-heading").textContent = titles[next] ?? "";
    el("manager-description").textContent =
      next === "site"
        ? "사이트 이름과 연락처, 공유 이미지, 홈 화면을 설정하세요. 저장하면 사이트 전체에 함께 적용됩니다."
        : next === "resources"
          ? "Resources 소개와 날씨 지역, 환율 표시를 관리하세요. 즐겨찾기 링크는 즐겨찾기 메뉴에서 수정합니다."
          : next === "privacy"
            ? "개인정보 안내 본문을 영어·한국어별로 수정하세요. Markdown으로 제목과 링크를 작성할 수 있습니다. 이메일은 사이트 설정을 사용하고, 본문을 변경하면 수정일이 갱신됩니다."
            : next === "description"
              ? "랜딩 페이지와 블로그 상단의 소개 문구를 영어·한국어별로 설정하세요. 소개·프로필의 자기소개 글과는 별개입니다. 저장하고 반영하면 사이트에 적용됩니다."
              : next === "categories"
                ? "영어·한국어 이름과 순서를 따로 설정하세요. 이름을 바꿔도 주소는 유지됩니다. 글이 있는 카테고리는 삭제할 수 없으며, 새 카테고리는 글을 발행하면 블로그에 표시됩니다."
                : "Resources에 표시할 그룹과 링크를 관리하세요. 순서는 위·아래 버튼으로 변경합니다. 빈 그룹은 Resources에 표시되지 않습니다.";
  }
  for (const item of sections) el(`manage-${item}`).addEventListener("click", () => void show(item));
  for (const [id, field] of [
    ["blog-description-en", "blogDescription"],
    ["blog-description-ko", "blogDescriptionKo"],
  ] as const) {
    el<HTMLTextAreaElement>(id).addEventListener("input", () => {
      if (!settings) return;
      settings[field] = el<HTMLTextAreaElement>(id).value;
      dirty();
    });
  }
  el("add-category").addEventListener("click", () => {
    if (!settings) return;
    const group = { children: [], name: "", slug: "" };
    settings.categories.push(group);
    expanded.add(group);
    dirty();
    render();
  });
  el("add-favorite-group").addEventListener("click", () => {
    if (!settings) return;
    const group = { items: [], name: "" };
    settings.favorites.push(group);
    expanded.add(group);
    dirty();
    render();
  });
  el("settings-reload").addEventListener("click", () => {
    if (busy) return;
    if (!changed || window.confirm("저장하지 않은 설정을 버리고 다시 불러올까요?")) void load();
  });
  el("settings-download").addEventListener("click", () => {
    if (!settings) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "site-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  });
  el("settings-save").addEventListener(
    "click",
    () =>
      void (async () => {
        if (busy || !settings || !changed) return;
        try {
          const validated = validateSettings(settings);
          busy = true;
          el<HTMLFieldSetElement>("settings-fields").disabled = true;
          el<HTMLButtonElement>("settings-save").disabled = true;
          message("설정을 저장하는 중입니다…");
          const result = await api<SettingsSnapshot & { workflowUrl: string }>("/api/site-settings", {
            method: "PUT",
            body: JSON.stringify({ settings: validated, sha }),
          });
          apply(result);
          message("설정을 저장했습니다. 블로그에 반영되기까지 잠시 걸릴 수 있습니다. ");
          const link = document.createElement("a");
          link.href = result.workflowUrl;
          link.textContent = "반영 상태 확인";
          link.target = "_blank";
          link.rel = "noreferrer";
          el("settings-status").append(link);
        } catch (error) {
          message(error instanceof Error ? error.message : "저장하지 못했습니다. 내용을 내려받은 뒤 다시 불러와 주세요.");
        } finally {
          busy = false;
          el<HTMLFieldSetElement>("settings-fields").disabled = !settings;
          el<HTMLButtonElement>("settings-save").disabled = !changed;
        }
      })()
  );
  return {
    load,
    refreshCategories: refreshOptions,
    siteTitle: () => settings?.siteTitle ?? "",
    isDirty: () => changed || busy,
    canLogout: () => !busy && (!changed || window.confirm("저장하지 않은 설정이 있습니다. 로그아웃할까요?")),
  };
}
