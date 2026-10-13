# 초안과 첨부 이미지 백업·복구

공개 콘텐츠는 GitHub 기록으로 관리하고, 비공개 초안·휴지통·첨부 이미지는 D1에 보관합니다.
관리자의 **내려받기**는 본문만 저장하므로 전체 백업에는 아래 도구를 사용합니다.

## 백업과 복원 검증

저장소 루트에서 Python 3와 설치된 Wrangler를 사용합니다. 운영 계정은 `writer/wrangler.jsonc`에 고정되어 있습니다.

```sh
npm run writer:backup
npm run writer:backup:verify -- .private-backups/writer-<생성된 폴더>
npm run writer:backup:verify:d1 -- .private-backups/writer-<생성된 폴더>
```

- `drafts`, `media`, `media_chunks`, `d1_migrations`를 하나의 SQL 스냅샷으로 내보냅니다.
- 로그인 세션·GitHub 토큰은 제외하고 빈 세션 테이블만 포함합니다. 복구 후에는 다시 로그인합니다.
- `.private-backups/`는 Git과 포맷 검사에서 제외됩니다. 폴더 권한은 700, 파일은 600이며 원문을 로그에 출력하지 않습니다.
- 매번 새로운 메모리 SQLite 데이터베이스에 실제로 복원합니다. 무결성·외래키·초안 JSON·수정 버전·이미지 연결·조각 순서·바이트 수를 검사합니다.
- 큰 본문과 이미지 값은 작은 INSERT/UPDATE 문으로 재구성해 D1의 SQL 문장 100KB 제한을 지킵니다. 변환 전후 모든 행과 이미지 해시가 같은지도 확인합니다.
- SQL 전체 체크섬과 복원 이미지 해시·개수·용량을 manifest에 기록하고 재검증합니다.
- `writer:backup:verify:d1`은 같은 SQL을 별도의 일회용 D1 런타임에 가져와 실제 이미지 읽기 코드로 모든 첨부 이미지를 복원하고 원본 해시와 대조합니다.
- 검증 성공은 `verified: true`로 표시합니다. 실패한 내보내기는 백업 성공으로 취급하지 않습니다.
- SQL에는 비공개 원문과 이미지가 있습니다. 공개 GitHub Actions artifact나 공개 저장소에 올리지 마세요. 독립 보관이 필요하면 암호화된 개인 저장소에 이 폴더를 보관하세요.
- D1 내보내기 중에는 다른 DB 요청이 잠시 대기할 수 있으므로 글을 편집하지 않는 시간에 실행합니다.

`npm run verify:backup`은 한국어 초안·휴지통·수정 버전·1MB를 넘는 분할 이미지의 복원과 이미지 손상 거절을 검사합니다.
운영 스냅샷을 CI에 전달하지 않습니다.

## 사고가 발생했을 때

1. 관리자 편집과 발행을 중단하고, 현재 상태도 먼저 별도로 백업합니다.
2. 손상 이전 복구 지점 또는 검증된 SQL 스냅샷을 선택합니다.
3. SQL은 **비어 있는 별도 D1 데이터베이스**에 먼저 가져옵니다. 기존 운영 DB에 직접 덮어쓰지 않습니다.
4. 복구 DB에서 초안 수·휴지통·본문·이미지를 확인하고, 별도 테스트 Worker에 연결하여 로그인과 첨부 이미지 읽기를 확인합니다.
5. 검증 후 운영 DB 바인딩을 복구 DB로 바꾸고 Worker를 배포합니다. GitHub 원본과 초안의 sourceSha가 달라진 항목은 원본 비교 후 처리합니다.
6. 이전 DB는 정상 동작 확인과 보관 기한 결정이 끝난 뒤 정리합니다.

새 복구 DB에 가져올 때는 의도한 복구 DB의 이름/ID와 계정을 먼저 확인하고 다음 명령을 사용합니다.

```sh
cd writer
node node_modules/wrangler/bin/wrangler.js d1 execute <복구용-별도-DB> --remote --file ../.private-backups/<백업-폴더>/content.sql
```

백업 SQL은 테이블과 적용된 마이그레이션 기록을 포함합니다. 이미 테이블이 있는 DB에 다시 실행하지 마세요.
이 저장소의 백업 도구는 운영 DB 복원을 자동 실행하지 않습니다.

## Cloudflare Time Travel

D1의 자동 시점 복구 기능도 사용할 수 있습니다. 현재 복구 지점은 다음 읽기 전용 명령으로 확인합니다.

```sh
cd writer
node node_modules/wrangler/bin/wrangler.js d1 time-travel info nefertt-writer --json
```

복구 가능 기간은 계정 요금제에 따라 확인해야 합니다. Time Travel 복원은 운영 상태 전체를 바꾸므로 편집 중단·현재 백업·복구 시점 확인 후 실행합니다.
공식 자료: [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 가져오기·내보내기](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

## 브라우저 검증

`npm run verify:build` 후 `npm run test:browser`로 실행합니다. 최초 실행 전 `npx playwright install chromium`이 필요합니다.
390px·1280px에서 주요 공개 페이지의 WCAG A/AA 검사, 메뉴·검색·글 상세 및 가로 넘침을 확인합니다.
관리자는 실제 빌드된 UI와 실제 Workers/D1 런타임으로 로그인→저장→새로고침→발행→발행 취소→재발행→로그아웃을 검사합니다.
GitHub OAuth와 Git 저장소만 테스트 서버가 대체합니다. 운영 계정에 로그인하거나 테스트 글을 공개하지 않습니다.
테스트 서버는 루프백 주소에만 연결하고 D1 데이터는 실행 종료 시 사라집니다.

배포 전 검증과 주간 접근성 워크플로에서 동일한 브라우저 검사를 실행합니다. 실패하면 배포를 중단합니다. 성공·실패 보고서와 검증 화면은 7일 보관합니다.
