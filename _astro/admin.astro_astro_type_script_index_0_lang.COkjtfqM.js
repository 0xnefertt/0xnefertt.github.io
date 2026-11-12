import{i as e,n as t,r as n,t as r}from"./markdown.DWWuyXSH.js";import{a as i,c as a,d as o,i as s,l as c,n as l,o as u,r as d,s as ee,t as te,u as ne}from"./editor.EhVpw1Jw.js";function f(e,t=``,n=``){return e.lang===`en`||e.lang===`ko`?e.lang:n.match(/^_(?:posts|books|projects|pages)\/(en|ko)\//)?.[1]||(/[가-힣]/.test(`${e.title??``} ${t}`)?`ko`:`en`)}function p(e,t){return String(e.translation_key??t.split(`/`).at(-1)?.replace(/\.md$/,``)??``)}function m(e=`blog`){if(e!==`blog`&&e!==`books`&&e!==`projects`&&e!==`about`)throw new v(400,`콘텐츠 종류가 올바르지 않습니다.`);return e}function h(e){if(e===`_pages/about.md`||e===`_pages/ko/about.md`)return`about`;if(b(e))return`blog`;if(/^_books\/(?:[\p{L}\p{N}_-]+\/)*[\p{L}\p{N}_-]+\.md$/u.test(e))return`books`;if(/^_projects\/(?:[\p{L}\p{N}_-]+\/)*[\p{L}\p{N}_-]+\.md$/u.test(e))return`projects`;throw new v(400,`콘텐츠 경로가 올바르지 않습니다.`)}function g(e){return m(e.collection??(e.sourcePath?h(e.sourcePath):`blog`))}function _(e){let t=e.profile;return t&&typeof t==`object`&&!Array.isArray(t)?t:{}}function re(e){return[e.cover,e.thumbnail,e.img,_(e).image].filter(e=>typeof e==`string`)}var v=class extends Error{status;constructor(e,t){super(t),this.status=e}};function y(e){return Array.isArray(e)?e.filter(e=>typeof e==`string`):typeof e==`string`?e.split(/[,\s]+/).filter(Boolean):[]}function b(e){return/^_posts\/(?:(?:en|ko)\/)?(?:[a-zA-Z0-9_-]+\/){1,2}[a-zA-Z0-9_.-]+\.md$/.test(e)&&!e.includes(`..`)}function ie(e){let t=g(e);if(t===`blog`)return;let n=e.metadata;if(t===`about`){if(n.layout!==`about`||n.permalink!==(x(e)===`ko`?`/ko/`:`/`))throw new v(422,`소개 페이지의 주소와 레이아웃은 변경할 수 없습니다.`);if(n.profile!==void 0&&(!n.profile||typeof n.profile!=`object`||Array.isArray(n.profile)))throw new v(422,`프로필 정보 형식을 확인해 주세요.`);let t=_(n);for(let e of[`name`,`location`,`bio`,`image`,`more_info`])if(t[e]!==void 0&&(typeof t[e]!=`string`||t[e].length>(e===`more_info`?1e4:2e3)))throw new v(422,`프로필 정보를 확인해 주세요.`);if(n.subtitle!==void 0&&(typeof n.subtitle!=`string`||n.subtitle.length>2e3))throw new v(422,`소개 부제목을 확인해 주세요.`)}for(let e of[`author`,`status`,`role`,`category`,`cover`,`img`,`olid`,`buy_link`])if(n[e]!==void 0&&(typeof n[e]!=`string`||n[e].length>2e3))throw new v(422,`${e} 정보를 확인해 주세요.`);for(let e of[`isbn`,`released`,`goodreads_review`,`period`])if(n[e]!==void 0&&![`string`,`number`].includes(typeof n[e]))throw new v(422,`${e} 정보를 확인해 주세요.`);for(let e of[`stars`,`importance`]){let t=n[e];if(t!==void 0&&(typeof t!=`number`||!Number.isFinite(t)||t<0||(e===`stars`?t>5:!Number.isInteger(t))))throw new v(422,e===`stars`?`별점은 0부터 5까지 입력해 주세요.`:`정렬 순서는 0 이상의 정수로 입력해 주세요.`)}for(let e of[`started`,`finished`,...t===`books`?[`date`]:[]]){if(n[e]===void 0)continue;let t=n[e],r=new Date(`${t}T00:00:00Z`);if(typeof t!=`string`||!/^\d{4}-\d{2}-\d{2}$/.test(t)||Number.isNaN(r.getTime())||r.toISOString().slice(0,10)!==t)throw new v(422,`날짜를 확인해 주세요.`)}for(let e of[`stack`,`highlights`,`lessons`,`categories`]){let t=n[e];if(!(t===void 0||e===`categories`&&typeof t==`string`)&&(!Array.isArray(t)||t.length>50||t.some(e=>typeof e!=`string`||e.length>2e3)))throw new v(422,`${e} 목록을 확인해 주세요.`)}function r(e){if(typeof e!=`string`||e.length>2e3)return!1;try{return[`https:`,`http:`].includes(new URL(e).protocol)}catch{return!1}}if(n.buy_link!==void 0&&!r(n.buy_link))throw new v(422,`구매 링크는 http 또는 https 주소로 입력해 주세요.`);for(let e of re(n))if(!(e===void 0||r(e))&&(typeof e!=`string`||!e||e.includes(`:`)||e.startsWith(`//`)||e.includes(`\\`)||e.split(`/`).includes(`..`)))throw new v(422,`표지 이미지 주소를 확인해 주세요.`);if(n.links!==void 0&&(!Array.isArray(n.links)||n.links.length>20||n.links.some(e=>!e||typeof e!=`object`||typeof e.label!=`string`||!e.label.trim()||e.label.length>200||!r(e.url))))throw new v(422,`프로젝트 링크의 이름과 http 또는 https 주소를 입력해 주세요.`)}function x(e){return f({...e.metadata,title:e.title},e.body,e.sourcePath??``)}function ae(e){return!e.sourcePath&&!e.slug&&!e.metadata.translation_key?``:p(e.metadata,e.sourcePath??(g(e)===`blog`?`${e.date}-${e.slug}.md`:`${e.slug}.md`))}function S(e){if(!e.sourcePath||g(e)===`about`)throw new v(400,`발행된 글을 열어 번역본을 추가해 주세요.`);if(e.body.includes(`/api/media/`)||JSON.stringify(e.metadata).includes(`/api/media/`))throw new v(422,`첨부 사진을 포함한 원본 변경을 먼저 발행한 뒤 번역본을 추가해 주세요.`);let t={...e.metadata,lang:x(e)===`en`?`ko`:`en`,translation_key:ae(e)};for(let e of[`canonical`,`canonical_url`,`redirect`,`external_source`,`draft`,`last_updated`])delete t[e];return g(e)===`books`&&delete t.date,{...e,metadata:t,title:``,description:``,body:e.body,sourcePath:null,sourceSha:null,slug:/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug)?e.slug:``}}function oe(e){let t=e.split(`/`).slice(1,-1);return(t[0]===`en`||t[0]===`ko`)&&t.shift(),t.join(`/`)}function se(e){let t=ae(e);if(e={...e,metadata:{...e.metadata,lang:x(e),...t?{translation_key:t}:{}}},g(e)!==`projects`||![`highlights`,`lessons`,`links`].some(t=>t in e.metadata))return e;ie(e);let n=e=>e.replace(/[\r\n]+/g,` `).replace(/[\\`*_[\]<>]/g,`\\$&`),r=[e.body.trimEnd()];for(let t of[`highlights`,`lessons`]){let i=y(e.metadata[t]);i.length&&r.push(i.map(e=>`- ${n(e)}`).join(`
`))}let i=e.metadata.links;i?.length&&r.push(i.map(e=>`- [${n(e.label)}](<${new URL(e.url).href}>)`).join(`
`));let a={...e.metadata};for(let e of[`highlights`,`lessons`,`links`])delete a[e];let o=r.filter(Boolean).join(`

`);if(o.length>3e5)throw new v(413,`글이 너무 깁니다.`);return{...e,body:o,metadata:a}}function ce(t,n=new Map,r=!1){t=se(t);let i=g(t),a={...t.metadata,title:t.title.trim(),lang:x(t),translation_key:ae(t)};if((i===`blog`||t.description.trim()||`description`in a)&&(a.description=t.description.trim()),(i===`blog`||t.tags.length||`tags`in a)&&(a.tags=t.tags),i===`blog`){a.date=t.date;let e=t.sourcePath?oe(t.sourcePath):void 0,n=t.metadata.category_override===!0?y(t.metadata.categories)[0]:e,r=!!(t.sourcePath&&t.category!==n);r&&(a.legacy_categories=[...new Set([...y(t.metadata.legacy_categories),...y(t.metadata.categories),n])],a.category_override=!0),a.categories=r||!t.sourcePath?[t.category]:t.metadata.categories??[t.category]}let o=new Date().toISOString().slice(0,10);i===`books`&&!r&&!a.date&&(a.date=o),a.last_updated=o,delete a.draft,r&&(a.draft=!0);let s=t.body;for(let[e,t]of n)s=s.replaceAll(e,t);if(!r&&s.includes(`/api/media/`))throw new v(422,`다른 초안의 이미지가 포함되어 있습니다. 이미지를 다시 첨부해 주세요.`);for(let e of[`cover`,`thumbnail`,`img`])if(typeof a[e]==`string`&&(a[e]=n.get(a[e])??a[e]),!r&&typeof a[e]==`string`&&a[e].includes(`/api/media/`))throw new v(422,`표지 이미지를 다시 첨부해 주세요.`);if(a.profile&&typeof a.profile==`object`&&!Array.isArray(a.profile)){let e={..._(a)};if(typeof e.image==`string`){let t=n.get(e.image)??e.image;if(!r&&t.includes(`/api/media/`))throw new v(422,`프로필 사진을 다시 첨부해 주세요.`);e.image=t}a.profile=e}return`---\n${e(a,{lineWidth:140,sortMapEntries:!0}).trimEnd()}\n---\n\n${s.trim()}\n`}var le={about:[{key:`profile.name`,label:`프로필 이름`},{key:`profile.location`,label:`활동 지역`},{key:`profile.bio`,label:`짧은 소개`},{key:`profile.image`,label:`프로필 사진`,placeholder:`사진 주소 또는 아래 첨부 버튼`},{key:`profile.image_circular`,label:`소개 페이지 사진 원형 표시`,type:`checkbox`}],books:[{key:`date`,label:`발행일`,type:`date`,note:`비워 두면 처음 발행하는 날로 저장됩니다.`},{key:`cover`,label:`표지 이미지`,placeholder:`이미지 주소 또는 아래 첨부 버튼`}],projects:[{key:`category`,label:`프로젝트 분류`,placeholder:`웹사이트, 앱, 연구`},{key:`img`,label:`대표 이미지`,placeholder:`이미지 주소 또는 아래 첨부 버튼`},{key:`status`,label:`진행 상태`,placeholder:`진행 중, 완료`},{key:`period`,label:`진행 기간`,placeholder:`2026.01–2026.10`},{key:`role`,label:`담당 역할`},{key:`importance`,label:`목록 정렬 순서 (작을수록 먼저)`,type:`number`},{key:`stack`,label:`사용한 기술`,type:`list`,placeholder:`Astro, TypeScript`}]};function ue(e){let t=document.getElementById(`collection-fields`),n=[],r=`blog`;function i(e,t){let n=e.key.startsWith(`profile.`)?_(t)[e.key.slice(8)]:t[e.key];return e.type===`list`?y(n).join(`, `):e.type===`checkbox`?String(n===!0):String(n??e.fallback??``)}function a(a,o){if(r=a,n=[],t.replaceChildren(),a!==`blog`)for(let r of le[a]){let a=document.createElement(`label`);a.textContent=r.label;let s=document.createElement(`input`);if(s.id=`metadata-${r.key.replaceAll(`.`,`-`)}`,s.setAttribute(`aria-label`,r.label),s.placeholder=r.placeholder??``,s.type=r.type===`number`||r.type===`date`||r.type===`checkbox`?r.type:`text`,r.type===`number`&&(s.min=`0`,s.step=`1`),s.value=i(r,o),r.type===`checkbox`&&(s.checked=s.value===`true`),n.push({field:r,input:s,original:s.value}),s.addEventListener(`input`,e),a.append(s),r.note){let e=document.createElement(`small`);e.textContent=r.note,a.append(e)}t.append(a)}}function o(e){let t={...e};r===`about`&&(t.profile={..._(e)});for(let{field:e,input:r,original:i}of n){let n=e.type===`checkbox`?String(r.checked):r.value.trim();if(n===i)continue;let a=e.key.startsWith(`profile.`),o=a?_(t):t,s=a?e.key.slice(8):e.key;!n&&!e.fallback?delete o[s]:o[s]=e.type===`checkbox`?r.checked:e.type===`number`?Number(n):e.type===`list`?n.split(`,`).map(e=>e.trim()).filter(Boolean):n}return t}return{load:a,read:o,acceptSaved:e=>{for(let t of n)t.original=i(t.field,e)},setLocked:e=>{t.disabled=e},setImage:(e,t)=>{let r=n.find(t=>t.field.key===e)?.input;r&&(r.value=t)}}}var de=`https://www.youtube-nocookie.com`;function C(e){if(!/^https?:\/\/[^\s<>\\]+$/i.test(e))return null;let t;try{t=new URL(e)}catch{return null}if(t.username||t.password||t.port)return null;let n;if(t.hostname===`youtu.be`?n=t.pathname.match(/^\/([\w-]{11})\/?$/)?.[1]:[`www.youtube.com`,`youtube.com`,`m.youtube.com`,`www.youtube-nocookie.com`].includes(t.hostname)&&(n=t.pathname===`/watch`?t.searchParams.get(`v`):t.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1]),!n||!/^[\w-]{11}$/.test(n))return null;let r=t.searchParams.get(`t`)??t.searchParams.get(`start`)??``,i=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(r),a=i?Number(i[1]??0)*3600+Number(i[2]??0)*60+Number(i[3]??0):0,o=a>0&&Number.isSafeInteger(a);return{url:`https://youtu.be/${n}${o?`?t=${a}`:``}`,src:`${de}/embed/${n}${o?`?start=${a}`:``}`}}function fe(e){return{class:`youtube-player`,src:e.src,title:`YouTube video player`,loading:`lazy`,referrerpolicy:`strict-origin-when-cross-origin`,allow:`encrypted-media; picture-in-picture; fullscreen`,allowfullscreen:`allowfullscreen`}}function pe(e){let t=e.tokens?.length===1&&C(e.text.trim());return t?`<p data-youtube="true">${t.url}</p>\n`:!1}var me=new n({renderer:{paragraph:pe,text:pe}});function he(e){let t=document.createElement(`iframe`);for(let[n,r]of Object.entries(fe(e)))t.setAttribute(n,r);return t}var ge=new r({headingStyle:`atx`,codeBlockStyle:`fenced`,bulletListMarker:`-`,emDelimiter:`*`});ge.addRule(`youtube`,{filter:e=>e.nodeName===`P`&&e.hasAttribute(`data-youtube`)&&!!C(e.textContent??``),replacement:(e,t)=>`\n\n${t.textContent}\n\n`}),ge.keep([`u`,`mark`,`span`,`table`]),ge.addRule(`imageLayout`,{filter:e=>e.nodeName===`P`&&e.getAttribute(`data-image-pair`)===`true`||e.nodeName===`IMG`&&[`data-image-width`,`width`,`height`].some(t=>e.hasAttribute(t)),replacement:(e,t)=>`\n\n${t.outerHTML}\n\n`}),ge.addRule(`strike`,{filter:[`s`,`del`],replacement:e=>`~~${e}~~`}),ge.addRule(`styledBlock`,{filter:e=>/^(P|H[1-6])$/.test(e.nodeName)&&e.hasAttribute(`style`),replacement:(e,t)=>`\n\n${t.outerHTML}\n\n`});function _e(e){if(!e||/[\u0000-\u001f\u007f]/.test(e))return!1;try{let t=new URL(e,`https://0xnefertt.github.io`);return[`http:`,`https:`,`mailto:`].includes(t.protocol)&&!t.username&&!t.password}catch{return!1}}function ve(e){if(e.startsWith(`/api/media/`)||e.startsWith(`/assets/`))return!0;try{let t=new URL(e);return t.protocol===`https:`&&!t.username&&!t.password}catch{return!1}}function ye(e){return t.sanitize(e,{FORBID_TAGS:[`script`,`style`,`form`,`input`,`button`,`iframe`,`object`,`embed`],FORBID_ATTR:[`srcset`]})}function be(e){let t=document.createElement(`template`);return t.innerHTML=ye(me.parse(e,{async:!1})),t}function xe(e){let t=be(e);for(let e of t.content.querySelectorAll(`li > p[data-youtube]:first-child`))e.before(document.createElement(`p`));return t.innerHTML}function Se(e){let t=be(e);for(let e of t.content.querySelectorAll(`p[data-youtube]`)){let t=C(e.textContent??``);t&&e.replaceWith(he(t))}return t.content}function Ce(e){let t=document.createElement(`template`);t.innerHTML=ye(e);for(let e of Array.from(t.content.children)){if(e.tagName!==`IMG`)continue;let t=e.ownerDocument.createElement(`p`);e.replaceWith(t),t.append(e)}return ge.turndown(t.content)}function we(e){let t=e.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm,``).replace(/`[^`\n]*`/g,``);if(/\{%|\{\{|\[\^|<!--|\$\$/.test(t))return!0;let n=new Set(`p.h1.h2.h3.h4.h5.h6.strong.b.em.i.u.s.del.mark.span.ul.ol.li.blockquote.pre.code.hr.br.a.img.table.thead.tbody.tr.th.td.colgroup.col`.split(`.`));return/<(?:p|h[1-6]|span|img|table|td|th|a)\b[^>]*\b(?:class|id)\s*=/i.test(t)?!0:[...t.matchAll(/<\/?([a-z][a-z0-9-]*)(?:\s[^>]*|\/)?\s*>/gi)].some(e=>!n.has(e[1].toLowerCase()))}function w(e,t){return t===`ko`&&e.name_ko||e.name}var Te={blogDescription:`Learning notes and practical research on software development, life in Canada, careers, and finance.`,blogDescriptionKo:`소프트웨어 개발, 캐나다 생활, 커리어와 금융에 관한 학습 기록과 실용적인 리서치`,blogName:`0xnefertt's Blog`,defaultOgImage:`/assets/img/prof_pic.jpg`,email:`adrwss2@gmail.com`,githubUrl:`https://github.com/0xnefertt`,latestPostsLimit:5,privacy:{body:`This is 0xnefertt's personal blog. Here is how browsing data and cookies may be used.

## Cookies, analytics, and ads

This site saves your theme preference in your browser. When enabled, Google Analytics measures page visits and interactions, including browser, device, and approximate location information. Google AdSense and other advertising providers may use cookies to show ads based on visits to this and other websites. See [Google's privacy policy](https://policies.google.com/privacy) and [Google's advertising partners](https://support.google.com/adsense/answer/9012903) for details.

You can manage or delete cookies through your browser, opt out of personalized ads through [Google Ads Settings](https://adssettings.google.com/) or [AboutAds](https://optout.aboutads.info/), and use the [Google Analytics opt-out add-on](https://tools.google.com/dlpage/gaoptout). Where a consent message is shown, you can manage your choices there.

## External services

GitHub Pages hosts the blog. GitHub/Giscus handles comments when enabled, and Open-Meteo and Frankfurter supply weather and exchange rates. Your browser may send these services technical information, such as your IP address, when making requests. Their own privacy policies apply. The owner's writing area uses GitHub sign-in and Cloudflare to store private drafts and login sessions; drafts become public when published.

## Questions

If you email me, I use your address and message to respond.`,bodyKo:`0xnefertt의 개인 블로그에서 방문 정보와 쿠키를 사용하는 방법을 안내합니다.

## 쿠키, 방문 통계와 광고

이 사이트는 브라우저에 화면 테마 설정을 저장합니다. 활성화된 경우 Google Analytics로 페이지 방문과 상호작용을 측정하며, 브라우저·기기·대략적인 위치 정보가 포함될 수 있습니다. Google AdSense와 광고 제공업체는 이 사이트와 다른 사이트의 방문 기록에 따라 광고를 표시하기 위해 쿠키를 사용할 수 있습니다. 자세한 내용은 [Google 개인정보처리방침](https://policies.google.com/privacy)과 [Google 광고 파트너 안내](https://support.google.com/adsense/answer/9012903)를 확인하세요.

브라우저에서 쿠키를 관리하거나 삭제할 수 있습니다. [Google 광고 설정](https://adssettings.google.com/), [AboutAds](https://optout.aboutads.info/), [Google Analytics 차단 부가기능](https://tools.google.com/dlpage/gaoptout)에서도 관련 설정을 관리할 수 있습니다. 동의 안내가 표시되는 경우 해당 안내에서 선택을 변경할 수 있습니다.

## 외부 서비스

GitHub Pages가 블로그를 호스팅합니다. 댓글 기능이 활성화된 경우 GitHub와 Giscus를 사용하며, 날씨와 환율은 Open-Meteo와 Frankfurter에서 제공합니다. 요청 과정에서 IP 주소 등의 기술 정보가 해당 서비스에 전달될 수 있으며 각 서비스의 개인정보처리방침이 적용됩니다. 관리자 작성 공간은 GitHub 로그인과 Cloudflare를 사용해 비공개 초안과 로그인 세션을 저장합니다. 초안은 발행할 때 공개됩니다.

## 문의

이메일을 보내주시면 답변을 위해 이메일 주소와 메시지를 사용합니다.`,updated:`2026-10-09`},resourcesDescription:`Favorite links, Vancouver weather, and exchange rates in one place.`,resourcesDescriptionKo:`자주 찾는 링크와 밴쿠버 날씨, 환율을 한곳에 모았습니다.`,seoDescription:`Development learning notes, life in Canada, finance research, and book reviews by 0xnefertt.`,seoDescriptionKo:`0xnefertt의 개발 학습 기록, 캐나다 생활 이야기, 금융 리서치와 독서 노트를 모은 개인 블로그입니다.`,siteTitle:`0xnefertt's thoughts`,usefulInfo:{baseCurrency:`USD`,enabled:!0,latitude:49.2827,location:`Vancouver, BC`,longitude:-123.1207,targetCurrencies:[`KRW`,`CAD`]},xUrl:`https://x.com/0xnefertt`},Ee={study:`study-log`,dev:`study-log`,english:`study-log`,money:`money-talk`,finance:`money-talk`,stock:`money-talk`,property:`money-talk`,thoughts:`life-thoughts`,uncategory:`life-thoughts`,life:`life-thoughts`,"opinions-is-my-own":`life-thoughts`,retrospect:`life-thoughts`,tips:`useful-tips`,general:`useful-tips`,"in-canada":`useful-tips`,canada:`useful-tips`};function T(e,t,n){if(typeof e!=`string`||!e.trim()||e.length>t)throw new v(422,`${n}을 확인해 주세요.`);return e.trim()}function E(e){if(!e||typeof e!=`object`||Array.isArray(e))throw new v(422,`설정 형식이 올바르지 않습니다.`);return e}function De(e,t){if(!Array.isArray(e)||e.length>t)throw new v(422,`항목 수 또는 설정 형식을 확인해 주세요.`);return e}function Oe(e){let t=E(e),n=T(t.slug,60,`카테고리 주소`);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n))throw new v(422,`카테고리 주소에는 영문 소문자, 숫자, 하이픈을 사용하세요.`);return{name:T(t.name,100,`영어 카테고리 이름`),...t.name_ko===void 0||t.name_ko===``?{}:{name_ko:T(t.name_ko,100,`한국어 카테고리 이름`)},slug:n}}function ke(e,t){if(new Set(e).size!==e.length)throw new v(422,t)}function Ae(e,t,n){if(typeof e!=`string`||e.length>t)throw new v(422,`${n}을 확인해 주세요.`);return e.trim()}function je(e,t,n,r){if(typeof e!=`number`||!Number.isFinite(e)||e<t||e>n)throw new v(422,`${r}을 확인해 주세요.`);return e}function Me(e,t,n=!1){let r=Ae(e,2e3,t);if(n&&/^\/api\/media\//.test(r))throw new v(422,`공유 이미지에는 먼저 발행한 공개 이미지 주소를 사용하세요.`);if(!r||n&&/^\/(?!\/)/.test(r))return r;try{let e=new URL(r);if(n&&e.pathname.startsWith(`/api/media/`))throw new v(422,`공유 이미지에는 먼저 발행한 공개 이미지 주소를 사용하세요.`);if([`http:`,`https:`].includes(e.protocol)&&!e.username&&!e.password)return r}catch(e){if(e instanceof v)throw e}throw new v(422,`${t}에는 올바른 http 또는 https 주소를 입력하세요.`)}function Ne(e){let t={...Te,...e},n=Ae(t.email,254,`이메일`);if(n&&!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(n))throw new v(422,`이메일 주소를 확인해 주세요.`);let r=je(t.latestPostsLimit,1,20,`최근 글 수`);if(!Number.isInteger(r))throw new v(422,`최근 글 수는 1~20 사이의 정수로 입력하세요.`);let i=E(t.usefulInfo);if(typeof i.enabled!=`boolean`)throw new v(422,`날씨·환율 표시 설정을 확인해 주세요.`);let a=T(i.baseCurrency,3,`기준 통화`).toUpperCase(),o=De(i.targetCurrencies,8).map(e=>T(e,3,`비교 통화`).toUpperCase());if(!/^[A-Z]{3}$/.test(a)||!o.length||o.some(e=>!/^[A-Z]{3}$/.test(e)||e===a))throw new v(422,`통화는 USD, CAD, KRW 같은 3자리 코드로 입력하고 기준 통화는 비교 통화에서 제외하세요.`);ke(o,`비교 통화가 중복됩니다.`);let s=E(t.privacy),c=T(s.updated,10,`개인정보 안내 수정일`),l=new Date(c);if(!/^\d{4}-\d{2}-\d{2}$/.test(c)||Number.isNaN(l.getTime())||l.toISOString().slice(0,10)!==c)throw new v(422,`개인정보 안내 수정일을 확인해 주세요.`);return{blogDescription:T(t.blogDescription,500,`영어 소개 문구`),blogDescriptionKo:T(t.blogDescriptionKo,500,`한국어 소개 문구`),seoDescription:T(t.seoDescription,500,`영어 검색 설명`),seoDescriptionKo:T(t.seoDescriptionKo,500,`한국어 검색 설명`),siteTitle:T(t.siteTitle,100,`사이트 이름`),blogName:T(t.blogName,100,`블로그 제목`),email:n,githubUrl:Me(t.githubUrl,`GitHub 링크`),xUrl:Me(t.xUrl,`X 링크`),defaultOgImage:Me(t.defaultOgImage,`공유 기본 이미지`,!0),latestPostsLimit:r,resourcesDescription:T(t.resourcesDescription,500,`유용한 자료 영어 소개`),resourcesDescriptionKo:T(t.resourcesDescriptionKo,500,`유용한 자료 한국어 소개`),usefulInfo:{enabled:i.enabled,location:T(i.location,100,`날씨 지역 이름`),latitude:je(i.latitude,-90,90,`위도`),longitude:je(i.longitude,-180,180,`경도`),baseCurrency:a,targetCurrencies:o},privacy:{body:T(s.body,3e4,`개인정보 안내 영어 본문`),bodyKo:T(s.bodyKo,3e4,`개인정보 안내 한국어 본문`),updated:c}}}function Pe(e){let t=E(e),n=De(t.categories,40).map(e=>{let t=E(e),n=Oe(t);if(Object.hasOwn(Ee,n.slug))throw new v(422,`이 카테고리 주소는 기존 글에서 사용 중인 별칭입니다. 다른 주소를 입력하세요.`);let r=De(t.children,40).map(Oe);return ke(r.map(e=>e.slug),`같은 상위 카테고리에 중복된 주소가 있습니다.`),{children:r,...n}});ke(n.map(e=>e.slug),`상위 카테고리 주소가 중복됩니다.`);let r=0,i=De(t.favorites,50).map(e=>{let t=E(e);return{items:De(t.items,200).map(e=>{let t=E(e),n=T(t.href,2e3,`링크 주소`);if(!/^\/(?!\/)/.test(n)){let e;try{e=new URL(n)}catch{throw new v(422,`올바른 링크 주소를 입력하세요.`)}if(![`http:`,`https:`].includes(e.protocol)||e.username||e.password)throw new v(422,`링크에는 http 또는 https 주소를 사용하세요.`)}let i=t.note===void 0||t.note===``?void 0:T(t.note,500,`링크 설명`);return r++,{href:n,...i?{note:i}:{},title:T(t.title,200,`링크 이름`)}}),name:T(t.name,100,`즐겨찾기 그룹 이름`)}});if(r>500)throw new v(422,`즐겨찾기는 500개까지 저장할 수 있습니다.`);return ke(i.map(e=>e.name.toLowerCase()),`즐겨찾기 그룹 이름이 중복됩니다.`),{...Ne(t),categories:n,favorites:i}}function Fe(e,t=`en`){return e.categories.flatMap(e=>[{value:e.slug,label:w(e,t)},...e.children.map(n=>({value:`${e.slug}/${n.slug}`,label:`${w(e,t)} / ${w(n,t)}`}))])}function Ie(e,t=`en`){return e.categories.flatMap(e=>e.children.map(n=>({value:`${e.slug}/${n.slug}`,label:w(n,t)})))}var Le=[`posts`,`books`,`projects`,`about`,`site`,`description`,`resources`,`privacy`,`categories`,`favorites`],Re={site:[{path:`siteTitle`,label:`사이트 이름 · 로고 텍스트, 하단 영역`,max:100},{path:`blogName`,label:`블로그 제목`,max:100},{path:`email`,label:`이메일`,max:254,note:`비워 두면 사이트 하단과 개인정보 안내의 이메일 링크를 숨깁니다.`},{path:`githubUrl`,label:`GitHub 링크`,max:2e3},{path:`xUrl`,label:`X 링크`,max:2e3},{path:`defaultOgImage`,label:`공유 기본 이미지 주소`,max:2e3,note:`이미지 주소 또는 /assets/ 경로. 비워 두면 파비콘을 사용합니다.`},{path:`latestPostsLimit`,label:`홈 화면 최근 글 수`,type:`number`,min:1,limit:20}],resources:[{path:`resourcesDescription`,label:`유용한 자료 영어 소개`,type:`textarea`,max:500},{path:`resourcesDescriptionKo`,label:`유용한 자료 한국어 소개`,type:`textarea`,max:500},{path:`usefulInfo.enabled`,label:`날씨·환율 표시`,type:`checkbox`},{path:`usefulInfo.location`,label:`날씨 지역 이름`,max:100},{path:`usefulInfo.latitude`,label:`위도`,type:`number`,min:-90,limit:90},{path:`usefulInfo.longitude`,label:`경도`,type:`number`,min:-180,limit:180},{path:`usefulInfo.baseCurrency`,label:`기준 통화`,max:3,note:`USD, CAD, KRW 같은 3자리 통화 코드`},{path:`usefulInfo.targetCurrencies`,label:`비교 통화`,type:`list`,max:100,note:`쉼표로 구분하세요. 예: KRW, CAD`}],privacy:[{path:`privacy.body`,label:`개인정보 안내 영어 본문`,type:`textarea`,max:3e4},{path:`privacy.bodyKo`,label:`개인정보 안내 한국어 본문`,type:`textarea`,max:3e4}]};function ze(e,t,n){let r=e=>document.getElementById(e),i=null,a=``,o={},s=!1,c=!1,l=new Set,u=new WeakSet,d=e=>{r(`settings-status`).textContent=e};function ee(){s=!0,d(`변경사항이 있습니다. 저장하면 블로그에 반영됩니다.`),r(`settings-save`).disabled=c}function te(e=!0){if(!i)return;let t=r(`category`),n=r(`category-parent`),a=t.value,o=r(`content-language`).value===`ko`?`ko`:`en`,s=e&&!a&&(!n.value||r(`editor`).hidden),c=a.split(`/`)[0]||n.value||i.categories[0]?.slug||``;if(n.replaceChildren(...i.categories.map(e=>new Option(w(e,o),e.slug))),c&&!i.categories.some(e=>e.slug===c)){let e=new Option(`${c} · 기존 분류`,c);e.disabled=!0,n.add(e)}n.value=c;let l=Ie(i,o).filter(e=>e.value.startsWith(`${c}/`));if(t.replaceChildren(new Option(`하위 분류를 선택하세요`,``),...l.map(e=>new Option(e.label,e.value))),a&&!l.some(e=>e.value===a)){let e=new Option(`${a} · 하위 분류 선택 필요`,a);e.disabled=!0,t.add(e)}t.value=a||(s?l[0]?.value??``:``),ne()}function ne(){r(`new-post`).disabled=r(`workspace`).dataset.collection===`blog`&&(!i||!Ie(i).some(e=>e.value===r(`category`).value))}r(`category-parent`).addEventListener(`change`,()=>{let e=r(`category`);e.value=``,te(!1),e.dispatchEvent(new e.ownerDocument.defaultView.Event(`input`,{bubbles:!0}))}),r(`category`).addEventListener(`change`,ne);function f(e){i=Pe(e.settings),a=e.sha,o=e.usage,l=new Set(Fe(i).map(e=>e.value)),s=!1,ie(),te(),d(`저장된 설정을 불러왔습니다.`)}async function p(){if(!c){c=!0,r(`settings-fields`).disabled=!0,r(`settings-save`).disabled=!0;try{f(await e(`/api/site-settings`))}catch(e){d(e instanceof Error?e.message:`설정을 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.`)}finally{c=!1,r(`settings-fields`).disabled=!i,r(`settings-save`).disabled=!s}}}function m(e,t,n,r={}){let i=document.createElement(`label`);i.textContent=e;let a=document.createElement(`input`);return a.value=t,a.maxLength=r.max??100,a.readOnly=r.readonly??!1,a.placeholder=r.placeholder??``,a.addEventListener(`input`,()=>{n(a.value),ee()}),i.append(a),i}function h(e,t,n=!1){let r=document.createElement(`button`);return r.type=`button`,r.textContent=e,r.disabled=n,r.addEventListener(`click`,()=>{t(),ee(),ie()}),r}function g(e,t,n,r=!0){let i=document.createElement(`div`);i.className=`row-actions`;let a=n=>{let[r]=e.splice(t,1);e.splice(t+n,0,r)},o=h(`↑`,()=>a(-1),t===0);o.setAttribute(`aria-label`,`${n} 위로`);let s=h(`↓`,()=>a(1),t===e.length-1);s.setAttribute(`aria-label`,`${n} 아래로`);let c=h(`삭제`,()=>e.splice(t,1),!r);return c.setAttribute(`aria-label`,`${n} 삭제`),i.append(o,s,c),i}function _(e,t,n,r){let i=document.createElement(`details`);i.className=`manager-group`;let a=document.createElement(`summary`);a.textContent=`${t||`새 그룹`} · ${n}`,i.open=u.has(e)||r===0,i.addEventListener(`toggle`,()=>{i.open?u.add(e):u.delete(e)});let o=document.createElement(`div`);return o.className=`manager-group-body`,i.append(a,o),{card:i,content:o,summary:a}}function re(e,t,n){let r=document.createElement(`div`);r.className=`category-row`;let i=m(`영어 이름`,e.name,t=>{e.name=t}),a=m(`한국어 이름`,e.name_ko??``,t=>{e.name_ko=t},{placeholder:`비워 두면 영어 이름을 표시합니다.`}),s=m(`주소`,e.slug,t=>{e.slug=t},{readonly:l.has(t),max:60,placeholder:`영문 소문자·숫자·하이픈`}),c=s.querySelector(`input`);i.querySelector(`input`).addEventListener(`blur`,()=>{e.slug||(e.slug=e.name.toLowerCase().replace(/[^a-z0-9\s-]/g,``).trim().replace(/\s+/g,`-`),c.value=e.slug)});let u=document.createElement(`small`);return u.textContent=l.has(t)?`${n?`${n}/`:``}${e.slug} · 글/초안 ${o[t]??0}개`:`저장 후 주소는 고정됩니다.`,r.append(i,a,s,u),r}function v(){let e=r(`category-groups`);e.replaceChildren(),i&&i.categories.forEach((t,n)=>{let{card:r,content:a,summary:s}=_(t,w(t,`ko`),`하위 ${t.children.length}개`,n),c=re(t,t.slug);c.addEventListener(`input`,()=>{s.textContent=`${w(t,`ko`)||`새 그룹`} · 하위 ${t.children.length}개`}),c.append(g(i.categories,n,`${t.name||`상위 카테고리`} 카테고리`,!o[t.slug])),a.append(c),t.children.forEach((e,n)=>{let r=`${t.slug}/${e.slug}`,i=re(e,r,t.slug);i.classList.add(`child-row`),i.append(g(t.children,n,`${e.name||`하위 카테고리`} 카테고리`,!o[r])),a.append(i)}),a.append(h(`＋ 하위 카테고리 추가`,()=>{t.children.push({name:``,slug:``}),u.add(t)})),e.append(r)})}function y(){let e=r(`favorite-groups`);e.replaceChildren(),i&&i.favorites.forEach((t,n)=>{let{card:r,content:a,summary:o}=_(t,t.name,`링크 ${t.items.length}개`,n),s=document.createElement(`div`);s.className=`manager-group-heading`;let c=m(`그룹 이름`,t.name,e=>{t.name=e,o.textContent=`${e||`새 그룹`} · 링크 ${t.items.length}개`});s.append(c,g(i.favorites,n,`${t.name||`즐겨찾기`} 그룹`)),a.append(s),t.items.forEach((e,n)=>{let r=document.createElement(`div`);r.className=`favorite-row`,r.append(m(`링크 이름`,e.title,t=>e.title=t,{max:200}),m(`링크 주소`,e.href,t=>e.href=t,{max:2e3,placeholder:`https://example.com`}),m(`설명 (선택)`,e.note??``,t=>e.note=t,{max:500}),g(t.items,n,`${e.title||`링크`}`)),a.append(r)}),a.append(h(`＋ 링크 추가`,()=>{t.items.push({href:``,title:``}),u.add(t)})),e.append(r)})}function b(){if(i){for(let[e,t]of Object.entries(Re)){let n=r(`${e}-fields`);n.replaceChildren();for(let r of t){let t=r.path.split(`.`),a=t.pop(),o=t.reduce((e,t)=>e[t],i),s=document.createElement(`label`);s.textContent=r.label;let c=r.type===`textarea`?document.createElement(`textarea`):document.createElement(`input`);if(c.id=`setting-${r.path.replaceAll(`.`,`-`)}`,c.tagName===`TEXTAREA`){let t=c;t.rows=e===`privacy`?16:3,t.maxLength=r.max??500}else{let e=c;e.type=r.type===`checkbox`?`checkbox`:r.type===`number`?`number`:`text`,e.maxLength=r.max??500,r.type===`checkbox`&&(e.checked=o[a]===!0),r.type===`number`&&(e.min=String(r.min),e.max=String(r.limit),e.step=r.path===`latestPostsLimit`?`1`:`any`)}if(c.value=Array.isArray(o[a])?o[a].join(`, `):String(o[a]),c.addEventListener(`input`,()=>{o[a]=r.type===`checkbox`?c.checked:r.type===`number`?c.value.trim()?Number(c.value):NaN:r.type===`list`?c.value.split(/[,\s]+/).filter(Boolean):c.value,ee()}),s.append(c),r.note){let e=document.createElement(`small`);e.textContent=r.note,s.append(e)}n.append(s)}}r(`privacy-updated`).textContent=i.privacy.updated,r(`admin-site-title`).textContent=i.siteTitle,document.title=`Admin · ${i.siteTitle}`}}function ie(){i&&(r(`blog-description-en`).value=i.blogDescription,r(`blog-description-ko`).value=i.blogDescriptionKo,r(`seo-description-en`).value=i.seoDescription,r(`seo-description-ko`).value=i.seoDescriptionKo),b(),v(),y()}async function x(e){if(!await t())return;let i=e===`posts`||e===`books`||e===`projects`||e===`about`;if(!i||await n(e===`posts`?`blog`:e)){r(`workspace`).hidden=!i,r(`settings-panel`).hidden=i,r(`category-manager`).hidden=e!==`categories`,r(`favorites-manager`).hidden=e!==`favorites`,r(`blog-description-manager`).hidden=e!==`description`;for(let t of[`site`,`resources`,`privacy`])r(`${t}-manager`).hidden=e!==t;for(let t of Le)r(`manage-${t}`).setAttribute(`aria-pressed`,String(t===e));i||(r(`manager-heading`).textContent=r(`manage-${e}`).textContent),r(`manager-description`).textContent=e===`site`?`사이트 이름과 연락처, 공유 이미지, 홈 화면을 설정하세요. 저장하면 사이트 전체에 함께 적용됩니다.`:e===`resources`?`자료 페이지의 소개 문구와 날씨 지역, 환율 표시를 관리하세요. 즐겨찾기 링크는 즐겨찾기 메뉴에서 수정합니다.`:e===`privacy`?`개인정보 안내 본문을 영어·한국어별로 수정하세요. Markdown으로 제목과 링크를 작성할 수 있습니다. 이메일은 사이트 설정을 사용하고, 본문을 변경하면 수정일이 갱신됩니다.`:e===`description`?`랜딩 페이지와 블로그 상단의 소개 문구를 영어·한국어별로 설정하세요. 소개·프로필의 자기소개 글과는 별개입니다. 저장하고 반영하면 사이트에 적용됩니다.`:e===`categories`?`영어·한국어 이름과 순서를 따로 설정하세요. 이름을 바꿔도 주소는 유지됩니다. 글이 있는 카테고리는 삭제할 수 없으며, 새 카테고리는 글을 발행하면 블로그에 표시됩니다.`:`유용한 자료 페이지에 표시할 그룹과 링크를 관리하세요. 위·아래 버튼으로 순서를 바꿀 수 있으며, 빈 그룹은 표시되지 않습니다.`}}for(let e of Le)r(`manage-${e}`).addEventListener(`click`,()=>void x(e));for(let[e,t]of[[`blog-description-en`,`blogDescription`],[`blog-description-ko`,`blogDescriptionKo`],[`seo-description-en`,`seoDescription`],[`seo-description-ko`,`seoDescriptionKo`]])r(e).addEventListener(`input`,()=>{i&&(i[t]=r(e).value,ee())});return r(`add-category`).addEventListener(`click`,()=>{if(!i)return;let e={children:[],name:``,slug:``};i.categories.push(e),u.add(e),ee(),ie()}),r(`add-favorite-group`).addEventListener(`click`,()=>{if(!i)return;let e={items:[],name:``};i.favorites.push(e),u.add(e),ee(),ie()}),r(`settings-reload`).addEventListener(`click`,()=>{c||(!s||window.confirm(`저장하지 않은 설정을 버리고 다시 불러올까요?`))&&p()}),r(`settings-download`).addEventListener(`click`,()=>{if(!i)return;let e=URL.createObjectURL(new Blob([JSON.stringify(i,null,2)],{type:`application/json`})),t=document.createElement(`a`);t.href=e,t.download=`site-settings.json`,t.click(),URL.revokeObjectURL(e)}),r(`settings-save`).addEventListener(`click`,()=>void(async()=>{if(!c&&i&&s)try{let t=Pe(i);c=!0,r(`settings-fields`).disabled=!0,r(`settings-save`).disabled=!0,d(`설정을 저장하는 중입니다…`);let n=await e(`/api/site-settings`,{method:`PUT`,body:JSON.stringify({settings:t,sha:a})});f(n),d(`설정을 저장했습니다. 블로그에 반영되기까지 잠시 걸릴 수 있습니다. `);let o=document.createElement(`a`);o.href=n.workflowUrl,o.textContent=`반영 상태 확인`,o.target=`_blank`,o.rel=`noreferrer`,r(`settings-status`).append(o)}catch(e){d(e instanceof Error?e.message:`저장하지 못했습니다. 내용을 내려받은 뒤 다시 불러와 주세요.`)}finally{c=!1,r(`settings-fields`).disabled=!i,r(`settings-save`).disabled=!s}})()),{load:p,refreshCategories:te,siteTitle:()=>i?.siteTitle??``,isDirty:()=>s||c,canLogout:()=>!c&&(!s||window.confirm(`저장하지 않은 설정이 있습니다. 로그아웃할까요?`))}}var Be=c.create({name:`youtube`,group:`block`,atom:!0,addAttributes:()=>({url:{default:null}}),parseHTML:()=>[{tag:`p[data-youtube]`,priority:60,getAttrs:e=>{let t=C(e.textContent??``);return t?{url:t.url}:!1}}],renderHTML:({node:e})=>[`p`,{"data-youtube":`true`},e.attrs.url],addNodeView:()=>({node:e})=>{let t=document.createElement(`div`),n=C(e.attrs.url);return n&&t.append(he(n)),{dom:t}}}),Ve=c.create({name:`imagePair`,group:`block`,content:`image{0,2}`,isolating:!0,parseHTML:()=>[{tag:`p[data-image-pair="true"]`,priority:60}],renderHTML:()=>[`p`,{"data-image-pair":`true`},0],addProseMirrorPlugins(){return[new o({appendTransaction:(e,t,n)=>{if(!e.some(e=>e.docChanged))return null;let r=n.tr;return n.doc.descendants((e,t)=>{if(e.type.name===this.name&&e.childCount<2)return r.replaceWith(r.mapping.map(t),r.mapping.map(t+e.nodeSize),e.content),!1}),r.docChanged?r:null}})]}});function He(e){let t=e=>document.getElementById(e),n=t(`body`),r=t(`rich-toolbar`),o=null,c=``,f=!1,p=!1,m=!1,h=!1,g=!0,_=t=>{let n=`clipboardData`in t?t.clipboardData:t.dataTransfer,r=Array.from(n?.files??[]);return r.length?(t.preventDefault(),e.upload(r).catch(e.report),!0):!1},re=l.extend({addAttributes(){return{...this.parent?.(),"data-image-width":{default:null,parseHTML:e=>{let t=e.getAttribute(`data-image-width`);return[`25`,`50`,`75`,`100`].includes(t??``)?t:null}}}},addNodeView(){return({node:t})=>{let n=document.createElement(`img`);n.alt=t.attrs.alt??``,n.title=t.attrs.title??``;for(let e of[`data-image-width`,`width`,`height`])t.attrs[e]!=null&&n.setAttribute(e,String(t.attrs[e]));let r=!1;return e.imageSrc(t.attrs.src).then(e=>{r||(n.src=e)}).catch(()=>{r||(n.alt=`이미지를 불러오지 못했습니다.`)}),{dom:n,destroy:()=>{r=!0}}}}});function v(n){o?.destroy(),o=new a({element:t(`rich-body`),extensions:[ee.configure({link:{openOnClick:!1,isAllowedUri:_e,HTMLAttributes:{target:null,rel:`noopener noreferrer`}}}),u,i.configure({multicolor:!0}),s.configure({types:[`heading`,`paragraph`],defaultAlignment:null}),d.configure({table:{resizable:!1}}),Be,Ve,re.configure({allowBase64:!1}),te.configure({placeholder:`본문 내용을 입력하거나 이미지를 붙여넣으세요.`})],content:`${xe(n)}<p></p>`,editable:!m,editorProps:{attributes:{role:`textbox`,"aria-label":`글 본문`,"aria-multiline":`true`,spellcheck:`true`},transformPastedHTML:ye,handlePaste:(e,t)=>{if(_(t))return!0;let{$from:n,empty:r}=e.state.selection;if(!e.editable||!r||n.parent.type.name!==`paragraph`||n.parent.content.size)return!1;let i=C(t.clipboardData?.getData(`text/plain`).trim()??``);return!i||!o?!1:o.commands.insertContent({type:`youtube`,attrs:{url:i.url}})},handleDrop:(e,t)=>_(t)},onUpdate:()=>{f=!0,e.onChange(),b()},onSelectionUpdate:b,onTransaction:b}),o.view.dom.addEventListener(`compositionstart`,()=>{h=!0,e.onComposition(!0)}),o.view.dom.addEventListener(`compositionend`,()=>{h=!1,e.onComposition(!1),e.onChange()}),b()}function y(e){let t=e.state.selection;if(!(t instanceof ne)||t.node.type.name!==`image`)return null;let n=t.$from.parent;if(n.type.name===`imagePair`)return null;let r=t.to;for(let e=t.$from.index()+1;e<n.childCount;e++){let i=n.child(e);if(r+=i.nodeSize,i.type.name===`image`)return{from:t.from,to:r,images:[t.node,i]};if(i.type.name!==`paragraph`||i.content.size)break}return null}function b(){if(!o)return;for(let e of r.querySelectorAll(`[data-mark]`))e.setAttribute(`aria-pressed`,String(o.isActive(e.dataset.mark)));for(let e of r.querySelectorAll(`[data-align]`))e.setAttribute(`aria-pressed`,String(o.isActive({textAlign:e.dataset.align})));t(`rich-undo`).disabled=m||!o.can().undo(),t(`rich-redo`).disabled=m||!o.can().redo(),t(`table-action`).disabled=m||!o.isActive(`table`);let e=o.state.selection,n=e instanceof ne&&e.node.type.name===`image`,i=e.$from.parent.type.name===`imagePair`;t(`image-layout-tools`).hidden=!n;let a=t(`image-width`);a.disabled=m||i,a.value=i?`50`:o.getAttributes(`image`)[`data-image-width`]??``;let s=t(`image-pair`);s.textContent=i?`나란히 배치 해제`:`다음 이미지와 나란히`,s.disabled=m||!i&&!y(o);let c=o.getAttributes(`heading`).level;t(`block-style`).value=c?String(c):`0`;let l=o.getAttributes(`textStyle`);t(`font-family`).value=l.fontFamily??``,t(`font-size`).value=l.fontSize??`16px`,t(`line-height`).value=l.lineHeight??`1.7`}function ie(e){(e||g)&&e!==p&&(e?n.value=ae():(c=n.value,f=!1,v(c)),p=e,t(`rich-body`).hidden=e,t(`source-panel`).hidden=!e,r.hidden=e,t(`write-tab`).setAttribute(`aria-pressed`,String(!e)),t(`source-tab`).setAttribute(`aria-pressed`,String(e)))}function x(e){c=e,f=!1,n.value=e,g=!we(e),p=!g,g?v(e):(o?.destroy(),o=null),t(`rich-body`).hidden=p,t(`source-panel`).hidden=!p,r.hidden=p,t(`write-tab`).disabled=!g,t(`rich-note`).textContent=g?``:`이 글에는 사용자 정의 HTML 또는 특수 문법이 있어 원문 모드로 열었습니다. 원문을 그대로 수정할 수 있습니다.`,t(`rich-note`).hidden=g,t(`write-tab`).setAttribute(`aria-pressed`,String(!p)),t(`source-tab`).setAttribute(`aria-pressed`,String(p))}function ae(){return p?n.value:f&&o?Ce(o.getHTML()):c}function S(e){!o||m||p||(e(o),b())}t(`image-width`).addEventListener(`change`,e=>S(t=>{let n=e.target.value||null;t.chain().focus().updateAttributes(`image`,{"data-image-width":n}).run()})),t(`image-pair`).addEventListener(`mousedown`,e=>e.preventDefault()),t(`image-pair`).addEventListener(`click`,()=>S(e=>{let{$from:t}=e.state.selection,n=e.state.tr,r;if(t.parent.type.name===`imagePair`)r=t.before(),n.replaceWith(r,t.after(),t.parent.content);else{let t=y(e);if(!t)return;r=t.from+1,n.replaceWith(t.from,t.to,e.schema.nodes.imagePair.create(null,t.images))}e.view.dispatch(n.setSelection(ne.create(n.doc,r))),e.view.focus()}));let oe={bold:e=>{e.chain().focus().toggleBold().run()},italic:e=>{e.chain().focus().toggleItalic().run()},underline:e=>{e.chain().focus().toggleUnderline().run()},strike:e=>{e.chain().focus().toggleStrike().run()},code:e=>{e.chain().focus().toggleCode().run()},codeBlock:e=>{e.chain().focus().toggleCodeBlock().run()},bulletList:e=>{e.chain().focus().toggleBulletList().run()},orderedList:e=>{e.chain().focus().toggleOrderedList().run()},blockquote:e=>{e.chain().focus().toggleBlockquote().run()},rule:e=>{e.chain().focus().setHorizontalRule().run()},highlight:e=>{e.chain().focus().toggleHighlight({color:`#fff3a3`}).run()},clear:e=>{e.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run()},undo:e=>{e.chain().focus().undo().run()},redo:e=>{e.chain().focus().redo().run()}};for(let e of r.querySelectorAll(`[data-command]`))e.addEventListener(`mousedown`,e=>e.preventDefault()),e.addEventListener(`click`,()=>S(oe[e.dataset.command]));for(let e of r.querySelectorAll(`[data-align]`))e.addEventListener(`mousedown`,e=>e.preventDefault()),e.addEventListener(`click`,()=>S(t=>{t.chain().focus().setTextAlign(e.dataset.align).run()}));t(`block-style`).addEventListener(`change`,e=>S(t=>{let n=Number(e.target.value);n===0?t.chain().focus().setParagraph().run():t.chain().focus().setHeading({level:n}).run()})),t(`font-family`).addEventListener(`change`,e=>S(t=>{let n=e.target.value;n?t.chain().focus().setFontFamily(n).run():t.chain().focus().unsetFontFamily().run()})),t(`font-size`).addEventListener(`change`,e=>S(t=>{t.chain().focus().setFontSize(e.target.value).run()})),t(`line-height`).addEventListener(`change`,e=>S(t=>{t.chain().focus().setLineHeight(e.target.value).run()})),t(`text-color`).addEventListener(`input`,e=>S(t=>{t.chain().focus().setColor(e.target.value).run()})),t(`table-action`).addEventListener(`change`,e=>{let t=e.target,n={row:e=>{e.chain().focus().addRowAfter().run()},column:e=>{e.chain().focus().addColumnAfter().run()},deleteRow:e=>{e.chain().focus().deleteRow().run()},deleteColumn:e=>{e.chain().focus().deleteColumn().run()},header:e=>{e.chain().focus().toggleHeaderRow().run()},merge:e=>{e.chain().focus().mergeCells().run()},split:e=>{e.chain().focus().splitCell().run()},delete:e=>{e.chain().focus().deleteTable().run()}};n[t.value]&&S(n[t.value]),t.value=``});let se=t(`insert-dialog`),ce=`link`;function le(e){m||p||!o||(ce=e,t(`insert-heading`).textContent={link:`링크 추가`,image:`이미지 주소 추가`,table:`표 추가`,video:`YouTube 영상 추가`}[e],t(`insert-url`).placeholder=e===`video`?`https://youtu.be/…`:`https://example.com`,t(`insert-url-field`).hidden=e===`table`,t(`insert-alt-field`).hidden=e!==`image`,t(`insert-table-fields`).hidden=e!==`table`,t(`insert-url`).value=e===`link`?o.getAttributes(`link`).href??``:``,t(`insert-alt`).value=``,t(`insert-error`).textContent=``,se.showModal())}t(`rich-video`).addEventListener(`click`,()=>le(`video`)),t(`rich-link`).addEventListener(`click`,()=>le(`link`)),t(`rich-image-url`).addEventListener(`click`,()=>le(`image`)),t(`rich-table`).addEventListener(`click`,()=>le(`table`)),t(`insert-cancel`).addEventListener(`click`,()=>se.close()),t(`insert-form`).addEventListener(`submit`,e=>{e.preventDefault();let n=t(`insert-url`).value.trim();if(ce===`link`&&!_e(n)||ce===`image`&&!ve(n))t(`insert-error`).textContent=`올바른 주소를 입력하세요. 이미지 주소는 https를 사용하세요.`;else{if(ce===`video`){let e=C(n);if(!e){t(`insert-error`).textContent=`YouTube 영상의 시청 주소나 공유 주소를 입력하세요.`;return}S(t=>t.chain().focus().insertContent({type:`youtube`,attrs:{url:e.url}}).run())}else if(ce===`table`){let e=Number(t(`table-rows`).value),n=Number(t(`table-columns`).value);if(!Number.isInteger(e)||!Number.isInteger(n)||e<1||n<1||e>10||n>10){t(`insert-error`).textContent=`행과 열은 1~10 사이로 입력하세요.`;return}S(t=>{t.chain().focus().insertTable({rows:e,cols:n,withHeaderRow:!0}).run()})}else ce===`image`?ue(n,t(`insert-alt`).value):S(e=>{e.state.selection.empty&&!e.isActive(`link`)?e.chain().focus().insertContent({type:`text`,text:n,marks:[{type:`link`,attrs:{href:n}}]}).run():e.chain().focus().extendMarkRange(`link`).setLink({href:n}).run()});se.close()}}),t(`rich-unlink`).addEventListener(`click`,()=>S(e=>{e.chain().focus().extendMarkRange(`link`).unsetLink().run()}));function ue(t,r){p?(n.setRangeText(`\n![${r.replace(/[\[\]\\\n]/g,``)}](${t})\n`,n.selectionStart,n.selectionEnd,`end`),e.onChange()):o?.chain().focus().setImage({src:t,alt:r}).run()}function de(t){if(p){let r=document.createElement(`p`);r.dataset.imagePair=`true`;for(let{src:e,alt:n}of t){let t=document.createElement(`img`);t.setAttribute(`src`,e),t.alt=n,r.append(t)}n.setRangeText(`\n\n${r.outerHTML}\n\n`,n.selectionStart,n.selectionEnd,`end`),e.onChange()}else o?.chain().focus().insertContent({type:`imagePair`,content:t.map(e=>({type:`image`,attrs:e}))}).run()}return n.addEventListener(`input`,()=>{g=!we(n.value),t(`write-tab`).disabled=!g}),t(`source-tab`).addEventListener(`click`,()=>ie(!0)),t(`write-tab`).addEventListener(`click`,()=>ie(!1)),{load:x,getBody:ae,insertImage:ue,insertImagePair:de,isComposing:()=>h,isSource:()=>p,characters:()=>p?n.value.length:o?.state.doc.textContent.length??c.length,setLocked:e=>{m=e,r.disabled=e,o?.setEditable(!e,!1),b()}}}var Ue=5242880;function We(e){return e.toLowerCase().replace(/[^a-z0-9\s-]/g,``).trim().replace(/\s+/g,`-`).replace(/-+/g,`-`)}var D={blog:`글`,books:`책`,projects:`프로젝트`,about:`소개`};function O(e){return document.getElementById(e)}function Ge(e,t){let n=D[e],r=e===`projects`||e===`about`?`${n}를`:`${n}을`;O(`workspace`).dataset.collection=e,O(`new-post`).textContent=e===`books`?`＋ 새 책 기록`:e===`projects`?`＋ 새 프로젝트 작성`:`＋ 새 글 쓰기`,O(`new-post`).disabled=e===`blog`&&!t.category.value,O(`library-search-label`).textContent=`${n} 찾기`,O(`post-tab`).textContent=`기존 ${n}`,O(`empty-kind`).textContent=e.toUpperCase(),O(`empty-heading`).textContent=`${r} 선택하세요`,O(`empty-description`).textContent=`새 ${r} 작성하거나 목록에서 수정할 항목을 선택하세요.`,O(`title-label`).textContent=e===`books`?`책 제목`:e===`projects`?`프로젝트 이름`:`게시글 제목`,O(`about-languages`).hidden=e!==`about`,O(`add-translation`).hidden=e===`about`,O(`new-post`).hidden=e===`about`,O(`blog-category-field`).hidden=e!==`blog`,O(`blog-date-field`).hidden=e!==`blog`,O(`title-row`).hidden=e===`about`,O(`extra-settings`).hidden=e===`about`,O(`description-label`).textContent=e===`about`?`검색 결과에 표시할 소개`:`한 줄 요약`,O(`cover-attach`).textContent=e===`about`?`프로필 사진 첨부`:`표지 이미지 첨부`,O(`extra-settings-heading`).textContent=e===`blog`?`추가 정보 · 태그, 날짜, 주소`:`추가 정보 · 태그, 주소`,t.description.placeholder=e===`books`?`독서 기록을 짧게 요약하세요 (선택)`:e===`projects`?`프로젝트를 짧게 소개하세요`:e===`about`?`블로그와 작성자를 짧게 소개하세요`:`글의 내용을 짧게 요약하세요`,O(`collection-settings`).hidden=e===`blog`,O(`collection-settings-heading`).textContent=e===`books`?`독서 기록 · 발행일, 표지`:e===`about`?`프로필 · 이름, 소개, 사진`:`프로젝트 정보 · 이미지, 분류 등 (선택)`,O(`collection-settings`).open=e!==`projects`,O(`publish-heading`).textContent=e===`about`?`소개와 프로필을 반영할까요?`:`이 ${r} 발행할까요?`,O(`publish`).textContent=e===`about`?`소개 반영하기`:`발행하기`,O(`library-note`).textContent=e===`about`?`수정 내용은 비공개로 저장됩니다. 소개 반영하기를 누르면 소개 페이지에 공개됩니다.`:`초안은 자동으로 비공개 저장됩니다. 발행하면 ${e===`books`?`책장`:e===`projects`?`프로젝트 페이지`:`블로그`}에 공개됩니다.`}function Ke(e,t){let n=e===`about`?t===`ko`?`한국어 · /ko/about/`:`English · /about/`:t===`ko`?`한국어 · /ko/`:`English · 기본 사이트`;O(`language-note`).textContent=e===`about`?`${n}에 반영됩니다. 영어·한국어 소개는 각각 수정할 수 있습니다.`:`${n}에 발행됩니다. 다른 언어 버전은 별도 초안과 발행 상태로 관리됩니다.`}function qe(e){let t=document.getElementById(`media-manager`),n=document.getElementById(`media-list`),r=document.getElementById(`media-count`),i=document.getElementById(`media-delete-dialog`),a=document.getElementById(`media-refresh`),o=0,s=null;async function c(){let a=e.current();if(!a||!t.open)return;let c=++o;r.textContent=`첨부 이미지를 불러오는 중…`,n.replaceChildren();let l=await e.api(`/api/drafts/${a.id}/media`);if(c===o&&e.current()?.id===a.id){if(r.textContent=`${l.media.length}/20개 · ${(l.media.reduce((e,t)=>e+t.size,0)/1024/1024).toFixed(1)} MB`,!l.media.length)n.textContent=`비공개 첨부 이미지가 없습니다.`;else for(let t of l.media){let r=document.createElement(`div`);r.className=`media-item`;let l=document.createElement(`img`);l.alt=`첨부 이미지 미리보기`,e.imageSrc(t.url).then(e=>{c===o&&(l.src=e)}).catch(()=>{l.alt=`이미지를 불러오지 못했습니다.`});let u=document.createElement(`span`);u.textContent=`${t.mime.replace(`image/`,``).toUpperCase()} · ${(t.size/1024).toFixed(0)} KB · ${t.used?`사용 중`:`미사용`}`;let d=document.createElement(`button`);d.type=`button`,d.textContent=`삭제`,d.dataset.used=String(t.used),d.disabled=t.used||e.isLocked(),d.addEventListener(`click`,()=>{e.isLocked()||e.current()?.id!==a.id||(s={draftId:a.id,file:t},i.returnValue=``,i.showModal())}),r.append(l,u,d),n.append(r)}}}async function l(){if(!e.isLocked()){e.lock(!0);try{await e.save(),await c()}finally{e.lock(!1)}}}return t.addEventListener(`toggle`,()=>{t.open&&l().catch(e.report)}),a.addEventListener(`click`,()=>void l().catch(e.report)),i.addEventListener(`close`,()=>{let t=s;s=null,i.returnValue===`delete`&&t&&!e.isLocked()&&e.current()?.id===t.draftId&&(async()=>{e.lock(!0);try{await e.save();let n=await e.api(`/api/drafts/${t.draftId}/media/${t.file.id}`,{method:`DELETE`,body:JSON.stringify({version:e.current().version})});e.accept(n.draft),e.release(t.file.url),await c()}finally{e.lock(!1)}})().catch(e.report)}),{changed:()=>{o++,s=null,n.replaceChildren(),r.textContent=``,t.open&&c().catch(e.report)},setLocked:e=>{a.disabled=e;for(let t of n.querySelectorAll(`button`))t.disabled=e||t.dataset.used===`true`}}}document.getElementById(`workspace`)||document.body.insertAdjacentHTML(`afterbegin`,`<header class="writer-header">
  <a class="brand" href="https://0xnefertt.github.io"><span id="admin-site-title">사이트 관리</span><span> / admin</span></a>
  <div class="header-actions"><span id="save-status" role="status">연결 중</span><button id="logout" hidden>로그아웃</button></div>
</header>
<main class="writer-main">
  <section id="login-screen" class="welcome" hidden>
    <span class="eyebrow">ADMIN</span>
    <h1>사이트 관리</h1>
    <p>GitHub로 로그인해 글, 책장, 프로젝트, 소개와 사이트 설정을 관리하세요.<br />초안은 비공개로 저장됩니다.</p>
    <a class="primary" id="login-link" href="#login-screen">GitHub로 로그인</a>
    <p id="login-message" class="muted" role="status"></p>
  </section>
  <nav id="admin-nav" class="admin-nav" aria-label="관리 메뉴" hidden>
    <div class="admin-nav-group" role="group" aria-label="콘텐츠">
      <button id="manage-posts" aria-pressed="true">글</button>
      <button id="manage-categories" aria-pressed="false">카테고리</button>
      <button id="manage-books" aria-pressed="false">책장</button>
      <button id="manage-projects" aria-pressed="false">프로젝트</button>
    </div>
    <div class="admin-nav-group" role="group" aria-label="소개">
      <button id="manage-about" aria-pressed="false">소개·프로필</button>
      <button id="manage-description" aria-pressed="false">블로그 소개</button>
    </div>
    <div class="admin-nav-group" role="group" aria-label="자료">
      <button id="manage-resources" aria-pressed="false">유용한 자료</button>
      <button id="manage-favorites" aria-pressed="false">즐겨찾기</button>
    </div>
    <div class="admin-nav-group" role="group" aria-label="운영">
      <button id="manage-privacy" aria-pressed="false">개인정보 안내</button>
      <button id="manage-site" aria-pressed="false">사이트 설정</button>
    </div>
    <a href="https://0xnefertt.github.io/" target="_blank" rel="noreferrer">블로그 보기 ↗</a>
  </nav>
  <section id="settings-panel" class="manager-panel" aria-labelledby="manager-heading" hidden>
    <header class="manager-header">
      <div>
        <h1 id="manager-heading">카테고리</h1>
        <p id="manager-description"></p>
      </div>
      <div class="manager-actions">
        <button id="settings-download">내려받기</button><button id="settings-reload">다시 불러오기</button
        ><button id="settings-save" class="primary" disabled>저장하고 반영</button>
      </div>
    </header>
    <p id="settings-status" role="status" class="manager-status">설정을 불러오는 중입니다.</p>
    <fieldset id="settings-fields" disabled>
      <div id="site-manager" hidden><div id="site-fields" class="settings-grid"></div></div>
      <div id="resources-manager" hidden><div id="resources-fields" class="settings-grid"></div></div>
      <div id="privacy-manager" hidden>
        <p>최종 수정: <output id="privacy-updated"></output></p>
        <div id="privacy-fields" class="settings-grid"></div>
      </div>
      <div id="blog-description-manager" class="settings-grid" hidden>
        <label>영어 소개 문구<textarea id="blog-description-en" rows="3" maxlength="500" required></textarea></label>
        <label>한국어 소개 문구<textarea id="blog-description-ko" rows="3" maxlength="500" required></textarea></label>
        <label>영어 검색 설명<textarea id="seo-description-en" rows="3" maxlength="500" required></textarea></label>
        <label>한국어 검색 설명<textarea id="seo-description-ko" rows="3" maxlength="500" required></textarea></label>
        <p class="muted">검색 설명은 검색 결과와 공유 미리보기에 사용됩니다. 화면 상단의 소개 문구와 별도로 설정할 수 있습니다.</p>
      </div>
      <div id="category-manager">
        <div id="category-groups"></div>
        <button id="add-category">＋ 상위 카테고리 추가</button>
      </div>
      <div id="favorites-manager" hidden>
        <div id="favorite-groups"></div>
        <button id="add-favorite-group">＋ 즐겨찾기 그룹 추가</button>
      </div>
    </fieldset>
  </section>
  <div id="workspace" class="workspace" data-collection="blog" hidden>
    <aside class="library">
      <button id="new-post" class="primary" disabled>＋ 새 글 쓰기</button>
      <label class="search-label" id="library-search-label" for="search">글 찾기</label>
      <label class="search-label" for="language-filter">콘텐츠 언어</label>
      <select id="language-filter">
        <option value="all">모든 언어</option>
        <option value="en">English</option>
        <option value="ko">한국어</option>
      </select>
      <input id="search" type="search" placeholder="제목이나 주소로 검색" />
      <div class="library-tabs" role="group" aria-label="글 목록 선택">
        <button id="draft-tab" aria-pressed="true">초안</button><button id="post-tab" aria-pressed="false">기존 글</button
        ><button id="trash-tab" aria-pressed="false">휴지통</button>
      </div>
      <div id="post-list" class="post-list" aria-live="polite"></div>
      <p class="library-note" id="library-note">초안은 자동으로 비공개 저장됩니다.<br />발행한 글은 블로그에 공개됩니다.</p>
    </aside>
    <section class="writing-area" aria-label="글 편집">
      <div id="empty" class="empty">
        <span class="eyebrow" id="empty-kind">POSTS</span>
        <h2 id="empty-heading">글을 선택하세요</h2>
        <p id="empty-description">새 글을 작성하거나 목록에서 수정할 글을 선택하세요.</p>
      </div>
      <div id="editor" hidden>
        <div class="editor-actions">
          <span id="document-state">비공개 초안</span>
          <div>
            <button id="unpublish" hidden>발행 취소</button><button id="delete-draft">초안 삭제</button><button id="download">내려받기</button
            ><button id="save">초안 저장</button><button class="primary" id="publish">발행하기</button>
          </div>
        </div>
        <div id="notice" role="status" hidden></div>
        <div class="post-meta-row" id="title-row">
          <label
            ><span id="title-label">게시글 제목</span><input id="title" class="title-input" placeholder="제목을 입력하세요" maxlength="300"
          /></label>
          <div id="blog-category-field" class="category-selector">
            <label
              >상위 분류<select id="category-parent">
                <option value="">상위 분류를 선택하세요</option>
              </select></label
            >
            <label
              >하위 분류<select id="category">
                <option value="">하위 분류를 선택하세요</option>
              </select></label
            >
          </div>
        </div>
        <div class="post-meta-row">
          <label
            >콘텐츠 언어<select id="content-language">
              <option value="en">English · 기본 사이트</option>
              <option value="ko">한국어 · /ko/</option>
            </select></label
          >
          <button id="add-translation" type="button">다른 언어 버전 추가</button>
          <div id="about-languages" hidden>
            <button id="about-en" type="button">English 소개</button><button id="about-ko" type="button">한국어 소개</button>
          </div>
        </div>
        <p class="muted" id="language-note">선택한 언어의 목록·검색·RSS에 발행됩니다.</p>
        <label class="summary-field"
          ><span id="description-label">한 줄 요약</span
          ><input id="description" class="description-input" placeholder="글의 내용을 짧게 요약하세요" maxlength="1000"
        /></label>
        <details id="collection-settings" class="post-settings" hidden open>
          <summary id="collection-settings-heading">상세 정보</summary>
          <fieldset id="collection-fields" class="settings-grid"></fieldset>
          <button id="cover-attach" type="button">표지 이미지 첨부</button>
          <input id="cover-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden />
          <p class="muted">PNG · JPG · WebP · GIF, 5MB 이하. 미리보기에서 표지 배치를 확인할 수 있습니다. 발행하면 사이트에 표시됩니다.</p>
          <div class="cover-status-panel">
            <img id="cover-thumbnail" class="cover-thumbnail" alt="표지 이미지 확인" hidden />
            <p id="cover-status" role="status">등록된 표지가 없습니다.</p>
          </div>
        </details>
        <details class="post-settings" id="extra-settings">
          <summary id="extra-settings-heading">추가 정보 · 태그, 날짜, 주소</summary>
          <div class="settings-grid">
            <label
              >번역 연결 주소<input id="translation-key" maxlength="200" placeholder="같은 글의 한·영 버전은 같은 주소" /><small
                >연결된 버전은 언어 전환 시 서로 이동합니다.</small
              ></label
            >
            <label>태그<input id="tags" placeholder="astro, 기록, 개발" /></label>
            <label id="blog-date-field">날짜<input id="date" type="date" /></label>
            <label
              >글 주소<input id="slug" placeholder="my-first-post" pattern="[a-z0-9]+(-[a-z0-9]+)*" /><small>영문 소문자·숫자·하이픈</small></label
            >
          </div>
        </details>
        <div class="editor-toolbar">
          <div role="group" aria-label="편집 보기">
            <button id="write-tab" aria-pressed="true">서식 편집</button><button id="source-tab" aria-pressed="false">원문</button
            ><button id="preview-tab" aria-pressed="false">미리보기</button>
          </div>
          <div><button id="source-attach" hidden>이미지 첨부</button><span id="word-count" class="muted">0자</span></div>
        </div>
        <div id="write-panel" class="body-shell">
          <fieldset id="rich-toolbar" class="format-toolbar" aria-label="본문 서식 도구">
            <div class="tool-group">
              <select id="block-style" aria-label="문단 스타일">
                <option value="0">본문</option>
                <option value="1">제목 1</option>
                <option value="2">제목 2</option>
                <option value="3">제목 3</option>
                <option value="4">제목 4</option>
              </select>
              <select id="font-family" aria-label="글꼴">
                <option value="">기본 글꼴</option>
                <option value="sans-serif">고딕</option>
                <option value="Georgia, serif">명조</option>
                <option value="ui-monospace, monospace">고정폭</option>
              </select>
              <select id="font-size" aria-label="글자 크기">
                <option>12px</option>
                <option>14px</option>
                <option selected>16px</option>
                <option>18px</option>
                <option>24px</option>
                <option>32px</option>
                <option>48px</option>
              </select>
              <select id="line-height" aria-label="줄 간격">
                <option value="1.4">줄 1.4</option>
                <option value="1.7" selected>줄 1.7</option>
                <option value="2">줄 2.0</option>
              </select>
            </div>
            <div class="tool-group">
              <button type="button" data-command="bold" data-mark="bold" aria-pressed="false" aria-label="굵게 (⌘/Ctrl+B)" title="굵게 (⌘/Ctrl+B)">
                <strong>B</strong></button
              ><button
                type="button"
                data-command="italic"
                data-mark="italic"
                aria-pressed="false"
                aria-label="기울임 (⌘/Ctrl+I)"
                title="기울임 (⌘/Ctrl+I)"
              >
                <em>I</em></button
              ><button
                type="button"
                data-command="underline"
                data-mark="underline"
                aria-pressed="false"
                aria-label="밑줄 (⌘/Ctrl+U)"
                title="밑줄 (⌘/Ctrl+U)"
              >
                <u>U</u></button
              ><button type="button" data-command="strike" data-mark="strike" aria-pressed="false" aria-label="취소선" title="취소선"><s>S</s></button
              ><button type="button" data-command="code" data-mark="code" aria-pressed="false" aria-label="인라인 코드" title="인라인 코드">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-2-13-4 16" />
                </svg></button
              ><button type="button" data-command="codeBlock" data-mark="codeBlock" aria-pressed="false" aria-label="코드 블록" title="코드 블록">
                <span>{ }</span>
              </button>
            </div>
            <div class="tool-group">
              <label class="color-tool" title="글자색"
                ><span aria-hidden="true">A</span><input id="text-color" type="color" value="#202720" aria-label="글자색" /></label
              ><button type="button" data-command="highlight" data-mark="highlight" aria-pressed="false" aria-label="형광펜" title="형광펜">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m15 3 6 6-9 9-6-6 9-9zM6 12l-3 6 3 3 6-3M2 22h20" />
                </svg>
              </button>
            </div>
            <div class="tool-group">
              <button type="button" data-align="left" aria-pressed="false" aria-label="왼쪽 정렬" title="왼쪽 정렬">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 5h16M4 10h10M4 15h16M4 20h10" />
                </svg></button
              ><button type="button" data-align="center" aria-pressed="false" aria-label="가운데 정렬" title="가운데 정렬">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 5h16M7 10h10M4 15h16M7 20h10" />
                </svg></button
              ><button type="button" data-align="right" aria-pressed="false" aria-label="오른쪽 정렬" title="오른쪽 정렬">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 5h16M10 10h10M4 15h16M10 20h10" />
                </svg></button
              ><button type="button" data-align="justify" aria-pressed="false" aria-label="양쪽 정렬" title="양쪽 정렬">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 5h16M4 10h16M4 15h16M4 20h16" />
                </svg>
              </button>
            </div>
            <div class="tool-group">
              <button
                type="button"
                data-command="bulletList"
                data-mark="bulletList"
                aria-pressed="false"
                aria-label="글머리 기호 목록"
                title="글머리 기호 목록"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 5h11M9 12h11M9 19h11" />
                  <circle cx="4" cy="5" r="1" />
                  <circle cx="4" cy="12" r="1" />
                  <circle cx="4" cy="19" r="1" />
                </svg></button
              ><button type="button" data-command="orderedList" data-mark="orderedList" aria-pressed="false" aria-label="번호 목록" title="번호 목록">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 5h10M10 12h10M10 19h10M3 3h1v5M3 13c3-3 5 0 0 5h3" />
                </svg></button
              ><button type="button" data-command="blockquote" data-mark="blockquote" aria-pressed="false" aria-label="인용" title="인용">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 6h5v8H5zm9 0h5v8h-5zM10 14c0 4-2 5-4 5m13-5c0 4-2 5-4 5" />
                </svg></button
              ><button type="button" data-command="rule" aria-label="구분선" title="구분선">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12h16" />
                </svg>
              </button>
            </div>
            <div class="tool-group">
              <button type="button" id="rich-link" aria-label="링크 추가" title="링크 추가">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 8H7a4 4 0 0 0 0 8h3m4-8h3a4 4 0 0 1 0 8h-3m-6-4h8" />
                </svg></button
              ><button type="button" id="rich-unlink" aria-label="링크 제거" title="링크 제거">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m3 3 18 18M10 8H7a4 4 0 0 0 0 8h3m4-8h3a4 4 0 0 1 3 7" />
                </svg></button
              ><button type="button" id="attach" aria-label="이미지 첨부" title="이미지 첨부 · 두 장을 선택하면 나란히 배치합니다">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8" cy="8" r="1" />
                  <path d="m3 17 6-6 5 5 4-4 3 3" />
                </svg></button
              ><button type="button" id="rich-image-url" aria-label="URL 이미지" title="URL 이미지"><span class="tool-text">URL 이미지</span></button
              ><button type="button" id="rich-video" title="YouTube 영상 추가"><span class="tool-text">영상 추가</span></button
              ><button type="button" id="rich-table" aria-label="표 추가" title="표 추가">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                </svg></button
              ><button type="button" data-command="clear" aria-label="서식 지우기" title="서식 지우기">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m15 3 6 6-11 11H5l-3-3L15 3zm-9 9 6 6M10 20h11" />
                </svg>
              </button>
            </div>
            <div class="tool-group">
              <button type="button" data-command="undo" id="rich-undo" aria-label="실행 취소 (⌘/Ctrl+Z)" title="실행 취소 (⌘/Ctrl+Z)">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12" />
                </svg></button
              ><button type="button" data-command="redo" id="rich-redo" aria-label="다시 실행 (⌘/Ctrl+Shift+Z)" title="다시 실행 (⌘/Ctrl+Shift+Z)">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m16 5 5 5-5 5M21 10H10a6 6 0 0 0 0 12" />
                </svg></button
              ><select id="table-action" aria-label="표 편집" disabled>
                <option value="">표 작업</option>
                <option value="row">행 추가</option>
                <option value="column">열 추가</option>
                <option value="deleteRow">행 삭제</option>
                <option value="deleteColumn">열 삭제</option>
                <option value="header">머리글 행 전환</option>
                <option value="merge">셀 합치기</option>
                <option value="split">셀 나누기</option>
                <option value="delete">표 삭제</option>
              </select>
            </div>
            <div class="tool-group" id="image-layout-tools" hidden>
              <label for="image-width">이미지 너비</label>
              <select id="image-width">
                <option value="">원래 크기</option>
                <option value="25">25%</option>
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="100">100%</option>
              </select>
              <button type="button" id="image-pair" class="image-layout-button">다음 이미지와 나란히</button>
            </div>
          </fieldset>
          <div id="rich-body" class="rich-body markdown-body"></div>
          <div id="source-panel" hidden>
            <label class="sr-only" for="body">본문 원문</label
            ><textarea id="body" placeholder="Markdown 또는 HTML 원문을 입력하세요." spellcheck="false"></textarea>
          </div>
        </div>
        <input id="image-file" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" hidden />
        <p id="rich-note" class="muted" hidden></p>
        <details id="media-manager" class="media-manager">
          <summary>첨부 이미지 관리</summary>
          <p class="muted">본문이나 표지에서 제거한 이미지만 삭제할 수 있습니다. 공개 사이트의 이미지에는 영향을 주지 않습니다.</p>
          <button id="media-refresh" type="button">저장하고 목록 새로고침</button>
          <p id="media-count" role="status"></p>
          <div id="media-list" class="media-list"></div>
        </details>
        <article id="preview-panel" class="post-preview" hidden>
          <header class="post-header">
            <h1 id="preview-title"></h1>
            <p id="preview-date"></p>
            <div id="preview-tags" class="tags"></div>
          </header>
          <img id="preview-cover" class="preview-cover" alt="표지 미리보기" hidden />
          <p id="preview-bio" hidden></p>
          <div id="preview-body" class="post-body markdown-body"></div>
        </article>
      </div>
    </section>
  </div>
</main>
<dialog id="publish-dialog">
  <form method="dialog">
    <span class="eyebrow">PUBLISH</span>
    <h2 id="publish-heading">이 글을 발행할까요?</h2>
    <p>작성한 내용과 사용한 이미지가 공개됩니다.<br />사이트에 반영되기까지 잠시 걸릴 수 있습니다.</p>
    <div class="dialog-actions"><button value="cancel">계속 작성</button><button class="primary" value="publish">발행하기</button></div>
  </form>
</dialog>

<dialog id="delete-dialog">
  <form method="dialog">
    <h2>초안을 휴지통으로 옮길까요?</h2>
    <p id="delete-draft-title"></p>
    <p>초안과 첨부 이미지는 휴지통에서 복원할 수 있습니다.<br />발행된 글과 공개 이미지는 그대로 유지됩니다.</p>
    <div class="dialog-actions"><button value="cancel">취소</button><button value="trash">휴지통으로 이동</button></div>
  </form>
</dialog>

<dialog id="unpublish-dialog">
  <form method="dialog">
    <h2>이 콘텐츠의 발행을 취소할까요?</h2>
    <p>배포가 끝나면 사이트의 목록과 상세 페이지에서 숨겨집니다. 작업본은 유지되며 같은 주소로 다시 발행할 수 있습니다.</p>
    <p>이미 공개된 본문과 이미지는 공개 저장소와 기록에 남습니다. 민감한 정보의 영구 삭제 기능은 아닙니다.</p>
    <div class="dialog-actions"><button value="cancel">취소</button><button value="unpublish">발행 취소</button></div>
  </form>
</dialog>

<dialog id="media-delete-dialog">
  <form method="dialog">
    <h2>미사용 첨부 이미지를 삭제할까요?</h2>
    <p>이 작업본의 비공개 첨부에서 영구 삭제됩니다. 다시 사용하려면 이미지를 새로 첨부해야 합니다.</p>
    <div class="dialog-actions"><button value="cancel">취소</button><button value="delete">이미지 삭제</button></div>
  </form>
</dialog>

<dialog id="insert-dialog">
  <form id="insert-form">
    <h2 id="insert-heading">링크 추가</h2>
    <label id="insert-url-field">주소<input id="insert-url" type="text" placeholder="https://example.com" maxlength="2000" /></label>
    <label id="insert-alt-field" hidden>이미지 설명<input id="insert-alt" type="text" maxlength="300" /></label>
    <div id="insert-table-fields" class="settings-grid" hidden>
      <label>행<input id="table-rows" type="number" min="1" max="10" value="3" /></label
      ><label>열<input id="table-columns" type="number" min="1" max="10" value="3" /></label>
    </div>
    <p id="insert-error" class="muted" role="status"></p>
    <div class="dialog-actions"><button id="insert-cancel" type="button">취소</button><button class="primary" type="submit">추가</button></div>
  </form>
</dialog>
`);var k=document.querySelector(`meta[name="writer-api"]`)?.content??``,Je=`writer.login-nonce`,Ye=`writer.session`,Xe=new URLSearchParams(location.hash.slice(1));if(k&&Xe.has(`session`)){let e=Xe.get(`session`)??``;/^[a-f0-9]{64}$/.test(e)&&Xe.get(`state`)===sessionStorage.getItem(Je)&&sessionStorage.setItem(Ye,e),sessionStorage.removeItem(Je),history.replaceState(null,``,location.pathname)}var Ze=k?sessionStorage.getItem(Ye)??``:``,Qe=new Map,A=O(`title`),j=O(`description`),M=O(`body`),N=O(`category`),$e=O(`tags`),P=O(`date`),F=O(`content-language`),et=O(`translation-key`),tt=O(`language-filter`),I=O(`slug`),nt=``,L=null,R=!1,rt=!1,z=!1,B=!1,it=null,V,at=[],ot=null,H=!1,U=!1,st=0,W=`blog`,ct=class extends Error{status;constructor(e,t){super(e),this.status=t}};async function G(e,t={}){let n=new Headers(t.headers);t.body&&typeof t.body==`string`&&n.set(`Content-Type`,`application/json`),nt&&n.set(`X-CSRF-Token`,nt),Ze&&n.set(`Authorization`,`Bearer ${Ze}`);let r=await fetch(`${k}${e}`,{...t,headers:n,credentials:k?`omit`:`same-origin`}),i=await r.json().catch(()=>{throw new ct(`서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.`,r.status)});if(!r.ok)throw new ct(i.error??`요청을 처리하지 못했습니다.`,r.status);return i}var lt=ze(G,ht,dt),K=He({onChange:gt,onComposition:e=>{clearTimeout(V),e&&J(`작성 중…`)},upload:wt,imageSrc:ft,report:Y}),q=ue(gt),ut=qe({api:G,current:()=>L,isLocked:()=>z,lock:X,save:Q,accept:e=>{L=e,J(`미사용 첨부 이미지를 삭제했습니다.`)},imageSrc:ft,release:e=>{Qe.get(e)?.then(e=>URL.revokeObjectURL(e)),Qe.delete(e)},report:Y});async function dt(e){if(B)return!1;if(W===e)return!0;B=!0,st++;let t=[`posts`,`books`,`projects`,`about`,`categories`,`favorites`].map(e=>O(`manage-${e}`));t.forEach(e=>{e.disabled=!0});try{let t=await G(`/api/drafts?collection=${e}`),n=t.drafts.find(e=>e.sourcePath===`_pages/about.md`),r=e===`about`?n?await G(`/api/drafts/${n.id}`):await G(`/api/posts/open`,{method:`POST`,body:JSON.stringify({path:`_pages/about.md`})}):null;return W=e,L=null,R=!1,rt=!1,clearTimeout(V),at=t.drafts,ot=null,H=!1,U=!1,O(`trash-tab`).setAttribute(`aria-pressed`,`false`),O(`search`).value=``,O(`draft-tab`).setAttribute(`aria-pressed`,`true`),O(`post-tab`).setAttribute(`aria-pressed`,`false`),O(`editor`).hidden=!0,O(`empty`).hidden=!1,Ge(e,{category:N,description:j}),q.load(e,{}),r&&Z(r),bt(),J(r?`모든 변경사항 저장됨`:`연결됨`),!0}catch(e){return Y(e),!1}finally{B=!1,t.forEach(e=>{e.disabled=!1})}}async function ft(e){return e.startsWith(`/assets/`)?`https://0xnefertt.github.io${e}`:e.startsWith(`/api/media/`)?(Qe.has(e)||Qe.set(e,fetch(`${k}${e}`,{headers:Ze?{Authorization:`Bearer ${Ze}`}:{},credentials:k?`omit`:`same-origin`}).then(async e=>{if(!e.ok)throw Error(`이미지를 불러오지 못했습니다.`);return URL.createObjectURL(await e.blob())})),Qe.get(e)):e}function J(e){O(`save-status`).textContent=e}function pt(e){let t=O(`notice`);t.textContent=e,t.hidden=!1}function Y(e){let t=e instanceof Error?e.message:`요청을 처리하지 못했습니다.`;e instanceof ct&&e.status===409&&(rt=!0),J(O(`editor`).hidden?t:`저장 확인 필요`),pt(t)}function mt(){let e={...q.read(L.document.metadata),lang:F.value};return et.value.trim()?e.translation_key=et.value.trim():delete e.translation_key,{...L.document,collection:W,metadata:e,title:A.value,description:j.value,body:K.getBody(),category:W===`blog`?N.value:``,date:P.value,slug:I.value,tags:$e.value.split(`,`).map(e=>e.trim()).filter(Boolean)}}function X(e){z=e,K.setLocked(e),q.setLocked(e),ut.setLocked(e);for(let t of[`save`,`publish`,`unpublish`,`delete-draft`,`attach`,`source-attach`,`cover-attach`,`new-post`,`logout`,`add-translation`,`about-en`,`about-ko`])O(t).disabled=e;O(`add-translation`).disabled=e||!L?.document.sourcePath;for(let t of[A,j,M,N,$e,P,I,F,et])t.disabled=e;O(`category-parent`).disabled=e,L?.document.sourcePath&&(I.disabled=!0,F.disabled=!0),L?.document.sourcePath&&(P.disabled=!0)}function Z(e){clearTimeout(V),L=e,R=!1,rt=!1;let t=e.document;W=g(t),Ge(W,{category:N,description:j}),q.load(W,t.metadata),F.value=x(t),et.value=ae(t),F.disabled=!!t.sourcePath,et.disabled=!1,O(`add-translation`).disabled=!t.sourcePath,Ke(W,F.value),A.value=t.title,j.value=t.description,K.load(t.body),P.value=t.date,$e.value=t.tags.join(`, `),I.value=t.slug,W===`blog`&&![...N.options].some(e=>e.value===t.category)&&N.add(new Option(t.category,t.category)),N.value=t.category,O(`editor`).hidden=!1,lt.refreshCategories(),I.disabled=!!t.sourcePath,P.disabled=!!t.sourcePath,N.disabled=!1,O(`empty`).hidden=!0,O(`editor`).hidden=!1,O(`notice`).hidden=!0,O(`document-state`).textContent=t.sourcePath?t.metadata.draft===!0?`발행 취소된 작업본 · 다시 발행하면 사이트에 공개됩니다.`:`발행된 글의 작업본 · 저장한 변경은 다시 발행해야 반영됩니다.`:`비공개 초안`,O(`unpublish`).hidden=!t.sourcePath||W===`about`||t.metadata.draft===!0,O(`publish`).textContent=t.sourcePath&&t.metadata.draft===!0?`다시 발행`:`발행하기`,ut.changed(),J(`모든 변경사항 저장됨`),yt(!1),vt(),bt()}async function Q(){if(it)return await it,R?Q():void 0;if(!L||!R)return;if(rt)throw Error(`다른 기기의 변경과 충돌했습니다. 먼저 내용을 내려받고 목록에서 초안을 다시 열어 주세요.`);let e=mt(),t=L.id,n=L.version;J(`저장 중…`),it=(async()=>{let r=await G(`/api/drafts/${t}`,{method:`PUT`,body:JSON.stringify({document:e,version:n})});L?.id===t&&(L=r,q.acceptSaved(r.document.metadata),R=JSON.stringify(mt())!==JSON.stringify(e),J(R?`저장 대기 중`:`모든 변경사항 저장됨`));let i=at.find(e=>e.id===t);i&&(i.title=e.title,i.language=x(r.document),i.updated=r.updated,bt())})();try{await it}catch(e){throw Y(e),e}finally{it=null}}async function ht(){if(z)return!1;if(rt&&R)return window.confirm(`다른 기기의 변경과 충돌해 현재 내용이 저장되지 않았습니다. 내려받기로 내용을 보관한 뒤 이동하세요. 그래도 이동할까요?`);try{return await Q(),R&&await Q(),!0}catch{return!1}}function gt(){L&&(R=!0,J(K.isComposing()?`작성 중…`:`저장 대기 중`),clearTimeout(V),!K.isComposing()&&(V=setTimeout(()=>{Q().catch(()=>{})},1500),vt()))}for(let e of[A,j,M,N,$e,P,I,F,et])e.addEventListener(`input`,e=>{e instanceof InputEvent&&e.isComposing?(R=!0,clearTimeout(V),J(`작성 중…`)):gt()});M.addEventListener(`compositionstart`,()=>clearTimeout(V)),M.addEventListener(`compositionend`,gt),A.addEventListener(`blur`,()=>{!L?.document.sourcePath&&!I.value&&A.value.trim()&&(I.value=We(A.value)||`${W===`books`?`book`:W===`projects`?`project`:`post`}-${L.id.slice(0,8)}`,gt())}),window.addEventListener(`beforeunload`,e=>{(R||it||z||lt.isDirty())&&e.preventDefault()}),document.addEventListener(`visibilitychange`,()=>{document.hidden&&R&&Q().catch(()=>{})}),window.addEventListener(`online`,()=>{R&&!rt&&Q().catch(()=>{})});function _t(){if(!L||W===`blog`)return;let e=q.read(L.document.metadata),t=_(e),n=O(`cover-thumbnail`),r=O(`cover-status`),i=String(W===`about`?t.image??``:e[W===`books`?`cover`:`img`]??``);i.startsWith(`assets/`)&&(i=`/`+i),i&&!i.includes(`/`)&&(i=`/assets/img/`+i),(n.dataset.source!==i||n.dataset.kind!==W)&&(n.dataset.kind=W,n.dataset.source=i,n.hidden=!0,n.removeAttribute(`src`),i?ve(i)?(r.textContent=`이미지를 불러오는 중…`,n.onload=()=>{n.dataset.source===i&&(r.textContent=`이미지 확인됨 · 저장한 변경은 발행해야 사이트에 반영됩니다.`)},n.onerror=()=>{n.dataset.source===i&&(n.hidden=!0,r.textContent=`이미지를 불러올 수 없습니다. 주소를 확인하거나 다시 첨부해 주세요.`)},ft(i).then(e=>{n.dataset.source===i&&(n.src=e,n.hidden=!1)}).catch(()=>{n.dataset.source===i&&(r.textContent=`이미지를 불러올 수 없습니다. 다시 첨부해 주세요.`)})):r.textContent=`이미지 주소를 확인하거나 첨부 버튼으로 다시 등록해 주세요.`:r.textContent=W===`about`?`등록된 프로필 사진이 없습니다.`:`등록된 표지가 없습니다.`)}function vt(){if(!L||(O(`word-count`).textContent=`${K.characters().toLocaleString()}자`,_t(),O(`preview-panel`).hidden))return;O(`preview-title`).textContent=A.value||`제목 없는 ${D[W]}`;let e=q.read(L.document.metadata),t=_(e);W===`about`&&(O(`preview-title`).textContent=String(t.name??lt.siteTitle())),O(`preview-date`).textContent=W===`blog`?P.value:W===`books`?String(e.date||`발행 시 날짜가 저장됩니다.`):W===`about`?String(t.location??``):[e.category,e.status,e.period,e.role].filter(Boolean).join(` · `);let n=O(`preview-cover`);n.alt=W===`about`?`프로필 사진 미리보기`:`표지 미리보기`;let r=String(W===`about`?t.image??``:e[W===`books`?`cover`:`img`]??``);r.startsWith(`assets/`)&&(r=`/`+r),r&&!r.includes(`/`)&&(r=`/assets/img/`+r),n.hidden=W===`blog`||!ve(r),n.classList.toggle(`preview-avatar`,W===`about`),n.classList.toggle(`preview-avatar--square`,W===`about`&&t.image_circular!==!0),n.dataset.source=r,n.hidden||ft(r).then(e=>{n.dataset.source===r&&(n.src=e)}).catch(()=>{n.hidden=!0}),O(`preview-bio`).hidden=W!==`about`,O(`preview-bio`).textContent=String(t.bio??`개발하며 배운 것, 캐나다에서의 일상, 관심 있는 것들을 기록합니다.`),O(`preview-tags`).replaceChildren(...$e.value.split(`,`).filter(e=>e.trim()).map(e=>{let t=document.createElement(`span`);return t.textContent=`#${e.trim()}`,t})),O(`preview-body`).replaceChildren(Se(K.getBody()));for(let e of O(`preview-body`).querySelectorAll(`img`)){let t=e.getAttribute(`src`)??``;t.startsWith(`/api/media/`)&&e.removeAttribute(`src`),ft(t).then(t=>{e.isConnected&&(e.src=t)}).catch(()=>{e.alt=`이미지를 불러오지 못했습니다.`})}}function yt(e){O(`write-panel`).hidden=e,O(`source-attach`).hidden=e||!K.isSource(),O(`preview-panel`).hidden=!e,O(`write-tab`).setAttribute(`aria-pressed`,String(!e&&!K.isSource())),O(`source-tab`).setAttribute(`aria-pressed`,String(!e&&K.isSource())),O(`preview-tab`).setAttribute(`aria-pressed`,String(e)),e&&vt()}O(`write-tab`).addEventListener(`click`,()=>yt(!1)),O(`source-tab`).addEventListener(`click`,()=>yt(!1)),O(`preview-tab`).addEventListener(`click`,()=>yt(!0)),O(`save`).addEventListener(`click`,()=>void Q().catch(()=>{})),O(`download`).addEventListener(`click`,()=>{if(!L)return;let e=mt(),t=ce(e,new Map,!0),n=URL.createObjectURL(new Blob([t],{type:`text/markdown;charset=utf-8`})),r=document.createElement(`a`);r.href=n,r.download=`${W===`blog`?e.date+`-`:``}${e.slug||`draft`}.md`,r.click(),URL.revokeObjectURL(n),pt(`본문을 내려받았습니다. 첨부 이미지는 비공개 초안에 보관됩니다.`)});async function $(){let e=W,t=U,n=++st,r;try{r=await G(`/api/drafts?collection=${e}${t?`&trash=1`:``}`)}catch(r){if(n===st&&e===W&&t===U)throw r;return}n===st&&e===W&&t===U&&(at=r.drafts,bt())}function bt(){O(`search`).placeholder=H?`${D[W]} 주소로 검색`:`제목으로 검색`;let e=O(`search`).value.toLowerCase(),t=O(`post-list`);t.replaceChildren();let n=H?(ot??[]).map(e=>({label:e.path.split(`/`).at(-1).replace(/\.md$/,``),language:e.language,detail:`${e.language===`ko`?`한국어`:`English`} · ${e.published===!1?`발행 취소 · `:``}${e.path.split(`/`).slice(1,-1).join(` / `)}`,action:()=>Ct(e.path),selected:L?.document.sourcePath===e.path})):at.map(e=>({label:e.title||`제목 없는 ${D[W]}`,language:e.language,detail:`${e.language===`ko`?`한국어`:e.language===`en`?`English`:`언어 미지정`} · ${U?`휴지통 · 클릭하여 복원`:e.sourcePath?e.published===!1?`발행 취소된 작업본`:`발행된 글의 작업본`:`비공개 초안`} · ${new Date(e.updated).toLocaleDateString(`ko-KR`)}`,action:()=>U?St(e.id,e.version):xt(e.id),selected:L?.id===e.id}));for(let r of n.filter(t=>(tt.value===`all`||t.language===tt.value)&&`${t.label} ${t.detail}`.toLowerCase().includes(e))){let e=document.createElement(`button`);e.className=`post-item`,e.setAttribute(`aria-current`,String(r.selected));let n=document.createElement(`strong`);n.textContent=r.label;let i=document.createElement(`small`);i.textContent=r.detail,e.append(n,i),e.addEventListener(`click`,()=>void r.action().catch(Y)),t.append(e)}if(!t.childElementCount){let n=document.createElement(`p`);n.className=`muted`,n.textContent=e?`검색 결과가 없습니다.`:U?`휴지통이 비어 있습니다.`:H?`불러온 글이 없습니다.`:`아직 초안이 없습니다.`,t.append(n)}}async function xt(e){if(!B){B=!0;try{if(!await ht())return;Z(await G(`/api/drafts/${e}`))}finally{B=!1}}}async function St(e,t){if(!(B||z)){B=!0,X(!0);try{let n=await G(`/api/drafts/${e}/restore`,{method:`POST`,body:JSON.stringify({version:t})});U=!1,O(`trash-tab`).setAttribute(`aria-pressed`,`false`),O(`draft-tab`).setAttribute(`aria-pressed`,`true`),Z(n),await $(),J(`초안을 복원했습니다.`)}finally{X(!1),B=!1}}}async function Ct(e){if(!B){B=!0;try{if(!await ht())return;Z(await G(`/api/posts/open`,{method:`POST`,body:JSON.stringify({path:e})})),await $()}finally{B=!1}}}tt.addEventListener(`change`,bt),F.addEventListener(`change`,()=>{lt.refreshCategories(),Ke(W,F.value)});for(let e of[`en`,`ko`])O(`about-${e}`).addEventListener(`click`,()=>void Ct(e===`ko`?`_pages/ko/about.md`:`_pages/about.md`).catch(Y));O(`add-translation`).addEventListener(`click`,()=>void(async()=>{if(!(!L?.document.sourcePath||B||z)){B=!0;try{if(!await ht())return;let e=S(mt()),t=x(e);Z(await G(`/api/drafts`,{method:`POST`,body:JSON.stringify({document:e})})),H=!1,U=!1,O(`trash-tab`).setAttribute(`aria-pressed`,`false`),O(`draft-tab`).setAttribute(`aria-pressed`,`true`),O(`post-tab`).setAttribute(`aria-pressed`,`false`),await $(),pt(`${t===`ko`?`한국어`:`English`} 번역 초안을 만들었습니다. 원문 본문과 이미지를 가져왔습니다. 제목·요약·본문을 번역한 뒤 별도로 발행하세요.`),A.focus()}finally{B=!1}}})().catch(Y)),O(`search`).addEventListener(`input`,bt),O(`trash-tab`).addEventListener(`click`,()=>void(async()=>{if(!(B||z)){B=!0;try{if(!await ht())return;L=null,R=!1,clearTimeout(V),H=!1,U=!0,O(`editor`).hidden=!0,O(`empty`).hidden=!1,O(`empty-heading`).textContent=`휴지통`,O(`empty-description`).textContent=`목록에서 초안을 클릭하면 본문과 첨부 이미지를 함께 복원합니다.`,O(`draft-tab`).setAttribute(`aria-pressed`,`false`),O(`post-tab`).setAttribute(`aria-pressed`,`false`),O(`trash-tab`).setAttribute(`aria-pressed`,`true`),await $()}finally{B=!1}}})().catch(Y)),O(`draft-tab`).addEventListener(`click`,()=>{H=!1,U=!1,O(`trash-tab`).setAttribute(`aria-pressed`,`false`),O(`draft-tab`).setAttribute(`aria-pressed`,`true`),O(`post-tab`).setAttribute(`aria-pressed`,`false`),$().catch(Y)}),O(`post-tab`).addEventListener(`click`,()=>{let e=W,t=++st;H=!0,U=!1,O(`trash-tab`).setAttribute(`aria-pressed`,`false`),O(`draft-tab`).setAttribute(`aria-pressed`,`false`),O(`post-tab`).setAttribute(`aria-pressed`,`true`),(async()=>{if(!ot){J(`기존 ${D[W]} 불러오는 중…`);let n;try{n=await G(`/api/posts?collection=${e}`)}catch(n){if(t===st&&e===W&&H)throw n;return}if(t!==st||e!==W||!H)return;ot=n.posts,J(`기존 ${W===`projects`?`프로젝트를`:D[W]+`을`} 불러왔습니다`)}bt()})().catch(Y)}),O(`new-post`).addEventListener(`click`,()=>void(async()=>{if(!B){if(W===`blog`&&!N.value)J(`카테고리를 추가한 뒤 새 글을 작성해 주세요.`);else{B=!0;try{if(!await ht())return;let e=new Date,t=`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`,n={collection:W,title:``,description:``,date:t,slug:``,category:W===`blog`?N.value:``,tags:[],body:``,metadata:{lang:tt.value===`ko`?`ko`:`en`},sourcePath:null,sourceSha:null};Z(await G(`/api/drafts`,{method:`POST`,body:JSON.stringify({document:n})})),H=!1,U=!1,O(`trash-tab`).setAttribute(`aria-pressed`,`false`),O(`draft-tab`).setAttribute(`aria-pressed`,`true`),O(`post-tab`).setAttribute(`aria-pressed`,`false`),await $(),yt(!1),A.focus()}finally{B=!1}}}})().catch(Y));async function wt(e,t=`body`){if(!L||z)return;let n=Array.isArray(e)?e:[e];if(n.length>2)throw Error(`한 번에 이미지를 두 장까지 선택해 주세요.`);if(n.some(e=>!/^image\/(png|jpeg|webp|gif)$/.test(e.type)||e.size>5242880))throw Error(`${Ue/1024/1024}MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요.`);X(!0),J(`이미지 저장 중…`);try{await Q();let e=[];for(let t of n){let n=await G(`/api/drafts/${L.id}/media`,{method:`POST`,headers:{"Content-Type":t.type},body:t});e.push({src:n.url,alt:t.name.replace(/[\[\]\\\n]/g,``)})}e.length===2?K.insertImagePair(e):t===`body`?K.insertImage(e[0].src,e[0].alt):q.setImage(t,e[0].src),gt(),await Q()}finally{ut.changed(),X(!1)}}O(`attach`).addEventListener(`click`,()=>O(`image-file`).click()),O(`source-attach`).addEventListener(`click`,()=>O(`image-file`).click()),O(`cover-attach`).addEventListener(`click`,()=>O(`cover-image-file`).click()),O(`cover-image-file`).addEventListener(`change`,e=>{let t=e.target;t.files?.[0]&&wt(t.files[0],W===`books`?`cover`:W===`about`?`profile.image`:`img`).catch(Y),t.value=``}),O(`image-file`).addEventListener(`change`,e=>{let t=e.target;t.files?.length&&wt(Array.from(t.files)).catch(Y),t.value=``}),M.addEventListener(`paste`,e=>{let t=Array.from(e.clipboardData?.files??[]);t.length&&(e.preventDefault(),wt(t).catch(Y))}),M.addEventListener(`dragover`,e=>{e.dataTransfer?.types.includes(`Files`)&&e.preventDefault()}),M.addEventListener(`drop`,e=>{e.dataTransfer?.files.length&&(e.preventDefault(),wt(Array.from(e.dataTransfer.files)).catch(Y))});var Tt=O(`publish-dialog`),Et=O(`delete-dialog`),Dt=O(`unpublish-dialog`),Ot=null;O(`unpublish`).addEventListener(`click`,()=>{!L?.document.sourcePath||z||B||W===`about`||(Ot=L.id,Dt.returnValue=``,Dt.showModal())}),Dt.addEventListener(`close`,()=>{let e=Ot;Ot=null,Dt.returnValue===`unpublish`&&e&&L?.id===e&&!z&&(async()=>{X(!0);try{await Q(),R&&await Q(),J(`발행 취소 중…`);let t=await G(`/api/drafts/${e}/unpublish`,{method:`POST`,body:JSON.stringify({version:L.version})});Z(t.draft),ot=null,pt(`발행을 취소했습니다. 배포가 끝나면 사이트에서 숨겨집니다. `);let n=document.createElement(`a`);n.href=t.workflowUrl,n.target=`_blank`,n.rel=`noopener noreferrer`,n.textContent=`배포 상태 확인`,O(`notice`).append(n),H=!1,U=!1,O(`post-tab`).setAttribute(`aria-pressed`,`false`),O(`draft-tab`).setAttribute(`aria-pressed`,`true`),O(`trash-tab`).setAttribute(`aria-pressed`,`false`),await $(),J(`발행 취소 완료 · 사이트 반영 대기`)}finally{X(!1)}})().catch(Y)});var kt=null;O(`delete-draft`).addEventListener(`click`,()=>{!L||z||B||(kt=L.id,O(`delete-draft-title`).textContent=L.document.title||`제목 없는 초안`,Et.returnValue=``,Et.showModal())}),Et.addEventListener(`close`,()=>{let e=kt;kt=null,Et.returnValue===`trash`&&e&&L?.id===e&&!z&&(async()=>{X(!0);try{await Q(),R&&await Q(),await G(`/api/drafts/${e}`,{method:`DELETE`,body:JSON.stringify({version:L.version})}),L=null,R=!1,clearTimeout(V),O(`editor`).hidden=!0,O(`empty`).hidden=!1,Ge(W,{category:N,description:j}),H=!1,U=!1,O(`draft-tab`).setAttribute(`aria-pressed`,`true`),O(`post-tab`).setAttribute(`aria-pressed`,`false`),O(`trash-tab`).setAttribute(`aria-pressed`,`false`),await $(),J(`초안을 휴지통으로 옮겼습니다. 휴지통에서 복원할 수 있습니다.`)}finally{X(!1)}})().catch(Y)}),O(`publish`).addEventListener(`click`,()=>{Tt.returnValue=``,Tt.showModal()}),Tt.addEventListener(`close`,()=>{if(Tt.returnValue!==`publish`||!L||z)return;let e=L.id;(async()=>{X(!0);try{await Q(),R&&await Q(),J(`발행 중…`);let t=await G(`/api/drafts/${e}/publish`,{method:`POST`,body:JSON.stringify({version:L.version})});Z(t.draft),ot=null,pt(W===`about`?`소개와 프로필을 발행했습니다. 소개 페이지에 반영되는 중입니다. `:`${W===`projects`?`프로젝트를`:D[W]+`을`} 발행했습니다. 사이트에 반영되는 중입니다. `);let n=document.createElement(`a`);n.href=t.workflowUrl,n.target=`_blank`,n.rel=`noopener noreferrer`,n.textContent=`배포 상태 확인`,O(`notice`).append(n),H=!1,U=!1,O(`trash-tab`).setAttribute(`aria-pressed`,`false`),O(`draft-tab`).setAttribute(`aria-pressed`,`true`),O(`post-tab`).setAttribute(`aria-pressed`,`false`),await $(),J(`발행 완료 · 사이트 반영 대기`)}finally{X(!1)}})().catch(Y)}),O(`logout`).addEventListener(`click`,()=>void(async()=>{lt.canLogout()&&await ht()&&(await G(`/api/logout`,{method:`POST`}),sessionStorage.removeItem(Ye),Ze=``,L=null,R=!1,location.reload())})().catch(Y));async function At(){O(`login-link`).href=k?`${k}/auth/login?editor=site`:`/auth/login`;try{nt=(await G(`/api/session`)).csrf,O(`workspace`).hidden=!1,O(`admin-nav`).hidden=!1,O(`logout`).hidden=!1,J(`연결됨`),await $(),lt.load()}catch(e){O(`login-screen`).hidden=!1,J(`관리자 로그인`);let t=new URLSearchParams(location.search).get(`login`),n=O(`login-message`);t&&(n.textContent=t===`owner-only`?`사이트 소유자 계정으로 로그인해 주세요.`:`로그인을 완료하지 못했습니다. 다시 시도해 주세요.`,history.replaceState(null,``,location.pathname)),(!(e instanceof ct)||e.status!==401)&&(n.textContent=e instanceof Error?e.message:`서버에 연결할 수 없습니다.`,e instanceof ct&&e.status===503&&(O(`login-link`).hidden=!0))}}O(`login-link`).addEventListener(`click`,e=>{if(!k)return;e.preventDefault();let t=crypto.randomUUID();sessionStorage.setItem(Je,t),location.href=`${k}/auth/login?editor=site&client_state=${encodeURIComponent(t)}`}),At();