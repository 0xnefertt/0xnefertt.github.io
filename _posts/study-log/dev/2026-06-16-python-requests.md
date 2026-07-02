---
layout: post
title: "파이썬 HTTP client 라이브러리"
date: 2026-06-16
description: "파이썬 HTTP 클라이언트 라이브러리 개념을 정리한 글"
tags:
  - python
  - dev
categories:
  - dev
---

오늘 알아볼 파이썬 HTTP client 라이브러리는 사실상 코딩테스트와는 거리가 멀다.

하지만 추후 웹 개발자로 일하게 된다면 외부 API 호출, 크롤링, 서버 간 통신, 인증 요청 등을 다룰 때 자주 필요할 수 있다. 현재 백엔드 언어로 Python을 공부하고 있기도하고 해당 라이브러리가 Python에서 가장 많이 사용되며 기본이 되는 라이브러리이기에 가볍게 개념을 잡고자 정리해보리고 했다.

대표적인 라이브러리로는 `requests`, `httpx`, `aiohttp`, `urllib`, `urllib3`, `grequests`, `treq`, `pycurl` 등이 있다.

가장 기본이 되는 HTTP와 HTTPS부터 알아보자.

## HTTP란?

HTTP = HyperText Transfer Protocol

클라이언트와 서버가 데이터를 주고받기 위한 통식 규칙이다.

웹에서 브라우저가 서버에 페이지나 데이터를 요청할 때 HTTP를 사용한다.

즉, HTTP는 웹에서 클라이언트와 서버가 대화하는 방식이라고 볼 수 있다

```text
Client -> Request -> Server
Client <- Response <- Server
```

## HTTPS란?

HTTPS = HTTP Secure

기본적으로 HTTP와 같은 방식으로 요청과 응답을 주고받지만, 중간에 TLS라는 암호화 계층이 추가된다.

- HTTP + TLS

HTTP만 사용하면 중간에서 누군가 데이터를 엿볼 가능성이 있다. 반면 HTTPS는 클라이언트와 서버 사이의 통신을 암호화해서, 로그인 정보나 결제 정보 같은 민감한 데이터를 더 안전하게 주고받을 수 있게 해준다.

요즘 웹사이트는 대부분 HTTPS를 사용한다.

### TLS란?

TLS = Transport Layer Security

인터넷에서 클라이언트와 서버가 주고받는 데이터를 암호화해서 보호하는 보안 기술

TLS가 해주는 일은

1. 암호화: 중간에서 훔쳐봐도 내용을 알기 어렵게 함
2. 인증: 내가 접속한 서버가 진짜 그 서버인지 확인
3. 무결성: 중간에서 데이터가 변조되지 않았는지 확인

흐름을 단순화하면 다음과 같다.

브라우저가 서버에 접속 요청 > 서버가 TLS 인증서를 보냄 > 브라우저가 인증서 검증 > 서로 암호화에 사용할 키를 안전하게 합의 > 이후 HTTP 데이터를 암호화해서 주고 받음

위 과정을 TLS handshake라고 한다.
