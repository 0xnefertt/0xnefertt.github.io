import { categoryOptions, validateSettings, type SettingsSnapshot, type SiteSettings } from "./site-settings";
import type { ContentCollection } from "./model";

type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
export function siteManager(api: Api, leave: () => Promise<boolean>, selectContent: (kind: ContentCollection) => Promise<boolean>) {
  const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  let settings: SiteSettings | null = null;
  let sha = "";
  let usage: Record<string, number> = {};
  let changed = false;
  let busy = false;
  let savedPaths = new Set<string>();
  let section: "posts" | "books" | "projects" | "about" | "categories" | "favorites" = "posts";
  const expanded = new WeakSet<object>();
  const message = (value: string) => {
    el("settings-status").textContent = value;
  };
  function dirty() {
    changed = true;
    message("변경사항이 있습니다. 저장하면 블로그에 반영됩니다.");
    el<HTMLButtonElement>("settings-save").disabled = busy;
  }
  function refreshOptions() {
    if (!settings) return;
    const select = el<HTMLSelectElement>("category");
    const value = select.value;
    const options = categoryOptions(settings);
    for (const path of Object.keys(usage))
      if (!options.some((item) => item.value === path)) options.push({ value: path, label: path.replaceAll("/", " / ") });
    select.replaceChildren(...options.map((item) => new Option(item.label, item.value)));
    if (value && options.some((item) => item.value === value)) select.value = value;
    el<HTMLButtonElement>("new-post").disabled = el("workspace").dataset.collection === "blog" && !select.value;
  }
  function apply(snapshot: SettingsSnapshot) {
    settings = structuredClone(snapshot.settings);
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
  function categoryRow(value: { name: string; slug: string }, path: string, groupSlug?: string) {
    const row = document.createElement("div");
    row.className = "category-row";
    const name = input("표시 이름", value.name, (next) => {
      value.name = next;
    });
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
    row.append(name, slug, note);
    return row;
  }
  function renderCategories() {
    const container = el("category-groups");
    container.replaceChildren();
    if (!settings) return;
    settings.categories.forEach((group, index) => {
      const { card, content, summary } = groupShell(group, group.name, `하위 ${group.children.length}개`, index);
      const parentRow = categoryRow(group, group.slug);
      parentRow.querySelector("input")!.addEventListener("input", () => {
        summary.textContent = `${group.name || "새 그룹"} · 하위 ${group.children.length}개`;
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
  function render() {
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
    for (const item of ["posts", "books", "projects", "about", "categories", "favorites"])
      el(`manage-${item}`).setAttribute("aria-pressed", String(item === next));
    el("manager-heading").textContent = next === "categories" ? "카테고리" : "즐겨찾기";
    el("manager-description").textContent =
      next === "categories"
        ? "표시 이름과 순서를 변경할 수 있습니다. 글이 있는 카테고리는 삭제할 수 없으며, 새 카테고리는 글을 발행하면 블로그에 표시됩니다."
        : "홈 화면에 표시할 그룹과 링크를 관리하세요. 순서는 위·아래 버튼으로 변경합니다. 빈 그룹은 홈 화면에 표시되지 않습니다.";
  }
  for (const item of ["posts", "books", "projects", "about", "categories", "favorites"] as const)
    el(`manage-${item}`).addEventListener("click", () => void show(item));
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
    isDirty: () => changed || busy,
    canLogout: () => !busy && (!changed || window.confirm("저장하지 않은 설정이 있습니다. 로그아웃할까요?")),
  };
}
