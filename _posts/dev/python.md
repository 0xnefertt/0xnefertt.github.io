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
try:
    num = int("abc")
    print(num)
except ValuError:
    print("숫자로 바꿀 수 없습니다.")
```

**자주 보는 예외 종류**
| 예외 | 의미 |
| ---| ----|
| ValueError | 값이 잘못됨 |
| TypeError | 타입이 잘못됨 |
| IndexError | 리스트 인덱스 범위 초과 |
| KeyError | 딕셔너리에 없는 키 접근 |
| ZeroDivisionError | 0으로 나눔 |
| FileNotFoundError | 파일이 없음 |

else도 있다.

```python
try:
    num = int("123") #시도
except ValueError:
    print("변환 실패") #실패하면 실행
else:
    print("변환 성공:", num) #성공하면 실행
```

finally도 있다. 성공하든 실패하든 무조건 실행된다.

```python
try:
    num = int("123")
except ValueError:
    print("변환 실패")
finally:
    print("무조건 실행")
```

raise는 내가 직접 에러를 발생시키는 것

```python
age = -1

if (age < 0):
    raise ValueError("나이는 음수가 될 수 없다")

# 결과
# ValueError: 나이는 음수가 될 수 없다
```

## 다른 기능 가져오기 (import / module)

파이썬에서 .py 파일 하나는 하나의 module이고, 그 안에 있는 함수, 변수, 클래스 등을 다른 파일에서 가져와 사용할 때 import를 사용한다.

예를 들면,

```python
project/
├── main.py
└── calculator.py
```

```python
# calculator.py
def add (a,b):
    return a+b

def sub (a,b):
    return a-b
```

이때 calculator.py 가 하나의 module 이다.

```python
# main.py
import calculator

print(calculator.add(1,2))
print(calculator.sub(1,2))
```

여기서 import calculator는 calculator.py 파일의 모듈을 가져오는 것이다.

함수가 아니더라도 변수도 모듈이다. 파일 안에 작성한 함수, 변수, 클래스가 기본적으로 모듈의 속성(attribute)이 된다.

파이썬에는 JS/TS와 달리 export 키워드가 없다.

**자주 쓰는 Python Standard Library 모듈**

1. math (수학 계산용 모듈)

```python
import math

print(math.sqrt(16))      # 제곱근
print(math.ceil(3.2))     # 올림
print(math.floor(3.8))    # 내림
print(math.factorial(5))  # 팩토리얼
print(math.gcd(12, 18))   # 최대공약수
print(math.lcm(12, 18))   # 최소공배수
print(math.pi)            # 원주율
```

2. random (랜덤 값을 만들 때 사용)

```python
import random

print(random.randint(1,10))     # 1-10 사이 정수
print(random.random())          # 0 이상 1 미만 실수
print(random.choice(["a", "b", "c"]))

nums = [1,2,3,4,5]
random.shuffle(nums)            # 랜덤 셔플
print(nums)

print(random.sample(nums, 2))   # 2개 랜덤 선택 출력
```

주의할 점은 random은 보안용 랜덤이 아니라는 것이다.

비밀번호, 토큰, 인증번호 같은 보안 관련 값은 secrets를 쓰는 게 더 맞다.

```python3
import secerets

token = secrets.token_hex(16)
print(token)
```

3. datetime (날짜와 시간을 다룰 때 사용)

```python
import datetime

today = datetime.date.today()   # 오늘 날짜
now = datetime.date.now()       # 현재 시간
d = datetime.date(2026,6, 8)    # 날짜 만들기

