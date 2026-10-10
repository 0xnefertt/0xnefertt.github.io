---
lang: ko
layout: post
title: "React Router 기초 정리"
date: 2026-08-06
slug: react-router
description: "React Router 기본 개념을 정리한 메모"
tags:
  - react
  - react-router
  - dev
categories:
  - dev
draft: false
---

## 라우터(router)란 뭘까?

사용자가 /cart 로 들어갔을 때 `<Cart />` 화면이 나오는 것

```javascript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/products" element={<Products />} />
  <Route path="/cart" element={<Cart />} />
</Routes>
```

**라우팅 = 주소(URL) ↔ 페이지(화면)를 연결하는 것**

- Link = 사용자가 클릭해서 이동
- useNavigate = 코드가 강제로 이동
- useParams = 현재 URL에 들어있는 값을 꺼냄

## 1. Link

HTML의 `<a>` 태그와 비슷하다.

```javascript
import { Link } from "react-router";

function Header() {
  return (
    <nav>
      <Link to="/"> Home </Link>
      <Link to="/product"> Product </Link>
      <Link to="/cart"> Cart </Link>
    </nav>
  );
}
```

사용자가 Product 를 클릭하면 `/product` 페이지로 이동한다.

일반적으로 브라우저 전체 페이지를 새로 로드하지 않고 client-side routing으로 이동하게 해준다.

## 2. useNavigate

`Link`는 사람이 클릭해야한다면, `useNavigate`는 자동으로 페이지를 이동시켜줄 때 사용한다.

```javascript
import { useNavigate } from "react-router";

function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // 로그인 처리

    navigate("/");
  };

  return <button onClick={handleLogin}> Login </button>;
}
```

※ `useNavigate(-1);`은 뒤로가기와 같다.
