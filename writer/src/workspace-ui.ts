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
  element("new-post").textContent = kind === "books" ? "＋ 새 책 기록" : kind === "projects" ? "＋ 새 프로젝트 작성" : "＋ 새 글 쓰기";
  element<HTMLButtonElement>("new-post").disabled = kind === "blog" && !fields.category.value;
  element("library-search-label").textContent = `${label} 찾기`;
  element("post-tab").textContent = `기존 ${label}`;
  element("empty-kind").textContent = kind.toUpperCase();
  element("empty-heading").textContent = `${object} 선택하세요`;
  element("empty-description").textContent = `새 ${object} 작성하거나 목록에서 수정할 항목을 선택하세요.`;
  element("title-label").textContent = kind === "books" ? "책 제목" : kind === "projects" ? "프로젝트 이름" : "게시글 제목";
  element("about-languages").hidden = kind !== "about";
  element("add-translation").hidden = kind === "about";
  element("new-post").hidden = kind === "about";
  element("blog-category-field").hidden = kind !== "blog";
  element("blog-date-field").hidden = kind !== "blog";
  element("title-row").hidden = kind === "about";
  element("extra-settings").hidden = kind === "about";
  element("description-label").textContent = kind === "about" ? "검색 결과에 표시할 소개" : "한 줄 요약";
  element("cover-attach").textContent = kind === "about" ? "프로필 사진 첨부" : "표지 이미지 첨부";
  element("extra-settings-heading").textContent = kind === "blog" ? "추가 정보 · 태그, 날짜, 주소" : "추가 정보 · 태그, 주소";
  fields.description.placeholder =
    kind === "books"
      ? "독서 기록을 짧게 요약하세요 (선택)"
      : kind === "projects"
        ? "프로젝트를 짧게 소개하세요"
        : kind === "about"
          ? "블로그와 작성자를 짧게 소개하세요"
          : "글의 내용을 짧게 요약하세요";
  element("collection-settings").hidden = kind === "blog";
  element("collection-settings-heading").textContent =
    kind === "books" ? "독서 기록 · 발행일, 표지" : kind === "about" ? "프로필 · 이름, 소개, 사진" : "프로젝트 정보 · 이미지, 분류 등 (선택)";
  element<HTMLDetailsElement>("collection-settings").open = kind !== "projects";
  element("publish-heading").textContent = kind === "about" ? "소개와 프로필을 반영할까요?" : `이 ${object} 발행할까요?`;
  element("publish").textContent = kind === "about" ? "소개 반영하기" : "발행하기";
  element("library-note").textContent =
    kind === "about"
      ? "수정 내용은 비공개로 저장됩니다. 소개 반영하기를 누르면 소개 페이지에 공개됩니다."
      : `초안은 자동으로 비공개 저장됩니다. 발행하면 ${kind === "books" ? "책장" : kind === "projects" ? "프로젝트 페이지" : "블로그"}에 공개됩니다.`;
}

export function updateLanguageNote(collection: ContentCollection, languageValue: string): void {
  const destination =
    collection === "about"
      ? languageValue === "ko"
        ? "한국어 · /ko/about/"
        : "English · /about/"
      : languageValue === "ko"
        ? "한국어 · /ko/"
        : "English · 기본 사이트";
  element("language-note").textContent =
    collection === "about"
      ? `${destination}에 반영됩니다. 영어·한국어 소개는 각각 수정할 수 있습니다.`
      : `${destination}에 발행됩니다. 다른 언어 버전은 별도 초안과 발행 상태로 관리됩니다.`;
}
