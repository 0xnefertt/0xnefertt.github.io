import { list, profileMetadata, type ContentCollection } from "./model";

type Field = { key: string; label: string; type?: "number" | "date" | "list" | "paragraphs"; placeholder?: string; fallback?: string; note?: string };
const fields: Record<Exclude<ContentCollection, "blog">, Field[]> = {
  about: [
    { key: "profile.name", label: "프로필 이름", fallback: "0xnefertt" },
    { key: "profile.location", label: "활동 지역", fallback: "Vancouver, Canada" },
    { key: "profile.bio", label: "짧은 소개", fallback: "개발하며 배운 것, 캐나다에서의 일상, 관심 있는 것들을 기록합니다." },
    { key: "profile.image", label: "프로필 사진", placeholder: "사진 주소 또는 아래 첨부 버튼" },
    { key: "subtitle", label: "소개 부제목" },
    { key: "profile.more_info", label: "추가 프로필 정보 · 한 줄에 하나씩", type: "paragraphs" },
  ],
  books: [
    { key: "date", label: "발행일", type: "date", note: "비워 두면 처음 발행하는 날로 저장됩니다." },
    { key: "cover", label: "표지 이미지", placeholder: "이미지 주소 또는 아래 첨부 버튼" },
  ],
  projects: [
    { key: "category", label: "프로젝트 분류", placeholder: "웹사이트, 앱, 연구" },
    { key: "img", label: "대표 이미지", placeholder: "이미지 주소 또는 아래 첨부 버튼" },
    { key: "status", label: "진행 상태", placeholder: "진행 중, 완료" },
    { key: "period", label: "진행 기간", placeholder: "2026.01–2026.10" },
    { key: "role", label: "담당 역할" },
    { key: "importance", label: "목록 정렬 순서 (작을수록 먼저)", type: "number" },
    { key: "stack", label: "사용한 기술", type: "list", placeholder: "Astro, TypeScript" },
  ],
};

export function collectionEditor(change: () => void) {
  const container = document.getElementById("collection-fields") as HTMLFieldSetElement;
  let controls: { field: Field; input: HTMLInputElement | HTMLTextAreaElement; original: string }[] = [];
  let collection: ContentCollection = "blog";
  function displayValue(field: Field, metadata: Record<string, unknown>): string {
    const value = field.key.startsWith("profile.") ? profileMetadata(metadata)[field.key.slice(8)] : metadata[field.key];
    const info = document.createElement("template");
    if (field.type === "paragraphs") info.innerHTML = String(value ?? "");
    return field.type === "list"
      ? list(value).join(", ")
      : field.type === "paragraphs"
        ? [...info.content.querySelectorAll("p")].map((p) => p.textContent ?? "").join("\n") || info.content.textContent || ""
        : String(value ?? field.fallback ?? "");
  }
  function load(kind: ContentCollection, metadata: Record<string, unknown>) {
    collection = kind;
    controls = [];
    container.replaceChildren();
    if (kind === "blog") return;
    for (const field of fields[kind]) {
      const wrapper = document.createElement("label");
      wrapper.textContent = field.label;
      const input = field.type === "paragraphs" ? document.createElement("textarea") : document.createElement("input");
      input.id = `metadata-${field.key.replaceAll(".", "-")}`;
      input.setAttribute("aria-label", field.label);
      input.placeholder = field.placeholder ?? "";
      if (input instanceof HTMLTextAreaElement) input.rows = 4;
      else {
        input.type = field.type === "number" || field.type === "date" ? field.type : "text";
        if (field.type === "number") {
          input.min = "0";
          input.step = field.key === "stars" ? "0.5" : "1";
          if (field.key === "stars") input.max = "5";
        }
      }
      input.value = displayValue(field, metadata);
      controls.push({ field, input, original: input.value });
      input.addEventListener("input", change);
      wrapper.append(input);
      if (field.note) {
        const note = document.createElement("small");
        note.textContent = field.note;
        wrapper.append(note);
      }
      container.append(wrapper);
    }
  }
  function read(base: Record<string, unknown>): Record<string, unknown> {
    const metadata = { ...base };
    if (collection === "about") metadata.profile = { ...profileMetadata(base) };
    for (const { field, input, original } of controls) {
      if (input.value === original) continue;
      const value = input.value.trim();
      const nested = field.key.startsWith("profile.");
      const target = nested ? profileMetadata(metadata) : metadata;
      const key = nested ? field.key.slice(8) : field.key;
      if (!value && !field.fallback) delete target[key];
      else
        target[key] =
          field.type === "number"
            ? Number(value)
            : field.type === "list"
              ? value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : field.type === "paragraphs"
                ? value
                    .split("\n")
                    .map((line) => {
                      const paragraph = document.createElement("p");
                      paragraph.textContent = line.trim();
                      return line.trim() ? paragraph.outerHTML : "";
                    })
                    .filter(Boolean)
                    .join("\n")
                : value;
    }

    return metadata;
  }
  return {
    load,
    read,
    acceptSaved: (metadata: Record<string, unknown>) => {
      for (const control of controls) control.original = displayValue(control.field, metadata);
    },
    setLocked: (locked: boolean) => {
      container.disabled = locked;
    },
    setImage: (key: "cover" | "img" | "profile.image", value: string) => {
      const input = controls.find((item) => item.field.key === key)?.input;
      if (input) input.value = value;
    },
  };
}
