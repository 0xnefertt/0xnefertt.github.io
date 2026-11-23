---
categories:
  - dev
date: 2026-08-06
description: Notes on the basic concepts of React Router
draft: false
lang: en
layout: post
slug: react-router
tags:
  - react
  - react-router
  - dev
title: React Router Basics
translation_key: 2026-08-06-react-router
---

## What is a router?

It is what displays the `<Cart />` screen when a user visits /cart.

```javascript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/products" element={<Products />} />
  <Route path="/cart" element={<Cart />} />
</Routes>
```

**Routing = connecting an address (URL) ↔ a page (screen)**

- Link = the user clicks to navigate
- useNavigate = code triggers navigation
- useParams = retrieves values from the current URL

## 1. Link

It is similar to the HTML `<a>` tag.

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

When a user clicks Product, they navigate to the `/product` page.

It generally allows navigation through client-side routing without reloading the entire browser page.

## 2. useNavigate

While `Link` requires someone to click, `useNavigate` is used to navigate to a page automatically.

```javascript
import { useNavigate } from "react-router";

function Login() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Handle login

    navigate("/");
  };

  return <button onClick={handleLogin}> Login </button>;
}
```

※ `useNavigate(-1);` is equivalent to going back.