datetime.datetime.striptime(d, "%Y-%m-%d")  # 문자열을 날짜로 바꾸기
fiormatted = now.strftime("%Y-%m-%d")       # 날짜를 문자열로 바꾸기
```

4. os
5. sys
6. pathlib
7. json
8. collections
9. itertools
10. heapq
11. bisect
12. re
13. ...

## 파일 경로 다루기 (pathlib)

파일 경로를 문자열이 아니라 Path 객체로 다루는 라이브러리

파일을 읽거나 저장하는 프로그램을 만들 때, "정확히 어디에 있는 파일을 다루는지"를 안정적으로 지정하기 위해 사용된다.

e.g. CSV 파일 읽기, JSON 설정 파일 읽기, 이미지 파일 저장하기, 로그 파일 만들기, 크롤링한 데이터 저장하기, 업로드된 파일 정리하기, AI/RAG용 문서 파일 불러오기, 백업 파일 만들기 등

```python
from pathlib import Path

path = Path("data/user.txt")

print(path)
# 출력
# data/user.txt

print(Path.cwd())       # 현재 작업 폴더 확인하기 (터미널 실행 위치)
print(Path(__file__))   # 현재 실행 중인 파일 위치 확인하기
print(Path(__file__).resoleve())    # 보통 절대경로로 바꿔서 사용함

# 실무 버전
BASE_DIR = Path(__file__).resolve().parent # 현재 파일이 있는 폴더를 BASE_DIR로 잡겠다.

print(path.is_file())          # 파일인지 확인
print(path.is_dir())           # 폴더인지 확인

folder = Path("data")
folder.mkdir()                  # 폴더 생성

# 실무 버전
folder.mkdir(exist_ok=True)     # 이미 폴더가 있어도 에러 내지 말고 생성

print(path.name)    # 파일명 전체
print(path.stem)    # 확장자 뺀 이름
print(path.suffix)  # 확장자
print(path.parent)  # 부모 폴더
```

상대 경로와 절대 경로

- 상대 경로: 현재 실행 위치 기준으로부터의 경로
- 절대 경로: 컴퓨터 루트부터 시작하는 전체 경로

## JSON

Python의 dict / list 데이터를 파일로 저장하거나, JSON 파일을 다시 Python 데이터로 읽어보는 방법

```python
import json

json.loads() # JSON 문자열/파일 -> Python 객체
json.dumps() # Python 객체 -> JSON 문자열/파일

```

## CSV

표 형태 데이터를 다룰 때 사용

```python
import csv

writer = csv.DictWriter(file, fieldnames=["id", "name", "city"])
writer.writeheader()
writer.writerows(users)

reader = writer.DictReader(file)
```

## package / pip / virtual environments / uv

json, pathlib, math 와 같이 기본적으로 제공하는 라이브러리를 제외한 외부 라이브러리를 package 라고 부른다.

package = 남들이 만들어둔 Python 기능 묶음(=라이브러리)

- requests = HTTP 요청
- fastapi = 백엔드 API 서버
- pandas = 데이터 분석
- numpy = 수치 계산
- python-dotenv = .env 환경변수 읽기
- pytest = 테스트

pip는 Python 패키지를 설치하는 도구(Node.js로 치면 npm install)

```python
# pip install requests
python -m pip install requests

import requests

response = requests.get("https://example.com")
print(response.status_code)
```

패키지 버전을 디렉토리 또는 서버마다 독립되게 설정하기 위해서 등장한 것이 virtual environment.
venv = 프로젝트 전용 Python 공간

```python
mkdir python-practice
cd python-practice
python3 -m venv .venv

# python-practice/
# └── .venv/

# 가상환경 ON
source .venv/bin/activate
# (.venv) python-practice % python3 -m pip install requests

# 가상환경 OFF
deactivate
```

다른 사람이 내 프로젝트를 받으면 어떤 패키지를 설치해야 할지 모른다.
그래서 설치 목록을 파일로 적어둔 것이 requirements.txt 이다.

```python
python3 -m pip install -r requirements.txt
```

requirements.txt 는 패키지 목록만 관리를 하고 있다.

프로젝트에는 패키지 목록 말고도 관리할 것이 많다. — 프로젝트 이름, 버전, Python 버전, 의존성 패키지, 테스트 설정, 린터 설정, 포맷터 설정, 빌드 설정 등

이런 걸 한 파일에 적는 pyproject.toml 이 현대적인 방식으로 자주 사용된다.

pyproject.toml (=package.json)

```toml
[project]
name = "python-practice"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "requests"
    "python-dotenv"
]
```

uv는 요즘 많이 쓰는 도구이다.

uv = venv + pip + pyproject.toml + lock 파일 관리를 쉽게 해주는 도구이다.

```shell
uv init python-practice
cd python-practice

