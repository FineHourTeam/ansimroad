# 설치 체크리스트

> `bootstrap.md`가 설치하면서 채우고, 이후에는 "지금 이 프로젝트에 무엇이 연결돼 있고 무엇이 남았는지" 보는 용도로 쓴다.
> 스타터킷 버전: `.claude/starter-version` (설치일 `2026-10-03`). 새 버전은 세션 시작 훅이 알리고 `/update-starter`가 반영한다.

**읽는 법**
- `[x]` 완료 · `[ ]` 할 일 · `[-]` 해당없음(이 프로젝트에 필요 없음). 해당없음도 지우지 말고 `[-]`로 남긴다.
- 모든 항목은 **한 곳에만** 있다. 다른 곳(Day 0 표·스킬 안내)은 ID(`F2` 등)로 가리킨다 — 체크는 항목이 있는 섹션에서 한다.
- `` `[...]` ``는 확정 안 된 값이다. 확정되면 값으로 바꾼다.
- 새 도구·MCP·API를 붙이면 맞는 섹션에 다음 번호로 추가한다.

## ⚡ Day 0 — 방치하면 첫 빌드·첫 배포에서 반드시 막히는 것

설치가 끝나면 에이전트가 아래 항목 중 미완료인 것을 하나씩 브리핑한다 (왜 지금 · 어디서 어떻게 · 끝나면 해당 섹션에 체크).

| ID | 항목 | 안 하면 |
|----|------|--------|
| Q1 | 검증 4종이 이 머신에서 도는지 | 에이전트의 끝내기 전 검사가 매번 실패 |
| S1 | 시크릿 파일이 `.gitignore`에 있는지 | 키가 저장소에 올라감 |
| F1~F3 | Firebase 서비스 활성화 · `.env` config · 보안 규칙 | 흰 화면 · 권한 오류 · 데이터 노출 |
| M1 | MCP 등록 후 새 세션 시작 | MCP 도구가 안 보임 |
| Q2~Q3 | CI 설치 · 첫 push 그린 | PR 검사가 안 돎 |
| P1~P3 | Hosting 연결 · 배포 워크플로우 · preview 1회 | 배포 계획이 있는데 배포 경로가 없음 |

---

## 1. 개발 도구 (이 머신 · 사용자 전역)

- [x] **T1** Node.js 20+ / npm — 확인: `node --version` (v22.23.2 / npm 10.9.8)
- [x] **T2** GitHub CLI `gh` 로그인 — 저장소: `FineHourTeam/ansimroad` (비공개, 로그인 계정 mynameisung)
- [x] **T3** Firebase CLI 로그인(법인 계정) — 프로젝트: `modam-5eb63` (계정 25finehour@gmail.com)
- [x] **T4** Google Cloud CLI `gcloud` 로그인(T3와 같은 계정) + `gcloud config set project`가 T3와 일치
      — 서비스 계정 키·API 활성화·IAM 작업에 필요
      ⚠️ 이 머신의 gcloud 전역 할당량 프로젝트(`billing/quota_project`)가 `hireenvy-platform`이라, REST·billing 명령은
      `--billing-project=modam-5eb63` 또는 `x-goog-user-project: modam-5eb63` 헤더를 붙여야 한다 (전역 설정은 건드리지 않음).
- [x] **T5** Playwright 브라우저 — E2E·OG 이미지 렌더링에 필요할 때: `npx playwright install chromium`
- [-] **T6** Claude in Chrome — 사용자 전역 지침상 브라우저 작업은 gstack `/browse`만 쓴다 (claude-in-chrome 미사용)
- [x] **T7** im-not-ai(`/humanize-scan`·`/humanize-korean`) — 전역(`~/.claude/skills`)에 설치되어 있음

> 에이전트의 한국어 문장 품질(fluent-korean output-style)은 설치 때 자동으로 켜진다 — 할 일 없음. 끄려면 settings.json의 `outputStyle` 삭제.

## 2. 코드 품질 게이트

- [x] **Q1** 검증 4종(`npm run lint` · `typecheck` · `test` · `build`)이 이 머신에서 한 번씩 통과 (lint 경고 1건: shadcn button 원본)
- [x] **Q2** `.github/workflows/react-ci.yml` 설치 (`templates/ci/react-ci.yml` 기반, Node 22)
- [x] **Q3** 첫 push에서 CI 그린 확인 (2026-10-03, React CI · Firebase Hosting Deploy 모두 success)
- [ ] **Q4** 의존성 자동 업데이트(Dependabot 또는 Renovate) 켜기

## 3. 디자인 시스템

- [x] **D1** 브랜드 주조색이 `tokens.css`에 반영됨 (기본 무채색 플레이스홀더 아님) — 소스: `없음(시드)` · `#0F766E` 목포 바다 청록 (다크 `#2DD4BF`)
- [x] **D2** 명도 대비 테스트 통과 — `npx vitest run src/styles` (24개, 라이트·다크)
- [x] **D3** 아이콘 스타일 가이드 승인 + 기본 세트 13종 (`src/components/icons/README.md`), `grep -rn "lucide-react" src` 0줄
      — 두툼한 둥근 선 2.0 · round · 선 아이콘 · r=3
- [ ] **D4** `docs/DESIGN.md` — 톤·화면 원칙 (없으면 첫 화면 작업 전에 작성)

