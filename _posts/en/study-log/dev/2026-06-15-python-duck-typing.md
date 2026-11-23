---
categories:
  - dev
date: 2026-06-15
description: An explanation of duck typing in Python and how it differs from isinstance(), with examples
lang: en
layout: post
tags:
  - python
  - duck-typing
  - dev
title: Understanding Duck Typing in Python
translation_key: 2026-06-15-python-duck-typing
---

Duck typing is a way of working with objects based on whether they have the methods or attributes you need, rather than their actual class. In Python, code is often written around calling the required operation and seeing whether it can be used, instead of first checking for a particular type.

Duck typing is a term you encounter when learning about objects and classes in Python. Its name is said to come from the old expression, "If it walks like a duck, and quacks like a duck, it is a duck." In programming, this means placing more importance on whether an object has the functionality you need than on the class it was created from. If it has the required functionality, you can use it as though it were that type. Although well known in Python, this way of thinking is common across dynamically typed languages.

Let's look at an example.

First, we have classes for a dog and a cat.

```python
class Dog:
    def sound(self):
        return "Woof"

class Cat:
    def sound(self):
        return "Meow"

class Robot:
    def sound(self):
        return "Beep"

class Car:
    def drive(self):
        return "Vroom"

def make_sound(obj):
    # We do not check whether obj is a Dog, Cat, or Robot here.
    # What matters is whether obj has the sound() functionality.
    print(obj.sound())

dog = Dog()
cat = Cat()
robot = Robot()

make_sound(dog)     # Woof
make_sound(cat)     # Meow
make_sound(robot)   # Beep

# Dog, Cat, and Robot are different classes.
# However, because they all have the same sound() method,
# they can be used in the same way in make_sound().

car = Car()
# make_sound(car) raises an error
# AttributeError: 'Car' object has no attribute 'sound'
```

In the code above, make_sound() does not check whether an object is a Dog, Cat, or Robot. Instead, it only looks at whether the sound() method can be used. Dog, Cat, and Robot are different classes, but they can all be used in the same function because each has a sound() method.

When you first encounter duck typing, you might think, "Isn't this just using a method if it exists? Isn't that obvious?" In fact, if you only use Python, the concept may not feel particularly special or important.

But that "seemingly obvious approach" is exactly what duck typing is about. Duck typing does not first check whether an object belongs to a particular class, as isinstance(obj, Duck) does. Instead, it works with objects by checking whether the functionality you need can actually be used, as with obj.quack().

In other words, rather than asking, "Is this object an instance of the Duck class?", you ask, "Can this object quack()?" This approach is one of Python's natural characteristics.

<strong>isinstance()</strong> is a function that checks whether an object was created from a particular class/type.

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
# It also recognizes inheritance relationships.
print(isinstance(dog, Animal))  # True
```

Duck typing is an important way of thinking that lets Python code work flexibly. However, a missing method causes an error at runtime, so it is a good idea to make the expected behavior clear through function names and exception handling.