uv add requests
uv run python main.py
```

## pandas

pandas는 CSV뿐만 아니라 Excel, SQL, JSON, Parquet같은 여러데이터 소스를 읽을 수 있다.

pandas의 핵심은 DataFrame, 파이썬 안에서 쓰는 엑셀 표 같은 객체이다.

```python
import pandas as pd

df = pd.read_csv("data/users.csv")
print(df)
print(df.head()) # 처음 몇 줄 보기 - 기본 5줄
print(df["name", "city", "salary"]) # 컬럼 보기

korean_users = df[df["country"] == "Korea"] # 조건으로 필터링
older_users = df[df["age"] >= 30]

sorted_df = df.sort_values("name") # 이름 기준으로 정렬 - 기본 오름차순
sorted_df = df.sort_values("name", ascending=False) # 내림차순

df["color"] = "Red" # 새 컬럼 만들기
df["age_next_year"] = df["age"] + 1 # 기존 컬럼을 이용해서 새 컬럼 만들기

df.to_csv("data/users_output.csv", index=False) # CSV로 저장하기
```

## requests

파이썬에서 웹 API에 요청을 보내고 데이터를 받아오는 라이브러리

```python
import requests

response = requests.get("https://api.example.com/users", timeout=10)
# API 요청에는 보통 timeout을 넣는 게 좋다.
# 실무에서 많이 사용하는 방식 - 400번대나 500번대 에러가 오면 예외를 발생 시킨다.
# response.raise_for_status()
# 보통 응답은 JSON 으로 온다.
data = response.json()


# print(response.status_code)
# print(response.text)
print(data["name"])
print(data["city"])
```

## sqlite3

파이썬에 기본으로 들어있는 로컬 파일 기반 데이터베이스이다. 외부 라이브러리를 설치할 필요가 없다.

별도 서버를 띄울 필요 없이, 하나의 .db 파일에 데이터를 저장한다.

```python
# 보통 이 구조
# python-data-practice/
# ├── main.py
# └── data/
#    └── app.db

import sqlite3
from pathlib import Path

data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

db_path = data_dir / "app.db"

connection = sqlite3.connect(db_path)
# DB에 SQL 명령을 보내려면 cursor를 사용한다.
cursor = connection.cursor()

# SQL 실행
connection.commit()
connection.close()

