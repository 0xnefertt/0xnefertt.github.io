---
layout: post
title: "데이터베이스 서비스 메모"
date: 2026-05-23
description: "서비스 유형별 데이터 저장소 후보를 정리한 초안"
tags:
  - database
  - dev
categories:
  - dev
draft: true
---

## Summary

서비스 구축 시 자주 선택하는 데이터 저장소 유형과 대표 서비스를 간단히 정리했다.

## 서비스 유형 정리

- 관계형 DB: Supabase Postgres, Neon, RDS, D1
- 오브젝트 스토리지: S3, R2, Supabase Storage
- KV: Cloudflare KV, Deno KV
- Redis/Cache: Redis, Upstash
- 검색: Algolia, Meilisearch, Elasticsearch
- Queue: Cloudflare Queues, SQS, Inngest
- Realtime/State: Supabase Realtime, Durable Objects

## Notes

Supabase는 여러 기능을 통합 제공해 초기 개발이 빠르다.  
Cloudflare 스택은 조합이 유연하지만, 케이스에 따라 Auth/RLS 구성을 별도로 설계해야 할 수 있다.

문서형 DB는 MongoDB, Firestore가 대표적이며, JSON 중심의 유연한 스키마가 필요한 경우에 유리하다.

## Conclusion

요구사항(트랜잭션, 검색, 실시간성, 운영 복잡도)에 따라 저장소를 조합해서 선택하는 것이 가장 현실적이다.