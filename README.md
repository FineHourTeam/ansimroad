# 안심로드 (ansimroad)

자녀가 여행 코스를 계획하고, 부모님은 사진만 찍는 목포 여행 서비스입니다.
국립목포대 RISE 창업동아리 모담이 발주하고 파인아워가 개발했습니다.

- 운영 사이트: https://ansimroad.web.app
- 기술: Vite · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Firebase(Auth · Firestore · Storage · Functions) · 네이버 지도

## 준비물

| 도구 | 버전 | 용도 |
|---|---|---|
| Node.js | 22 이상 | 앱 · Functions |
| Java (JDK) | 21 이상 | Firebase 에뮬레이터(Firestore) |
| Git | 아무 버전 | 클론 |

Firebase CLI 는 `devDependencies` 에 들어 있어서 따로 설치하지 않아도 됩니다 (`npx firebase ...`).

## 로컬에서 실행하기

```bash
git clone https://github.com/FineHourTeam/ansimroad.git
cd ansimroad
npm install
```

로컬 개발은 실제 Firebase 프로젝트가 아니라 **에뮬레이터**에 붙습니다 (`.env` 의 `VITE_USE_EMULATORS=true`).
그래서 터미널 두 개가 필요합니다.

**터미널 1: 에뮬레이터**

```bash
npx firebase emulators:start --only auth,firestore,storage --project modam-5eb63
```

에뮬레이터 화면은 http://127.0.0.1:4000 에서 볼 수 있습니다. 에뮬레이터는 실제 프로젝트 데이터를 건드리지 않고, Firebase 로그인도 필요하지 않습니다.

**터미널 2: 데모 장소 넣기 → 앱 실행**

```bash
node scripts/seed-places.mjs --emulator
npm run dev
```

http://localhost:5173 을 열면 됩니다. 에뮬레이터를 껐다 켜면 데이터가 지워지므로 장소를 다시 넣어야 합니다.

### 환경 변수

`.env` 는 저장소에 들어 있습니다. 안에 든 값(Firebase 웹 설정 · 네이버 지도 Client ID)은 배포 번들에 그대로 공개되는 값이라 비밀이 아닙니다.
개인 설정은 `.env.local` 에 적으면 `.env` 를 덮어쓰고, 이 파일은 커밋되지 않습니다.

- **네이버 지도:** 네이버 클라우드 콘솔에 등록한 주소(`localhost:5173`, 운영 도메인)에서만 지도가 뜹니다. 다른 주소(예: 휴대폰에서 PC IP 로 접속)로 열면 지도 자리에 오류가 보입니다. 이때는 콘솔의 Web 서비스 URL 에 그 주소를 추가하거나, 본인 Client ID 를 `.env.local` 의 `VITE_NAVER_MAP_CLIENT_ID` 에 넣습니다.
- **서버 비밀값**(TourAPI 키 · 서비스 계정 키)은 저장소에 없습니다. 화면 개발에는 필요하지 않습니다.

### 운영진 화면 (/admin)

운영진 화면은 이메일 로그인 + Firestore `admins/{uid}` 문서로 열립니다. 에뮬레이터에서 쓰려면:

1. `npm run seed:test` 로 테스트 계정을 만듭니다 (`admin@test.local` 등, 비밀번호는 [docs/TEST_ACCOUNTS.md](docs/TEST_ACCOUNTS.md)).
2. 에뮬레이터 화면(127.0.0.1:4000) → Authentication 에서 그 계정의 UID 를 복사합니다.
3. Firestore 에 `admins/{UID}` 문서를 만듭니다. 문서가 있는지만 보므로 필드는 아무거나 하나(예: `email`) 넣으면 됩니다.

## 확인 명령

```bash
npm run lint
npm run typecheck
npm run test        # 단위 테스트 (vitest)
npm run build
npm run e2e         # E2E (Playwright, 에뮬레이터와 앱을 알아서 띄움)
```

E2E 를 처음 돌리기 전에 브라우저를 한 번 설치합니다: `npx playwright install chromium`.
에뮬레이터를 이미 띄워 두었다면 E2E 는 그것을 그대로 씁니다.

## 폴더 구조

```
src/
  app/          라우터 · 공용 레이아웃
  features/     기능별 화면 (components · hooks · api · index.ts)
  shared/       여러 기능이 같이 쓰는 코드 · 장소 데이터 파서
  components/   shadcn/ui 와 아이콘
  styles/       디자인 토큰 (tokens.css)
functions/      Cloud Functions (TourAPI 프록시 · 링크 미리보기 · 이미지 프록시 · 만료 정리)
e2e/            Playwright 테스트
scripts/        장소 적재 · 운영진 등록 · 테스트 계정
docs/           디자인 브리프(DESIGN.md) · 설정 체크리스트 · 기록
knowledge/      코딩 규칙 · 함정 모음
```

코딩 규칙은 [CLAUDE.md](CLAUDE.md) 와 [knowledge/rules.md](knowledge/rules.md) 에 있습니다.

## 배포 (팀 전용)

`main` 에 머지하면 GitHub Actions 가 Hosting 에 배포합니다. 배포 권한은 Firebase 프로젝트(`modam-5eb63`) 구성원에게만 있고,
키 파일을 주고받지 않고 콘솔의 **사용자 및 권한**에서 계정을 추가합니다.

- 보안 규칙을 바꾼 배포는 늘 **rules → hosting** 순서로 합니다.
- 직접 배포: `npm run deploy` (Hosting), `npx firebase deploy --only firestore:rules,storage` (규칙), `npx firebase deploy --only functions` (함수).
- Windows 에서 함수를 배포하거나 에뮬레이트할 때는 `FUNCTIONS_DISCOVERY_TIMEOUT=60` 이 필요합니다.

남은 설정 항목은 [docs/setup-checklist.md](docs/setup-checklist.md) 에 정리되어 있습니다.
