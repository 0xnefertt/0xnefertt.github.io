---
layout: post
title: "React 상태 관리"
date: 2026-06-23
slug: react-state-manage
description: "React 상태 관리 관련 내용을 정리한 글"
tags:
  - react
  - dev
categories:
  - dev
draft: false
---

상태(State) = 시간에 따라 변할 수 있고 시스템이 기억해야 하는 값

리액트에서는 "상태가 바뀌면 화면이 바뀐다." 라는 철학을 가지고 있다.

리액트는 DOM을 직접 바꾸는 게 아니라, 상태를 바꾸고 그 상태를 기준으로 UI를 다시 계산한다.

## useState

```javascript
const [count, setCount] = useState(0);
// 현재 상태 값: count
// 상태를 바꾸는 함수: setCount
// 초기값: 0

count = count + 1; // 상태는 직접 변경할 수 없다.
setCount(count + 1); // 함수를 호출해서 바꿔야한다.
```

리액트는 상태가 바뀌었는지 확인할 때 기본적으로 **참조값**을 보기때문에 기존 상태를 직접 수정하지 않고, 새로운 값을 만들어서 넣는다. (=immutability)

리액트는 기본적으로 컴포넌트 트리 구조이며 부모,자식,형제 관계로 부를 수 있다. 데이터는 위에서 아래로 흐른다 (부모 -> 자식). 형제끼지 직접 데이터를 주고받을 수 없으며, 공통 부모를 거쳐야만 한다. 아래에서 위로 전달하는건 까다롭다.

Props = 부모가 자식에게 내려주는 값

## STATE COLOCATION

상태는 그 상태를 사용하는 곳에 최대한 가깝게 둔다.

## LIFTING STATE UP

여러 자식이 같은 상태를 필요로 하면, 그 상태를 가장 가까운 공통 부모로 옮긴다.

만약 구조가 더 복잡해진다면?

```shell
App
├── Layout
│   └── Header
│       └── Navigation
│           └── AuthArea
│               └── LoginButton
└── LoginModal

# App → Layout → Header → Navigation → AuthArea → LoginButton
```

중간 컴포넌트들이 실제로는 그 Props를 사용하지도 않는데 계속 전달해야한다.

## PROPS DRILLING

중간 컴포넌트들이 실제로 쓰지도 않는 Props를 아래로 계속 전달하는 상황

**단점**

1. 중간 컴포넌트가 불필요한 정보를 알아야 한다.

2. 구조 변경이 귀찮아진다.

3. 타입스크립트에서는 props 타입이 불필요하게 퍼진다.

위 단점을 해결하기 위해서는 컴포넌트 구조를 변경하거나 Context 또는 전역 상태 라이브러리인 Zustand, Reducx, Jotai 를 사용해야 한다.

## CONTEXT API

props를 여러 단계로 직접 전달하지 않고, 아래 컴포넌트들이 공통 값을 거내 쓸 수 있게 해주는 React 내장 기능

Context는 값을 전달하는 기능이다.

```shell
App
↓ user
Layout       안 씀, 전달만 함
↓
Header       안 씀, 전달만 함
↓
Navigation   안 씀, 전달만 함
↓
UserMenu     실제 사용
```

이럴 때 Context를 쓰면 중간 전달을 생략할 수 있다.

```typescript
import { createContext, useContext } from "react"

// 통로 만들기
const UserContext = createContext(null)

function App() {
  const user = { name: "Sungjun" }

  return (
    // 값 넣기
    <UserContext.Provider value={user}>
      <Profile />
    </UserContext.Provider>
  )
}

function Profile() {
    // 값 꺼내기
  const user = useContext(UserContext)

  return <p>{user.name}</p>
}
```

Context에 너무 많은 정보를 넣으면 나중에 관리하는게 힘들다. 복잡한 경우라면 Zustand 를 사용하자.

자주 바뀌는 값은 Context에 신중하게 넣어야 한다.

서버 데이터는 Context에 넣지 말자. 캐싱, refetching, stale time, mutaion 후 갱신 같은 걸 자동으로 해주지 않기 때문이다. 이 경우에는 TanStack Query가 더 적합하다.

## ZUSTAND

Zustand = 리액트 컴포넌트 밖에 전역 store를 만들고, 필요한 컴포넌트가 그 store에서 필요한 값만 꺼내 쓰는 라이브러리

```typescript
import { create } from "zustand";

type CounterStore = {
  count: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
};

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,

  increase: () => {
    set((state) => ({
      count: state.count + 1,
    }));
  },

  decrease: () => {
    set((state) => ({
      count: state.count - 1,
    }));
  },

  reset: () => {
    set({
      count: 0,
    });
  },
}));
```
