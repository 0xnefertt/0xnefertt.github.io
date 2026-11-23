---
categories:
  - study-log/dev
date: 2026-08-14
description: React Native uses a bundler called Metro.
lang: en
last_updated: 2026-11-14
naver_date: 2026-08-14
naver_url: https://blog.naver.com/martin-lee/224378546095
tags:
  - React
  - React Native
  - Metro
title: "[React Native] What Is Metro?"
translation_key: 2026-08-14-react-native-metro
---

<figure data-image-caption="true">
  <img src="/assets/img/posts/4ac411aa-c20a-54e2-ab55-e7b87cf3687b/425448aa-197f-500f-a5cf-f93e457b19df.jpg" alt="" />
  <figcaption><a href="https://www.ogq.me/backgrounds/1515404">© CoolPubilcDomains, Source: OGQ</a></figcaption>
</figure>

[https://reactnative.dev/docs/metro](https://reactnative.dev/docs/metro)

[Metro · React Native](https://reactnative.dev/docs/metro)

React Native uses a bundler called Metro.

In web terms, it is similar to Vite or Webpack.

```javascript
My TypeScript/JavaScript code
 ↓
Find dependencies
 ↓
Transform the code
 ↓
Bundle multiple files
 ↓
Generate a JS bundle for React Native to execute
 ↓
Deliver it to the iOS/Android app
```

That is what it does.

More specifically:

Follow imports to find the required files.

Transform code such as TypeScript/JSX into JavaScript.

Organize modules into a single executable bundle.

Detect code changes during development.

Deliver changes to the app for Fast Refresh.

Defined as stages:

1\. Resolver: Finds which actual file an import refers to.

2\. Transformer: Converts TS/JSX and similar code into a form the target platform understands.

Uses a Babel-based transformer by default.

3\. Serializer: Combines the transformed modules to produce the final bundle.

[https://metrobundler.dev/](https://metrobundler.dev/)

[Metro](https://metrobundler.dev/)

Previously, you had to create and modify a metro.config.js file, but these days the @react-native/metro-config and @expo/metro-config packages include Metro’s default configuration. In other words, React Native/Expo and Metro are practically inseparable. (RePack is one technology that can replace Metro, however.)

One of the most noticeable Metro changes in RN 0.73 was that symlink support became stable and enabled by default.

A symlink (symbolic link) points to a file or folder in another location instead of copying the actual file or folder. Environments such as npm workspaces frequently use this structure to share common packages across several projects.

As a result, Metro’s Resolver can follow a symlink’s actual path and recognize shared packages as regular dependencies. Development features such as Fast Refresh also work more naturally with this structure.

In other words, Metro’s symlink support in RN 0.73 is better understood as an infrastructure improvement that helps React Native support modern JavaScript project structures—monorepos, workspaces, and shared packages—rather than a change that adds a new app feature.

Previously, using shared code from outside a React Native project was tricky. Since RN 0.73, Metro understands symlinks by default, making it much easier to set up several apps that share the same code.

In short, Metro = The package that serves as RN’s bundler.

#React

#ReactNative

#Metro
