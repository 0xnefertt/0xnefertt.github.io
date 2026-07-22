---
layout: post
title: "자료구조 (Data Structures)"
date: 2026-07-03
description: "Data Structures"
tags:
  - dev
categories:
  - dev
---

자료구조는 **데이터를 효율적으로 저장하고 관리하기 위한 구조**이다.

전체적인 분류는 다음과 같다.

```shell
자료구조 (Data Structures)
├── 1. 선형 자료구조 (Linear)
│   ├── Array / List
│   ├── String
│   ├── Linked List
│   ├── Stack
│   ├── Queue
│   └── Deque
│
├── 2. 해시 기반 자료구조 (Hash-based)
│   ├── Hash Table / Hash Map
│   └── Set
│
├── 3. 트리 계열 (Tree)
│   ├── Tree
│   ├── Binary Tree
│   ├── Binary Search Tree
│   ├── Heap
│   ├── Trie
│   ├── Segment Tree
│   └── Fenwick Tree
│
├── 4. 그래프 계열 (Graph)
│   ├── Graph
│   └── Union-Find
│
└── 5. 특수 자료구조 (Specialized)
    ├── LRU Cache
    ├── Bloom Filter
    ├── Skip List
    └── Suffix Array
```

---

## 선형 자료구조 (Linear Data Structures)

### Array / List

Array는 순서가 있는 여러 개의 데이터를 하나의 자료구조에 저장하는 방식이다.

```python
sources = [90, 85, 100, 86]
```

각 데이터는 Index(0부터 시작)를 가진다.

Index을 이용한 접근은 매우 빠르다 - 시간복잡도는 0(1)

```python
arr = [10,20,30,40]

print(arr[0]);  # 인덱스를 알면 바로 접근 할 수 있다.
print(0)        # 20

arr = 200;      # 수정도 마찬가지 인덱스로 바로 찾아가서 바꾸기 때문에 빠르다.
print(arr);     # [10, 200, 30, 40]

arr.append(50); # 맨 뒤에 붙이는 건 빠르다.
print(arr);     # [10, 200, 30, 40, 50]

arr.pop()       # 맨 뒤에 값만 제거되는거니까 빠르다.
print(arr);     # [10, 200, 30, 40]

# 시간복잡도 O(n)
arr.insert(1,15)    # 중간 삽입, 200, 30, 40을 뒤로 한 칸씩 밀어야 한다.
print(arr);         # [10, 15, 200, 30, 40]

arr.pop(2)      # 중간 삭제, 200이 사라지고 30, 40을 앞당겨야 한다.
print(arr);     # [10, 15, 30, 40]

print(30 in arr)    # True
print(99 in arr)    # False
```

**리스트에서 원하는 값을 찾는 것 = 선형 탐색 (Linear Search)** = 브루트포스 `O(n)`

```python
arr = 10, 15, 30, 40
target = 30

for x in arr:
    if x == target:
        print("catch")
        break
```

이 경우는 데이터가 많아질수록 시간이 늘어난다.

### String

String은 문자들이 순서대로 나열된 자료구조처럼 다룰 수 있는 데이터 타입

```python
text = "hello"
```

내부적으로 생각해보자면 다음과 같다.

index: 0 1 2 3 4

value: h e l l o

그래서 리스트처럼 인덱스로 접근이 가능하다.

수정이 가능한 List와는 달리 String은 수정이 불가능하다.

```python
text[0] = "H"   # Error

new_text ="H" + text[1:]
print(new_text) # Hello
```

문자열을 바구고 싶으면 새 문자열을 만들어야 한다.

**문자열의 일부분을 잘라오는 것 = 슬라이싱 (Slicing)**

```python
# text[start:end]

text = "calendar"

print(text[0:3])    # 'cal'

print(text[:2])     # 'ca'

print(text[:])      # 'calendar'

print(text[-1])     # 'r'

# 문자열 뒤집기
print(text(::-1))   # 'radnelqc'

```

즉, 파이썬에서의 String은 immutable 한 성격을 가지고 있다.

String은 자료형이면서, 선형 자료구조처럼 잘 다룰 수 있어야 한다.

### Linked List

데이터들이 서로 링크로 연결된 자료구조

