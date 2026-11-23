---
categories:
  - dev
date: 2026-07-03
description: Data Structures
lang: en
layout: post
tags:
  - dev
title: Data Structures
translation_key: 2026-07-03-data-structures
---

A data structure is a **structure for storing and managing data efficiently**.

The overall classification is as follows.

```shell
Data Structures
├── 1. Linear Data Structures
│   ├── Array / List
│   ├── String
│   ├── Linked List
│   ├── Stack
│   ├── Queue
│   └── Deque
│
├── 2. Hash-based Data Structures
│   ├── Hash Table / Hash Map
│   └── Set
│
├── 3. Trees
│   ├── Tree
│   ├── Binary Tree
│   ├── Binary Search Tree
│   ├── Heap
│   ├── Trie
│   ├── Segment Tree
│   └── Fenwick Tree
│
├── 4. Graphs
│   ├── Graph
│   └── Union-Find
│
└── 5. Specialized Data Structures
    ├── LRU Cache
    ├── Bloom Filter
    ├── Skip List
    └── Suffix Array
```

---

## Linear Data Structures

### Array / List

An array is a way of storing multiple ordered pieces of data in a single data structure.

```python
sources = [90, 85, 100, 86]
```

Each item has an index, starting at 0.

Access by index is very fast: its time complexity is 0(1).

```python
arr = [10,20,30,40]

print(arr[0]);  # If you know the index, you can access the item directly.
print(0)        # 20

arr = 200;      # Updates are also fast because you use the index to find and change the item directly.
print(arr);     # [10, 200, 30, 40]

arr.append(50); # Adding to the end is fast.
print(arr);     # [10, 200, 30, 40, 50]

arr.pop()       # This is fast because only the last value is removed.
print(arr);     # [10, 200, 30, 40]

# Time complexity: O(n)
arr.insert(1,15)    # Insert in the middle: 200, 30, and 40 must each move one position back.
print(arr);         # [10, 15, 200, 30, 40]

arr.pop(2)      # Delete from the middle: 200 disappears, and 30 and 40 must move forward.
print(arr);     # [10, 15, 30, 40]

print(30 in arr)    # True
print(99 in arr)    # False
```

**Finding a desired value in a list = linear search** = brute force `O(n)`

```python
arr = 10, 15, 30, 40
target = 30

for x in arr:
    if x == target:
        print("catch")
        break
```

In this case, the time required increases as the amount of data grows.

### String

A string is a data type that can be treated like a data structure containing an ordered sequence of characters.

```python
text = "hello"
```

You can think of its internal structure as follows.

index: 0 1 2 3 4

value: h e l l o

That is why you can access it by index, just like a list.

Unlike a list, which can be modified, a string cannot be modified.

```python
text[0] = "H"   # Error

new_text ="H" + text[1:]
print(new_text) # Hello
```

To change a string, you must create a new one.

**Extracting part of a string = slicing**

```python
# text[start:end]

text = "calendar"

print(text[0:3])    # 'cal'

print(text[:2])     # 'ca'

print(text[:])      # 'calendar'

print(text[-1])     # 'r'

# Reverse a string
print(text(::-1))   # 'radnelqc'

```

In other words, strings in Python are immutable.

Although a string is a data type, you should also be comfortable treating it as a linear data structure.

### Linked List

A data structure in which items are connected to one another by links.

- A list has an established order. You can access each element's position directly through its index.

- In a linked list, each item knows where the next item is; it is not a structure that allows direct access through an index. To find a particular value or reach a position, you must follow the links in order from the first node.

```python
    [10]->[20]->[30]
    # Suppose we insert 15 in the middle.
    [10]->[15]->[20]->[30]
```

Insertion or deletion itself is O(1) because only the links need to change, but finding that position usually takes O(n) time.

Python does not have a library for using a conventional linked list directly in the same way as a list, so you implement it yourself.

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
# Delete 20
a.next = b.next

# [10] -> [30]
```

Deleting an intermediate node in a `Linked List` makes more sense as removing it from the chain than as deleting it outright.

Next, how should we delete the head?

Similarly, set head to head.next.

<!-- TODO: Add a Linked List node -->

### Stack

A data structure in which the last item to enter is the first to leave, like an elevator.

LIFO (Last In, First Out)

```python
stack.append(10)
stack.pop()
```

Items are always added and removed from the top.

In Python, you do not use a separate Stack class.

The time complexity is O(1).

In coding tests, it is often used for parentheses problems, DFS, and undo operations.

### Queue

A data structure in which the first item to enter is the first to leave, like an escalator.

FIFO (First In, First Out)

In Python, a queue is usually created using `collections.deque` rather than `list`.

```python
from collections import deque

queue = deque()

queue.append(10)
queue.append(20)
queue.append(30)

print(queue) # deque([10, 20, 30])

# Remove from the front
queue.popleft() #10

# Add to the back
queue.append(40)
```

The time complexity is O(1).

In coding tests, it is often used for BFS, waiting queues, and problems requiring processing in order.

### Deque

Deque = Double-Ended Queue

A queue that allows insertion and removal at both ends.

```python
dq = deque()

dq.append(10) # Add on the right
dq.appendleft(5) # Add on the left

print(dq) # deque([5, 10])

dq.pop() # Remove from the right
dq.leftpop() # Remove from the left
```

All of these have O(1) time complexity.

In coding tests, it often appears in BFS, sliding windows, and monotonic queues.

## Hash-based Data Structures

### Hash Table / Hash Map

A hash table is a data structure that stores data as key-value pairs.

```python
student = {
    "name": "nene",
    "age": 29,
    "major": "Computer Science"
}

# The left side is the key, and the right side is the value.
# A hash table is accessed by key.
print(student["name"]) # nene

arr = ["nene", 29, "Computer Science"]

# A list is accessed by index.
print(arr[0]) # nene
```

Ultimately, a hash table is a data structure for finding things quickly by key.

On average, lookup, insertion, and deletion are close to O(1).

- **Hash Function**: A function that converts a key into a number.

That number determines where the data will be stored.

```python
print(hash("name"))
# The result above is a large number, something like -182734928374923847.
```

The key "name" -> hash() -> a number

The hash table uses this number to decide which slot to store the data in.

### Set
