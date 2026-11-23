---
categories:
  - dev
date: 2026-06-23
description: Notes on state management in React
draft: false
lang: en
layout: post
slug: react-state-manage
tags:
  - react
  - dev
title: React State Management
translation_key: 2026-06-23-react-status-manage
---

State = a value that can change over time and that the system needs to remember.

React follows the philosophy that "when state changes, the screen changes."

Rather than changing the DOM directly, React changes state and recalculates the UI based on that state.

## useState

```javascript
const [count, setCount] = useState(0);
// Current state value: count
// Function that changes state: setCount
// Initial value: 0

count = count + 1; // State cannot be changed directly.
setCount(count + 1); // You must call the function to change it.
```

Because React generally looks at **references** when checking whether state has changed, you create and assign a new value instead of modifying the existing state directly. This is immutability.

React is essentially a tree of components, with parent, child, and sibling relationships. Data flows from top to bottom (parent -> child). Siblings cannot exchange data directly; it must go through a common parent. Passing data from the bottom up is trickier.

Props = values a parent passes down to a child.

## STATE COLOCATION

Keep state as close as possible to where it is used.

## LIFTING STATE UP

When several children need the same state, move it to their nearest common parent.

What if the structure gets more complicated?

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

The intermediate components have to keep passing along props they do not actually use.

## PROPS DRILLING

A situation where intermediate components keep passing props down even though they do not use them.

**Drawbacks**

1. Intermediate components need to know about unnecessary information.

2. Changing the structure becomes a hassle.

3. In TypeScript, props types spread unnecessarily.

To address these drawbacks, change the component structure or use Context or a global state library such as Zustand, Reducx, or Jotai.

## CONTEXT API

A built-in React feature that lets components below access shared values without manually passing props through multiple levels.

Context is a feature for passing values.

```shell
App
↓ user
Layout       Does not use it; only passes it along
↓
Header       Does not use it; only passes it along
↓
Navigation   Does not use it; only passes it along
↓
UserMenu     Actually uses it
```

Using Context here lets you skip those intermediate steps.

```typescript
import { createContext, useContext } from "react"

// Create a channel
const UserContext = createContext(null)

function App() {
  const user = { name: "Sungjun" }

  return (
    // Put the value in
    <UserContext.Provider value={user}>
      <Profile />
    </UserContext.Provider>
  )
}

function Profile() {
    // Retrieve the value
  const user = useContext(UserContext)

  return <p>{user.name}</p>
}
```

Putting too much information into Context makes it harder to manage later. Use Zustand for more complicated cases.

Be careful about putting frequently changing values into Context.

Do not put server data in Context. It does not automatically handle caching, refetching, stale time, or updates after mutations. TanStack Query is more appropriate for that case.

## ZUSTAND

Zustand = a library that creates a global store outside React components, allowing components to retrieve only the values they need from that store.

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