# 테이블 만들기
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    age INTEGER
)
""")

# 데이터 넣기
cursor.execute(
    "INSERT INTO users (name, city, age) VALUES (?, ?, ?)",
    ("nefer", "vancouver", 20)
)

# 데이터 조회하기
cursor.execute("SELECT * FROM users WHERE city = ?", ("vancouver"),)
rows = cursor.fetchall()
print(rows)

# 데이터 수정 및 삭제
cursor.execute("""
UPDATE users
SET age = ?
WHERE name = ?
""", (30, "secret"))

connection.commit()

cursor.execute("""
DELETE FROM users
WHERE name = ?
""", ("secret",))
connection.commit()
```

## class

클래스는 관련있는 데이터와 함수를 하나로 묶는 설계도다.

```python
class User:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def introduce(self):
        return f"My name is {self.name} and I am {self.age} years old."

user = User("Yona", 30)

print(user.name)
print(user.age)
print(user.introduce())
```

- class = 설계도
- instance/object = 설계도로 만든 실제 물건
- attribute = 객체가 가지고 있는 값

```python
# 이렇게 하면 User 설계도로 객체 2개를 만든 것이며, user1과 user2는 서로 다른 객체이다.
user1 = User()
user2 = User()
```

`__init__` 은 초기 설정 함수이다.

self 는 이 객체 자신이다.

클래스의 장점은 같은 구조의 객체를 여러 개 만들 수 있다는 것이다.

클래스에서 꼭 알아야 하는 특수 메서드 (double underscore method, dunder method)

- `__repr__`: 개발자용 객체 표현. print(obj) 또는 repr(obj)에서 보기 좋은 문자열을 만들 때 사용한다. 반드시 문자열을 반환해야 한다.
- `__str__`: 사용자용 문자열 표현. str(obj), print(obj)에서 우선 사용된다. 없으면 `__repr__`이 대신 사용된다.
- `__eq__`: obj1 == obj2 비교 기준을 정한다. 값이 같으면 같은 객체로 볼지 직접 정의할 수 있다.
- `__hash__`: 객체를 set에 넣거나 dict의 key로 쓸 때 필요한 해시값을 정한다. `__eq__`를 직접 정의하면 hash 처리는 조심해야 한다.
- `__len__`: len(obj)를 가능하게 한다.
- `__getitem__`: obj[index]를 가능하게 한다.
- `__contains__`: value in obj를 가능하게 한다.
- `__lt__`: obj1 < obj2 비교 기준을 정한다. 정렬과 관련 있다.

```python
class Product:
    def __init__(self, name, price, quantity):
        self.name = name
        self.price = price
        self.quantity = quantity

    def total_price(self):
        return self.price * self.quantity

    def __repr__(self):
        return (
            f"Product("
            f"name={self.name!r}, "
            f"price={self.price!r}, "
            f"quantity={self.quantity!r}"
            f")"
        )

    def __eq__(self, other):
        if not isinstance(other, Product):
            return NotImplemented

        return (
            self.name == other.name
            and self.price == other.price
            and self.quantity == other.quantity
        )

product1 = Product("Apple", 2, 5)
product2 = Product("Apple", 2, 5)
product3 = Product("Banana", 1, 10)

print(product1)
print(product1.total_price())

print(product1 == product2)
print(product1 == product3)
print(product1 is product2)
```

## type hints / dataclass / project structure

dataclass는 데이터를 담는 클래스를 쉽게 만드는 문법이다. `__init__`, `__repr__`, `__eq__` 등을 자동 생성한다.

```python
from dataclasses import dataclass

@dataclass
class Product:
    name: str
    price: int
    quantity: int

    def total_price(self):
        return self.price * self.quantity
```

```python
# 이런 것들은 type hints 다.
name: str
age: int
```

프로젝트 구조

```python
python-data-practice/
├── pyproject.toml              # 프로젝트 설정, 의존성, 도구 설정
├── README.md                   # 프로젝트 설명
├── .gitignore                  # Git에 올리지 않을 파일 설정
├── data/                       # JSON, CSV 같은 샘플/로컬 데이터
│   └── users.json
├── src/                        # 실제 소스코드
│   └── data_practice/          # 내 Python 패키지
│       ├── __init__.py
│       ├── main.py             # 실행 시작점
│       ├── models.py           # dataclass 같은 데이터 구조
│       ├── paths.py            # 파일 경로 관리
│       ├── services/           # 실제 비즈니스 로직
│       │   ├── __init__.py
│       │   └── user_service.py
│       └── utils/              # 재사용 가능한 작은 도구 함수
│           ├── __init__.py
│           └── json_utils.py
└── tests/                      # 테스트 코드
    └── test_json_utils.py
```

---

| 순서 | 키워드             | 왜 중요한지                                   |
| ---- | ------------------ | --------------------------------------------- |
| 6    | list comprehension | 리스트를 짧고 깔끔하게 처리                   |
| 7    | function 심화      | 기본값, keyword argument, `*args`, `**kwargs` |
| 12   | BeautifulSoup      | HTML 파싱, 크롤링                             |
| 13   | argparse / typer   | CLI 명령어 만들기                             |
| 14   | logging            | 실행 기록 남기기                              |
| 15   | datetime           | 날짜/시간 다루기                              |
| 17   | pytest             | 테스트 코드                                   |

```

```
