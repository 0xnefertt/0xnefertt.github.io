import { profileMetadata, type ContentCollection } from "./model";

type Field = { key: string; label: string; type?: "date" | "checkbox"; placeholder?: string; note?: string };
const fields: Record<"books" | "about", Field[]> = {
  about: [
    { key: "profile.name", label: "프로필 이름" },
    { key: "profile.location", label: "활동 지역" },
    { key: "profile.bio", label: "짧은 소개" },
    { key: "profile.image", label: "프로필 사진", placeholder: "https://…" },
    { key: "profile.image_circular", label: "소개 페이지 사진 원형 표시", type: "checkbox" },
  ],
  books: [
    { key: "date", label: "발행일", type: "date", note: "미입력 시 발행한 날짜" },
    { key: "cover", label: "표지 이미지", placeholder: "https://…" },
  ],
};

export function collectionEditor(change: () => void) {
  const container = document.getElementById("collection-fields") as HTMLFieldSetElement;
  let controls: { field: Field; input: HTMLInputElement; original: string }[] = [];
  let collection: ContentCollection = "blog";
  function displayValue(field: Field, metadata: Record<string, unknown>): string {
    const value = field.key.startsWith("profile.") ? profileMetadata(metadata)[field.key.slice(8)] : metadata[field.key];
    return field.type === "checkbox" ? String(value === true) : String(value ?? "");
  }
  function load(kind: ContentCollection, metadata: Record<string, unknown>) {
    collection = kind;
    controls = [];
    container.replaceChildren();
    if (kind !== "books" && kind !== "about") return;
    for (const field of fields[kind]) {
      const wrapper = document.createElement("label");
      wrapper.textContent = field.label;
      const input = document.createElement("input");
      input.id = `metadata-${field.key.replaceAll(".", "-")}`;
      input.setAttribute("aria-label", field.label);
      input.placeholder = field.placeholder ?? "";
      input.type = field.type ?? "text";
      input.value = displayValue(field, metadata);
      if (field.type === "checkbox") input.checked = input.value === "true";
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
      const value = field.type === "checkbox" ? String(input.checked) : input.value.trim();
      if (value === original) continue;
      const nested = field.key.startsWith("profile.");
      const target = nested ? profileMetadata(metadata) : metadata;
      const key = nested ? field.key.slice(8) : field.key;
      if (!value) delete target[key];
      else target[key] = field.type === "checkbox" ? input.checked : value;
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
