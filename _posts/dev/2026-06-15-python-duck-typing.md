---
layout: post
title: "파이썬 덕 타이핑 정리"
date: 2026-06-15
description: "파이썬의 덕 타이핑 개념과 isinstance()와의 차이를 예제로 정리한 글"
tags:
  - python
  - duck-typing
  - dev
categories:
  - dev
---

## 요약

덕 타이핑은 객체의 실제 클래스보다 필요한 메서드나 속성을 가지고 있는지를 기준으로 객체를 다루는 방식이다. 파이썬에서는 특정 타입인지 먼저 검사하기보다, 필요한 동작을 호출해 보고 사용할 수 있는지를 중심으로 코드를 작성하는 경우가 많다.

덕 타이핑(duck typing)은 파이썬에서 객체와 클래스를 학습하다 보면 등장하는 용어이다. 이 이름은 "If it walks like a duck, and quacks like a duck, it is a duck" (만약 그것이 오리처럼 걷고, 오리처럼 꽥꽥 소리를 내면, 그것은 오리라고 봐도된다.)의 오래된 표현에서 유래한 것으로 알려져 있다. 즉, 프로그래밍상에서 덕 타이핑은 객체가 어떤 클래스에서 만들어졌는지보다, 필요한 기능을 가지고 있는지를 더 중요하게 보는 방식이다. 필요한 기능을 가지고 있으면 그 타입처럼 써도 된다 라는 의미이기도 하다. 파이썬에서는 유명하지만, 원래는 동적 타입 언어 전반에서 흔한 사고 방식이다.

예시로 알아보자.

먼저 강아지와 고양이 클래스가 있다.

```python
class Dog:
    def sound(self):
        return "멍멍"

class Cat:
    def sound(self):
        return "야옹"

class Robot:
    def sound(self):
        return "삐빅"

class Car:
    def drive(self):
        return "부릉부릉"

def make_sound(obj):
    # 여기서 obj가 Dog인지, Cat인지, Robot인지 확인하지 않는다.
    # 중요한 것은 obj가 sound() 기능을 가지고 있느냐다.
    print(obj.sound())

dog = Dog()
cat = Cat()
robot = Robot()

make_sound(dog)     # 멍멍
make_sound(cat)     # 야옹
make_sound(robot)   # 삐빅

# Dog, Cat, Robot은 서로 다른 클래스이다.
# 다만, 모두 같은 sound() 메서드를 가지고 있기 때문에
# make_sound() 함수에서 같은 방식으로 사용할 수 있다.

car = Car()
# make_sound(car) 에러 발생
# AttributeError: 'Car' object has no attribute 'sound'
```

위 코드에서 make_sound() 함수는 객체가 Dog인지, Cat인지, Robot인지 확인하지 않는다. 대신 sound() 메서드를 사용할 수 있는지만 본다. Dog, Cat, Robot은 서로 다른 클래스이지만 모두 sound() 메서드를 가지고 있기 때문에 같은 함수에서 사용할 수 있다.

덕 타이핑을 처음 보면 “그냥 메서드가 있으면 쓰는 거 아닌가? 너무 당연한 거 아닌가?”라고 느낄 수 있다. 사실 파이썬만 사용하다 보면 이 개념이 별로 특별하거나 중요하지 않게 느껴질 수도 있다.

하지만 덕 타이핑의 핵심은 바로 그 “당연해 보이는 방식”에 있다. 덕 타이핑은 isinstance(obj, Duck)처럼 객체가 특정 클래스인지 먼저 확인하는 방식이 아니다. 대신 obj.quack()처럼 내가 필요한 기능을 실제로 사용할 수 있는지를 보고 객체를 다루는 방식이다.

즉, “이 객체가 Duck 클래스인가?”를 묻기보다 “이 객체가 quack()을 할 수 있는가?”를 보는 것이다. 파이썬에서는 이런 방식이 자연스러운 특성 중 하나이다.

**isinstance()**는 어떤 객체가 특정 클래스/타입으로 만들어졌는지 확인하는 함수.

```python
x = 10

print(isinstance(x,int))    # True
print(isinstance(x, str))   # False

items = [1,2,3]

print(isinstance(items, list))  # True

class Animal:
    pass

class Dog(Animal):
    pass

dog = Dog()

print(isinstance(dog, Dog))     # True
# 상속 관계도 인식한다.
print(isinstance(dog, Animal))  # True
```

## 결론

덕 타이핑은 파이썬 코드가 유연하게 동작할 수 있게 해주는 중요한 사고 방식이다. 다만 필요한 메서드가 없으면 실행 시점에 오류가 나기 때문에, 어떤 동작을 기대하는지 함수 이름과 예외 처리로 명확하게 드러내는 것이 좋다.