## 4. Firebase (Firebase를 쓰는 프로젝트만)

- [x] **F1** Authentication(이메일/비밀번호 — 운영진 로그인용) · Firestore(리전 `asia-northeast3`, `(default)`) · Storage(`modam-5eb63.firebasestorage.app`, 서울) 활성화 — 전부 CLI/REST
- [x] **F2** 웹 앱 등록(`com.finehour.ansimroad`) → config를 `.env`의 `VITE_FIREBASE_*` 6종으로 + GitHub 저장소 Variables 등록
- [x] **F3** Firestore·Storage 보안 규칙이 테스트 모드(`allow if true`) 아님 — 전부 막힘으로 배포됨
- [ ] **F4** 에뮬레이터(`firebase.json`에 auth·firestore·storage 포트 설정) — 실행 · 로컬 개발 연결 확인은 아직
- [ ] **F5** 테스트 계정 규약(`docs/TEST_ACCOUNTS.md`) — dev·에뮬레이터 전용, `npm run seed:test`, 로그인 UI 배선: `[아니오 — 운영진 로그인 만들 때]`
- [ ] **F6** 승인 도메인에 preview 채널 도메인 추가 — 등록됨: localhost · modam-5eb63.web.app/firebaseapp.com · ansimroad.web.app/firebaseapp.com (preview 채널 도메인은 PR 첫 배포 뒤 추가)
- [ ] **F7** CORS — Storage 파일을 fetch·canvas로 쓸 때만 `cors.json` 적용 (`docs/CORS.md`)
- [-] **F8** 프로덕션 QA 계정(앱스토어 심사 등) — 웹 서비스라 해당없음
- [ ] **F9** App Check — 배포가 안정된 뒤 모니터링 모드부터

## 5. 배포 (Hosting · 도메인)

- [x] **P1** Hosting 연결 (SPA rewrite + 캐시·보안 헤더) — 사이트: `ansimroad` (https://ansimroad.web.app)
      — 헤더는 `regex: ^/(?:[^.]*|index\.html)$`로 모든 화면 경로에 CSP·no-cache, `**/*.map`은 배포 제외
- [x] **P2** `.github/workflows/firebase-hosting-deploy.yml` 설치 (PR preview + main live)
- [ ] **P3** GitHub Actions Secret `FIREBASE_SERVICE_ACCOUNT` 등록 ✅ + preview 채널 1회 배포 (첫 PR 때)
      — 서비스 계정 firebase-adminsdk-fbsvc에 firebasehosting.admin · serviceusage.apiKeysViewer · run.viewer 부여, 키는 `.secrets/`
- [ ] **P4** 프로덕션 도메인 연결 — `[미정]`

## 6. 웹 에셋 · SEO

- [x] **W1** 마스터 로고 등록 — `web-assets/logo-source/logo.svg` (기존 시안 아이콘을 브랜드색으로 — 정식 로고가 나오면 교체)
- [x] **W2** 파비콘 세트·PWA 아이콘·OG 이미지 — ImageMagick이 없어 `node web-assets/generate.mjs`(Playwright 렌더)로 생성
- [ ] **W3** index.html 메타(title·description·og:*)·`<Seo>` SITE_NAME 완료 — 주요 라우트 배선은 화면 이전 때
- [ ] **W4** `public/robots.txt` 정책 — `[프로덕션 허용 / 스테이징 차단]`
- [x] **W5** og:image 절대 URL — `https://ansimroad.web.app/og-image.png` (P4 도메인 확정 뒤 갱신)

## 7. 시크릿 · 보안 (`.secrets/` + `.env.local` — 커밋 금지)

- [x] **S1** `.gitignore`에 `.secrets/`·`.env.local`·`.cache/`·`_workspace/` 포함
- [x] **S2** `VITE_` 변수에 시크릿 없음 (Firebase config만). TourAPI 키는 `TOURAPI_KEY`(VITE_ 아님, 서버 측)로 받을 것
- [-] **S3** AI API 키 — AI 기능 미사용
- [-] **S4** Figma Access Token — 디자인 소스 없음

## 8. MCP (등록하면 새 세션부터 보인다)

- [ ] **M1** Firebase MCP — `.mcp.json` 등록 완료 (제품: firestore, auth, storage, hosting). **ansimroad 폴더에서 새 세션을 시작해야** 도구가 보인다
- [ ] **M2** (새 MCP를 붙이면 여기에 추가)

## 9. Ops Loop (파일은 항상 설치 · 켜는 건 준비됐을 때)

- [ ] **O1** `/setup-sentry-autofix` — `[미등록 — 사용자 보류(2026-10-03)]`. SDK·`src/lib/sentry.ts`는 설치됨, `VITE_SENTRY_DSN` 넣으면 켜짐
- [ ] **O2** `/setup-auto-triage` — 이슈·CI 실패 다이제스트
- [ ] **O3** `/setup-perf-monitor` (첫 배포 뒤) — 기준선: `[YYYY-MM-DD: LCP ___ / CLS ___ / TBT ___]`

## 10. 학습 루프 자동화 (선택)

- [x] **L1** `@rule-promoter` 주기 실행 등록 — `수동` (필요할 때 직접 호출)
- [x] **L2** `@mistake-compressor` 주기 실행 등록 — `수동` (recent.md 200줄 넘을 때)
