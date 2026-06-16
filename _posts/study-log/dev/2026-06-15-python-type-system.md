---
layout: post
title: "파이썬 타입 시스템 정리"
date: 2026-06-15
description: "파이썬의 객체, 타입, 추상 타입과 인터페이스 개념을 정리한 글"
tags:
  - python
  - type-system
  - dev
categories:
  - dev
---

파이썬 타입 시스템에서 알아보자.

파이썬에서는 숫자, 문자열, 리스트, 함수, 클래스, 모듈까지 거의 전부 다 객체다.

```python
x = 10
name = "0xnefertt"
items = [1, 2, 3]

print(type(x))  # <class 'int'>
print(type(name))  # <class 'str'>
print(type(items))  # <class 'list'>
```

x는 int 타입의 객체, name은 str 타입의 객체

name 안에 들어있는 "0xnefertt"는 문자열 데이터, `name.upper()`는 문자열 객체가 가진 기능이다.

객체 = 데이터와 기능을 함께 가진 것
타입 = 어떤 값/객체가 무엇인지 나타내는 더 넓은 개념

---

## 추상 타입 / 인터페이스

추상 타입 또는 인터페이스 = 특정 기능을 가진 객체

Iterable: 반복 가능한 객체 (list, tuple, str)

Mapping: Key Value식으로 꺼낼 수 있는 객체 (dict)

Callable: 함수처럼 `()`로 호출할 수 있는 객체

collections.abc / typing
