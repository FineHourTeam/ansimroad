# 공용 컴포넌트 카탈로그 (src/components/ui/)

UI를 만들기 전 **이 카탈로그를 먼저 확인**하고 있는 것을 재사용한다 (CLAUDE.md 절대 규칙).
여기 없는 공용 컴포넌트가 필요하면 feature 안에서 임시로 만들지 말고 **`npx shadcn@latest add <이름>`으로 바로 추가**
(승인 불필요)한 뒤 아래 표에 등록한다. shadcn 카탈로그에 없는 컴포넌트를 손으로 만들어야 할 때만 에스컬레이션.

## 설치 방식

shadcn/ui 패턴 — 라이브러리 설치가 아니라 **코드를 프로젝트에 복사**해 소유한다:
```bash
npx shadcn@latest add button dialog input card sonner
```
추가된 컴포넌트는 이 표에 등록한다 (등록 없는 컴포넌트 = 다음 작업자가 또 만든다).

## 표준 세트 (Button·AlertDialog·Sonner·Input은 bootstrap이 설치 시 추가, 나머지는 필요할 때 add)

| 컴포넌트 | 파일 | 용도 | 비고 |
|---------|------|------|------|
| Button | button.tsx | 모든 버튼 | variant(cva)가 스타일 소유 — 화면에서 색 재정의 금지 |
| Input / Textarea | input.tsx | 폼 입력 | react-hook-form과 조합 |
| Dialog / AlertDialog | dialog.tsx · alert-dialog.tsx | 모달·확인창 | window.confirm 대체 (훅이 직접 호출 차단). 삭제 확인은 AlertDialog |
| Card | card.tsx | 컨텐츠 컨테이너 | 흰 바탕 · `rounded-2xl` · 옅은 테두리 · `shadow-sm` · 안 여백 20px(`size="sm"` 16px) · 본문 `text-base`. 모래빛 화면(PageBody) 위에 띄운다 |
| Sonner(Toast) | sonner.tsx | 알림 토스트 | 알림 UI 자작 금지. `<Toaster />`는 App 최상단에 1개(bootstrap이 마운트), 호출은 `toast("…")` |
| Form | form.tsx | RHF + zod 배선 | FormField/FormMessage 포함 |
| Skeleton | skeleton.tsx | 로딩 상태 | 스피너보다 스켈레톤 우선 |
| Badge · Label · Separator · Progress | badge.tsx · label.tsx · separator.tsx · progress.tsx | 표시 · 입력 이름 · 구분선 · 진행 | |
| Tabs · Table | tabs.tsx · table.tsx | 탭 · 표 (운영진 장소 목록) | |
| Select · Switch · Checkbox | select.tsx · switch.tsx · checkbox.tsx | 고르기 · 켜고 끄기 · 체크 | |
| Toggle · ToggleGroup | toggle.tsx · toggle-group.tsx | 단일 선택 칩 (S1 조건 입력) | `variant="choice" size="xl"` |
| Sheet | sheet.tsx | 옆에서 열리는 편집 패널 (운영진 장소 편집) | |
| Carousel | carousel.tsx | 사진 넘겨 보기 (shared/components/PlacePhoto) | embla |

### 이 프로젝트에서 추가한 variant · size

| 컴포넌트 | 이름 | 용도 |
|---|---|---|
| Button | `size="xl"` (48px) | 자녀 · 코스 화면 버튼 (손가락 탭 기준) |
| Button | `size="cta"` (56px) | 화면의 주 행동 (이 코스로 확정하기 등) |
| Button | `size="senior"` (64px) · `size="senior-hero"` (144px) | 어르신 화면 버튼 · 사진 남기기 |
| Button | `variant="kakao"` | 카카오톡 공유 (브랜드 노란색) |
| Button | `variant="emergency"` | 어르신 화면 응급실 전화 |
| Toggle(Group) | `variant="choice"` · `size="xl"` | 둥근 알약 칩 — 고른 칩을 주조색으로 채우고 옅은 그림자 |
| Badge | `variant="highlight"` | 모래빛 강조 배지 ('운영진 추천' 등 — 청록 다음의 두 번째 강조색) |

기본 모양 (2026-10-04 디자인 브리프 반영): Button 은 `font-semibold`, `xl`·`cta` 는 `rounded-xl`(16px), 주조색 버튼은 옅은 청록 그림자,
`outline` 은 흰 바탕 + 입력 테두리 + 청록 옅은 호버. Badge 는 높이 24px 알약 · `font-semibold`. Input · Textarea 는 흰 바탕
(모래빛 화면에서도 칸이 보이게). Sonner 토스트는 16px 글자 · 16px 라운드.

radix-nova 스타일의 `data-open` · `data-checked` · `data-active` 같은 변형은 radix-ui 가 다는 `data-state` 와도 맞도록
`src/styles/tokens.css` 맨 위 `@custom-variant` 로 이어 두었다 (스위치 · 탭 · 열림 애니메이션이 이것에 기대고 있다).

## 규칙

- 스타일 변형은 컴포넌트의 `variant`/`size` prop(cva)이 소유 — 새 변형이 필요하면 variant를 추가하고 보고한다
  (기존 variant의 모양을 바꾸는 것만 에스컬레이션), 화면에서 className 색 덮어쓰기 금지.
- 이 폴더에서 에이전트가 승인 없이 하는 일: `shadcn add` · 아이콘 import를 프로젝트 세트로 교체 · variant 추가 · 아래 표 등록.
  shadcn 원본 코드의 arbitrary value(`rounded-[4px]` 등)는 편집 훅 검사 대상에서 빠진다.
- 색·간격·라운드는 tokens.css 토큰만 (rules.md § 디자인).
- 아이콘은 `@/components/icons` 프로젝트 세트만 (lucide 등 기본 팩 금지 — `shadcn add`로 들어온 lucide import는 바로 교체). 아이콘 버튼은 `aria-label` 필수.
- 프로젝트 전용 조합 컴포넌트(예: PageHeader, EmptyState)는 `src/components/` (ui/ 밖)에 두고
  이 README 하단에 별도 표로 등록.

## 프로젝트 컴포넌트 (ui/ 밖 — 추가 시 여기 등록)

| 컴포넌트 | 파일 | 용도 |
|---------|------|------|
| BrandMark | `src/components/brand/BrandMark.tsx` | 안심로드 심볼 (핀 · 해 · 물결 길). `size`(px, 기본 32) · `tone="color" \| "white"` · `alt`(기본 '안심로드', 옆에 글자가 있으면 `""`) · `className`. color 는 다크 모드에서 흰 핀으로 저절로 바뀐다 |
| BrandLogo | `src/components/brand/BrandLogo.tsx` | 심볼 + 글자 로고 '안심로드'. `height`(px, 기본 32 — 가로는 비율대로) · `tone="color" \| "white"`(청록 바탕 · 사진 위) · `className` |

로고 원본은 `public/brand/*.svg` (`web-assets/logo-source/build.py`가 생성) — 화면에서 `<img src="/brand/…">`를 직접 쓰지 말고 위 컴포넌트로.
상단 바 · 본문 틀 · 아래 고정 띠 같은 화면 조합은 `src/shared/components/common.tsx` (TopBar · PageBody · StickyActionBar ·
StateMessage · Loading · EmergencyLine · LegalLinks)를 쓴다.
