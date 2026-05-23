---
layout: post
title: "Python 기초 정리"
date: 2026-05-22
description: "Python 문법과 기본 개념을 정리한 메모"
tags:
  - python
  - dev
categories:
  - dev
draft: true
---

## 변수

자바스크립트랑 다르게 let, const, var 같은 키워드가 없다. 그냥 변수 이름을 쓰면 된다.

```python
x = 10
y = 20
z = x + y
print(z)  # 30
```

## 조건문

{} 를 쓰지 않고, 들여쓰기로 코드 블록을 구분한다.

```python
age = 18

if age >= 18:
    print("성인입니다.")
elif age >= 13:
    print("청소년입니다.")
else:
    print("미성년자입니다.")
```

### 비교 연산자

- `==`: 같다
- `!=`: 같지 않다
- `<`: 작다
- `>`: 크다
- `<=`: 작거나 같다
- `>=`: 크거나 같다
- `and`: 논리 AND
- `or`: 논리 OR
- `not`: 논리 NOT

## 반복문 (for, while)

python에서는 for 루프가 자주 사용되며, 리스트, 딕셔너리, 집합 등 다양한 데이터 구조를 순회할 수 있다. 또한, while 루프도 사용할 수 있지만, for 루프가 더 간결하고 읽기 쉽다. (do...while 루프는 없다.)

```python
# for 루프
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4
```

```python
# 리스트 순회
fruits = ["사과", "바나나", "오렌지"]
for fruit in fruits:
    print(fruit)
# 사과
# 바나나
# 오렌지
```

```python
# 딕셔너리 순회
person = {"name": "Alice", "age": 30, "city": "Seoul"}
for key, value in person.items():
    print(f"{key}: {value}")
# name: Alice
# age: 30
# city: Seoul
```

```python
# 리스트 컴프리헨션
squares = [x**2 for x in range(10)]
print(squares)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
```

```python
# 딕셔너리 컴프리헨션
squared_dict = {x: x**2 for x in range(5)}
print(squared_dict)  # {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}
```

```python
# 집합 컴프리헨션
squared_set = {x**2 for x in range(5)}
print(squared_set)  # {0, 1, 4, 9, 16}
```

```python
# 제너레이터 표현식
squared_gen = (x**2 for x in range(5))
for square in squared_gen:
    print(square)  # 0, 1, 4, 9, 16
```

```python
# while 루프
count = 0
while count < 5:
    print(count)  # 0, 1, 2, 3, 4
    count += 1
```

```python
# 무한 루프
while True:
    response = input("종료하려면 'exit'를 입력하세요: ")
    if response == "exit":
        break
```

### break, continue

- `break`: 루프를 즉시 종료한다.
- `continue`: 현재 반복을 건너뛰고 다음 반복으로 넘어간다.

```python
for i in range(10):
    if i == 5:
        break  # i가 5일 때 루프 종료
    print(i)  # 0, 1, 2, 3, 4
```

## 함수

함수는 `def` 키워드로 정의한다. 함수는 입력값;argument(매개변수;parameter)을 받아서 특정 작업을 수행하고, 결과;return를 반환할 수 있다.

```python
def greet(name):
return f"Hello, {name}!"
```

```python
def add(a, b):
    return a + b
```

```python
def factorial(n):
    if n == 0:
        return 1
    else:
        return n * factorial(n - 1)
```

```python
def fibonacci(n):
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n - 1) + fibonacci(n - 2)
```

## 리스트

리스트는 대괄호 `[]`로 정의하며, 다양한 데이터 타입을 포함할 수 있다. 리스트는 가변적이며, 요소를 추가, 제거, 수정할 수 있다.

```python
fruits = ["사과", "바나나", "오렌지"]
print(fruits[0])  # 사과
print(fruits[1])  # 바나나
print(fruits[2])  # 오렌지
print(fruits[-1])  # 오렌지 (마지막 요소)
```

append, insert, remove, pop, clear, sort, reverse 등 다양한 리스트 메서드가 있다.

```python
fruits.append("포도")  # 리스트 끝에 요소 추가
fruits.insert(1, "키위")  # 인덱스 1에 요소 삽입
fruits.remove("바나나")  # 특정 요소 제거
last_fruit = fruits.pop()  # 마지막 요소 제거 및 반환
fruits.clear()  # 리스트 비우기
fruits.sort()  # 리스트 정렬
fruits.reverse()  # 리스트 역순으로 정렬
fruits.slice(1, 3)  # 인덱스 1부터 2까지의 요소 반환
```

리스트 컴프리헨션을 사용하여 리스트를 간결하게 생성할 수 있다.

## 딕셔너리

딕셔너리는 중괄호 `{}`로 정의하며, 키-값 쌍으로 데이터를 저장한다. 딕셔너리는 가변적이며, 요소를 추가, 제거, 수정할 수 있다.

