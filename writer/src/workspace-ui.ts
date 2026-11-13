import type { ContentCollection } from "./model";

export const contentLabels = { blog: "글", books: "책", projects: "프로젝트", about: "소개" };

export function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// Collection-dependent workspace labels, kept together so every collection
// switch updates all of them in one place.
export function configureCollection(kind: ContentCollection, fields: { category: HTMLSelectElement; description: HTMLInputElement }): void {
  const label = contentLabels[kind];
  const object = kind === "projects" || kind === "about" ? `${label}를` : `${label}을`;
  element("workspace").dataset.collection = kind;
  element("new-post").textContent = kind === "books" ? "＋ 새 기록" : kind === "projects" ? "＋ 새 프로젝트" : "＋ 새 글";
  element<HTMLButtonElement>("new-post").disabled = kind === "blog" && !fields.category.value;
  element("library-search-label").textContent = `${label} 찾기`;
  element("post-tab").textContent = `기존 ${label}`;
  element("library-heading").textContent = kind === "books" ? "독서 기록" : kind === "projects" ? "프로젝트 목록" : "글 목록";
  element("empty-heading").textContent = `${object} 선택하세요`;
  element("empty-description").textContent = `새 ${object} 작성하거나 목록에서 수정할 항목을 선택하세요.`;
  element("title-label").textContent = kind === "books" ? "책 제목 *" : kind === "projects" ? "프로젝트 제목 *" : "게시글 제목 *";
  element<HTMLInputElement>("title").required = kind !== "about";
  element("about-languages").hidden = kind !== "about";
  element("add-translation").hidden = kind === "about";
  element("new-post").hidden = kind === "about";
  element("blog-category-field").hidden = kind !== "blog";
  element("blog-date-field").hidden = kind !== "blog";
  element("title-row").hidden = kind === "about";
  const project = kind === "projects";
  element("project-link-field").hidden = !project;
  element("language-field").hidden = project;
  element("body-toolbar").hidden = project;
  element("extra-settings").hidden = kind === "about" || project;
  element("description-label").textContent =
    kind === "about" ? "검색 결과에 표시할 소개" : kind === "blog" ? "한 줄 요약 *" : project ? "한 줄 설명" : "한 줄 요약";
  fields.description.required = kind === "blog";
  element("tags-label").textContent = kind === "blog" ? "태그 *" : "태그";
  element<HTMLInputElement>("tags").required = kind === "blog";
  element("body-label").textContent = kind === "blog" ? "본문 *" : "본문";
  element<HTMLTextAreaElement>("body").required = kind === "blog";
  element("cover-attach").textContent = kind === "about" ? "프로필 사진 첨부" : "표지 이미지 첨부";
  element("collection-settings").hidden = kind === "blog" || project;
  element("publish-heading").textContent = kind === "about" ? "소개와 프로필을 반영할까요?" : `이 ${object} 발행할까요?`;
  element("publish").textContent = kind === "about" ? "소개 반영하기" : "발행하기";
}
