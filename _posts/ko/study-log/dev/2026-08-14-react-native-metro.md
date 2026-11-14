---
categories:
  - study-log/dev
date: 2026-08-14
description: 리액트 네이티브는 매트로(Metro)라는 번들러를 사용한다.
lang: ko
last_updated: 2026-11-14
naver_date: 2026-08-14
naver_url: https://blog.naver.com/martin-lee/224378546095
tags:
  - 리액트
  - 리액트네이티브
  - 메트로
title: "[React Native] Metro란 무엇인가?"
translation_key: 2026-08-14-react-native-metro
---

<figure data-image-caption="true">
  <img src="/assets/img/posts/4ac411aa-c20a-54e2-ab55-e7b87cf3687b/425448aa-197f-500f-a5cf-f93e457b19df.jpg" alt="" />
  <figcaption><a href="https://www.ogq.me/backgrounds/1515404">© CoolPubilcDomains, 출처 OGQ</a></figcaption>
</figure>

[https://reactnative.dev/docs/metro](https://reactnative.dev/docs/metro)

[Metro · React Native](https://reactnative.dev/docs/metro)

리액트 네이티브는 매트로(Metro)라는 번들러를 사용한다.

웹에 비유하면 Vite나 Webpack이랑 비슷하다.

```javascript
내 Typscript/Javascript 코드
 ↓
의존성 찾기
 ↓
코드 변환
 ↓
여러 파일 묶기
 ↓
React Native가 실행할 JS 번들러 생성
 ↓
iOS/Android 앱에 전달
```

위 역할을 한다.

조금 더 정확히 나누면

import를 따라가면서 필요한 파일을 찾음

Typscript/JSX 같은 코드를 Javascript로 변환

모듈들을 하나의 실행 가능한 bundle 형태로 구성

개발 중 코드 변경을 감지

Fast Refresh용 변경사항을 앱에 전달

단계로 정의하면

1\. Resolver: import가 실제 어느 파일인지 찾음

2\. Transformer: TS/JSX 등을 대상 플랫폼이 이해할 수 있는 형태로 전환

기본적으로 Babel 계열 transformer 사용

3\. Serializer: 변환된 모듈들을 합쳐서 최종 bundle 생성

[https://metrobundler.dev/](https://metrobundler.dev/)

[Metro](https://metrobundler.dev/)

이전에는 metro.config.js 파일을 만들고 수정이 필요했었다만 요즘은 @react-native/metro-config 나 @expo/metro-config 패키지 안에 메트로 기본 설정이 포함되어있다. 즉, React Native/Expo는 메트로는 뗄레야 뗄 수 없는 존재와도 같다. (단, Metro를 대체하는 기술로는 RePack이 있다. )

RN 0.73 버전의 Metro의 가장 눈에 띄는 변화 중 하나는 Symlink 지원이 안정화되어 기본 활성화 된 것이다.

Symblink(Symbolic Link)는 실제 파일이나 폴더를 복사하는 대신, 다른 위치에 존재하는 파일이나 폴더를 가리키는 링크를 의미한다. \`npm workspace\` 같은 환경에서는 여러 프로젝트가 공통 패키지를 공유하기 위해 이러한 구조를 자주 사용한다.

덕분에 Metro의 Resolver가 Symlink의 실제 경로를 추적하여 공용 패키지를 정상적인 dependency로 인식할 수 있게 되었고, Fast Refresh 같은 개발 기능도 이러한 구조에서 보다 자연스럽게 동작하게 되었다.

즉, RN 0.73의 Metro Symlink 지원은 새로운 앱 기능을 추가한 변화라기보다는 React Native가 현대적인 JavaScript 프로젝트 구조인 monorepo, workspace, shared package 환경을 훨씬 잘 지원하게 된 인프라 개선이라고 볼 수 있다.

기존에는 React Native에서 프로젝트 밖의 공용 코드를 가져다 쓰는 것이 까다로웠다면, RN 0.73 이후에는 Metro가 Symlink를 기본적으로 이해하면서 여러 앱이 하나의 코드를 공유하는 구조를 훨씬 쉽게 구성할 수 있게 되었다.

즉, Metro = RN의 번들러 역할을 해주는 패키지

#리액트

#리액트네이티브

#메트로