- List는 순서가 자동으로 정해져있다. 인덱스를 통해 각 원소의 위치에 바로 접근이 가능하다.

- Linked List는 각 데이터가 "다음 데이터가 어디 있는지"를 알고 있고, 별도의 인덱스로 바로 접근하는 구조가 아니다. 그래서 특정 값을 찾거나 위치로 이동하려면 처음 노드부터 차례대로 따라가야 한다.

```python
    [10]->[20]->[30]
    # 중간에 15를 넣는다고 하자.
    [10]->[15]->[20]->[30]
```

삽입/삭제 자체는 연결만 바꾸면 O(1)이지만, 그 위치를 찾는 데 보통 O(n)의 시간복잡도를 갖는다.

파이썬에서는 일반적인 링크드 리스트를 리스트처럼 바로 쓰는 라이브러리가 없어서 직접 구현해서 사용한다.

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

a = Node(10)
b = Node(20)
c = Node(30)

a.next = b
b.next = c

head = a

# [10] -> [20] -> [30] -> None
# 20 삭제
a.next = b.next

# [10] -> [30]
```

`Linked List`에서 중간 노드 삭제는 삭제라기보다 연결에서 뺀다. 라는 개념이 더 와닿는다.

다음으로 head 삭제는 어떻게 해야할까?

마찬가지로 head를 head.next로 둔다.

<!-- TODO: Linked List 노드 추가 -->

### Stack

가장 마지막에 들어온 데이터가 가장 먼저 나가는 자료구조 (=엘리베이터)

LIFO (Last In, First Out)

```python
stack.append(10)
stack.pop()
```

항상 맨 위에서만 넣고 뺀다.

파이썬에서는 별도의 Stack 클래스는 사용하지 않는다.

시간복잡도는 O(1) 이다.

코딩테스트에서는 괄호 문제, DFS, 되돌리기 문제에서 자주 사용된다.

### Queue

가장 먼저 들어온 데이터가 가장 먼저 나가는 자료구조 (=에스컬레이터)

FIFO (First In, First Out)

파이썬에서는 Queue를 만들 때 보통 `list`가 아니라 `collections.deque`를 쓴다.

```python
from collections import deque

queue = deque()

queue.append(10)
queue.append(20)
queue.append(30)

print(queue) # deque([10, 20, 30])

# 앞에서 꺼내기
queue.popleft() #10

# 뒤에 넣기
queue.append(40)
```

시간복잡도는 O(1) 이다.

코딩테스트에서는 BFS, 대기열, 순서대로 처리하는 문제에서 많이 사용된다.

### Deque

Deque = Double-Ended Queue

양쪽 끝에서 넣고 뺄 수 있는 Queue

```python
dq = deque()

dq.append(10) # 오른쪽에 추가
dq.appendleft(5) # 왼쪽에 추가

print(dq) # deque([5, 10])

dq.pop() # 오른쪽에서 삭제
dq.leftpop() #왼쪽에서 삭제
```

전부 시간복잡도는 O(1) 이다.

코딩테스트에서는 BFS, 슬라이딩 윈도우, Monotonic Queue에서 자주 나온다.

## 해시 기반 자료 구조 (Hash-based)

### Hash Table / Hash Map

해시테이블은 키(Key)와 벨류(Value)를 한 쌍으로 저장하는 자료구조

```python
student = {
    "name": "nene",
    "age": 29,
    "major": "Computer Science"
}

# 여기서 왼쪽이 Key, 오른쪽이 Value이다.
# 해시테이블은 Key로 접근한다.
print(student["name"]) # nene

arr = ["nene", 29, "Computer Science"]

# 리스트는 인덱스로 접근한다.
print(arr[0]) # nene
```

결국, 해시테이블은 키로 빠르게 찾기 위한 자료구조이다.

평균적으로 조회, 삽입, 삭제가 O(1)에 가깝다.

- **Hash Function**: Key를 숫자로 바꿔주는 함수

그 숫자를 이용해서 데이터를 저장할 위치를 정한다.

```python
print(hash("name"))
# 위 결과는 -182734928374923847 이런 식의 큰 숫자가 나온다.
```

"name" 이라는 Key -> hash() -> 숫자

해시테이블은 이 숫자를 이용해서 "어느 칸에 저장할지"를 정한다.

### Set
