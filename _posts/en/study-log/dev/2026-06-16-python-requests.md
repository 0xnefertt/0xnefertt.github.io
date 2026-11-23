---
categories:
  - dev
date: 2026-06-16
description: Notes on the concepts behind Python HTTP client libraries
lang: en
layout: post
tags:
  - python
  - dev
title: Python HTTP Client Libraries
translation_key: 2026-06-16-python-requests
---

The Python HTTP client libraries we will look at today do not really have much to do with coding tests.

However, if you later work as a web developer, you may often need them for external API calls, crawling, communication between servers, and authentication requests. I am currently studying Python as a backend language, and because these are widely used, foundational Python libraries, I decided to write down the basics to get a general understanding.

Some representative libraries are `requests`, `httpx`, `aiohttp`, `urllib`, `urllib3`, `grequests`, `treq`, and `pycurl`.

Let's start with the fundamentals: HTTP and HTTPS.

## What is HTTP?

HTTP = HyperText Transfer Protocol

It is a set of communication rules that allows clients and servers to exchange data.

On the web, a browser uses HTTP to request pages or data from a server.

In other words, HTTP is the way clients and servers talk to each other on the web.

```text
Client -> Request -> Server
Client <- Response <- Server
```

## What is HTTPS?

HTTPS = HTTP Secure

It basically exchanges requests and responses in the same way as HTTP, but adds an encryption layer called TLS.

- HTTP + TLS

With HTTP alone, someone in the middle may be able to snoop on the data. HTTPS, on the other hand, encrypts communication between the client and server, allowing sensitive data such as login credentials and payment information to be exchanged more securely.

Most websites today use HTTPS.

### What is TLS?

TLS = Transport Layer Security

A security technology that protects data exchanged between clients and servers over the internet by encrypting it.

TLS provides:

1. Encryption: Makes the content difficult to read even if someone intercepts it.
2. Authentication: Checks that the server you have connected to really is the intended server.
3. Integrity: Checks that the data has not been tampered with along the way.

A simplified version of the process looks like this:

The browser requests a connection to the server > The server sends a TLS certificate > The browser verifies the certificate > Both sides securely agree on keys to use for encryption > They then exchange encrypted HTTP data.

This process is called a TLS handshake.