```python
person = {"name": "Alice", "age": 30, "city": "Seoul"}
print(person["name"])  # Alice
print(person["age"])   # 30
print(person["city"])  # Seoul
```

딕셔너리 메서드로는 keys, values, items, get, pop 등이 있다.

```python
keys = person.keys()  # 딕셔너리의 모든 키 반환
values = person.values()  # 딕셔너리의 모든 값 반환
items = person.items()  # 딕셔너리의 모든 키-값 쌍 반환
age = person.get("age")  # 키에 해당하는 값 반환
removed_value = person.pop("city")  # 특정 키-값 쌍 제거 및 반환
```

## 문자열 다루기

문자열은 작은따옴표 `'` 또는 큰따옴표 `"`로 정의할 수 있다. 문자열은 불변적이며, 다양한 메서드를 통해 조작할 수 있다.

```python
greeting = "Hello, World!"
print(greeting.upper())  # "HELLO, WORLD!"
print(greeting.lower())  # "hello, world!"
print(greeting.replace("World", "Python"))  # "Hello, Python!"
print(greeting.split(", "))  # ["Hello", "World!"]
print(greeting.strip("!"))  # "Hello, World"
print(greeting.strip()) # "Hello, World!" (양쪽 공백 제거)
print(greeting.join(["Goodbye", "World!"]))  # "GoodbyeWorld!"
```

```python
### in 은 문자열 내에서 특정 부분이 존재하는지 확인하는 연산자로 사용된다.
title = "Coding in Python"
if ("Coding" in title):
    print("제목에 'Coding'이 포함되어 있습니다.")
else:
    print("제목에 'Coding'이 포함되어 있지 않습니다.")
```

```python
file_path = "/path/to/file.txt"

for file in files:
    if file.endswitch(".pdf");
        print("pdf 파일입니다." )
    elif file.endswitch(".txt");
        print("텍스트 파일입니다.")
    else:
        print("알 수 없는 파일 형식입니다.")
```

```python
name = "Alice"
greeting = f"Hello, {name}!"  # f-string을 사용하여 문자열
print(greeting)  # "Hello, Alice!"
```

## 파일 읽고 쓰기

파일을 읽고 쓰기 위해서는 `open()` 함수를 사용한다. 파일을 열 때는 모드를 지정해야 하는데, 일반적으로 읽기는 `'r'`, 쓰기는 `'w'`, 추가는 `'a'` 모드를 사용한다.

```python
# 파일 쓰기
with open("example.txt", "w") as file:
    file.write("Hello, World!\n")
    file.write("This is a sample file.\n")
# 파일 읽기
with open("example.txt", "r") as file:
    content = file.read()
    print(content)
# 파일 추가 (기존 내용을 유지하면서 아래에 추가하려면 "a" 모드)
with open("example.txt", "a") as file:
    file.write("This line is added to the file.\n")
```

## 예외 처리

예외 처리는 `try`와 `except` 블록을 사용하여 수행한다. 예외가 발생할 수 있는 코드를 `try` 블록에 작성하고, 예외가 발생했을 때 실행할 코드를 `except` 블록에 작성한다.

```python

---

| 순서 | 키워드                     | 왜 중요한지                                   |
| ---- | -------------------------- | --------------------------------------------- |
| 1    | `try / except`             | 에러 처리. 자동화에서 필수                    |
| 2    | `import` / module          | 다른 기능 가져오기                            |
| 3    | `pathlib`                  | 파일 경로 다루기                              |
| 4    | `json`                     | 설정 파일, API 데이터 다루기                  |
| 5    | `csv`                      | 엑셀 비슷한 데이터 다루기                     |
| 6    | list comprehension         | 리스트를 짧고 깔끔하게 처리                   |
| 7    | function 심화              | 기본값, keyword argument, `*args`, `**kwargs` |
| 8    | class                      | 객체지향 기본                                 |
| 9    | virtual environment / `uv` | 프로젝트 환경 관리                            |
| 10   | pip / package              | 외부 라이브러리 설치                          |
| 11   | requests                   | 웹페이지/API 요청                             |
| 12   | BeautifulSoup              | HTML 파싱, 크롤링                             |
| 13   | argparse / typer           | CLI 명령어 만들기                             |
| 14   | logging                    | 실행 기록 남기기                              |
| 15   | datetime                   | 날짜/시간 다루기                              |
| 16   | SQLite                     | 작은 로컬 DB 저장                             |
| 17   | pytest                     | 테스트 코드                                   |
| 18   | type hints                 | 타입 표시, 실무 코드 품질                     |
| 19   | dataclass                  | 깔끔한 데이터 구조                            |
| 20   | project structure          | 실제 프로젝트 폴더 구조                       |
```
