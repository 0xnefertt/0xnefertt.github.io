---
layout: post
title: "파이썬 collections 라이브러리"
date: 2026-07-03
description: "collections"
tags:
  - python
  - dev
categories:
  - dev
draft: true
---

파이썬의 기본 자료형 list, dict, set, tuple 로는 부족함이 많다.

그래서 collections 라이브러리를 사용하고 코딩테스트 기준으로 중요한 건 `deque`, `Counter`, `defaultdict` 이다.

```python
from collections import deque, Counter, defaultdict
```

1. deque

deque는 빠른 queue다.

---

## References
