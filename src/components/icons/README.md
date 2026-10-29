# 아이콘 세트 (프로젝트 전용 SVG)

이 프로젝트는 **기본 아이콘 팩(lucide-react·react-icons·heroicons 등)을 쓰지 않는다.** 모든 아이콘은 이 폴더에서 제품 컨셉에
맞게 새로 그린다. 다른 서비스와 똑같은 아이콘이 "AI가 만든 기본 화면" 인상을 만들기 때문이다.

- 기본 아이콘 팩 import는 편집 즉시 훅이, shadcn CLI가 쓴 파일은 끝내기 직전 검사가 막는다.
- 화면 코드에 `<svg>`를 직접 쓰지 않는다 — 여기에 아이콘으로 등록하고 가져다 쓴다.
- 다른 아이콘 팩의 path를 복사하지 않는다 (라이선스·컨셉 불일치). 모양은 이 세트의 스타일 가이드로 새로 그린다.

## 스타일 가이드 (설치 때 컨셉으로 정한다 — 바꾸려면 사람 승인)

| 항목 | 값 | 컨셉과의 연결 (왜 이 값인가) |
|---|---|---|
| 제품 컨셉·톤 | 자녀가 계획하고, 부모님은 사진만 찍는 목포 여행 · 밝은, 여행 기분의, 다정한 | CLAUDE.md 상단·§ 제품 톤앤매너 |
| 형태 언어 | 둥근 · 단순한 기하 도형 | 다정한 톤. 어르신 화면에서도 쓰이므로 디테일을 줄여 한눈에 읽히게 |
| 선 두께 | 2.0 (`icon-style.ts` strokeWidth) | 작은 크기(16px)·큰 글씨 화면 모두에서 또렷하게. 1.5는 어르신 화면에서 흐려 보임 |
| 선 끝·꺾임 | round · round | 날카로운 모서리 없이 부드러운 인상 (여행 기분·다정함) |
| 채움 | 선 | 밝은 배경 위에서 가볍게. 강조가 필요하면 아이콘 대신 색·글자로 |
| 모서리 반경 | 사각형 모서리 r=3 | 둥근 형태 언어와 같은 감각 |
| 참고 인상 | "여행 수첩에 사인펜으로 그린 듯 둥글고 또렷하게" | |

## 그리드 규칙 (모든 아이콘 공통)

- 24×24 viewBox, 바깥 2px은 비워 둔다 (그리는 영역 20×20). 원형은 지름 20, 정사각형은 18 정도가 같은 크기로 보인다.
- 좌표는 정수 또는 .5 — 16px에서 흐려지지 않게. 선 두께가 홀수 px 계열이면 .5 좌표.
- 한 아이콘은 요소 1~4개. 16px(`size="sm"`)로 줄였을 때 알아볼 수 있어야 한다 — 디테일은 뺀다.
- 색은 `currentColor`만 (hex는 훅이 막는다). 두 톤이 필요하면 `opacity`로.
- 같은 뜻은 하나의 아이콘 — 만들기 전에 아래 목록에서 먼저 찾는다.

## 새 아이콘 만들기

1. 아래 목록에 같은 뜻의 아이콘이 있는지 확인한다.
2. `<뜻>-icon.tsx` 파일에 `createIcon`으로 만든다 — 이름은 모양이 아니라 뜻으로 (`DeleteIcon`, `TrashCanIcon` 아님):
   ```tsx
   import { createIcon } from "./icon";
   export const DeleteIcon = createIcon("DeleteIcon", <>
     <path d="M5 7h14" />
     <path d="M9 7V5h6v2" />
     <path d="M7 7l1 12h8l1-12" />
   </>);
   ```
3. `index.ts`에 export, 이 README 목록 표에 한 줄.
4. 16px·24px로 렌더해 스타일 가이드와 어긋나지 않는지 본다 (가능하면 스크린샷). 기존 아이콘 2~3개와 나란히 놓고 선 두께·크기
   감각이 같은지 확인한다.

## 쓰는 법

```tsx
import { DeleteIcon } from "@/components/icons";
<Button variant="ghost" size="icon" aria-label="메모 삭제"><DeleteIcon /></Button>   // 아이콘만 있는 버튼 → 버튼에 aria-label
<Button><DeleteIcon size="sm" /> 삭제</Button>                                     // 글자가 있으면 아이콘은 장식
<DeleteIcon label="삭제됨" />                                                       // 아이콘 혼자 뜻을 전할 때
```

## 목록

| 아이콘 | 뜻·쓰는 곳 | 만든 날 |
|---|---|---|
| SuccessIcon | 성공 토스트 | 2026-10-03 |
| InfoIcon | 안내 토스트 | 2026-10-03 |
| WarningIcon | 경고 토스트 | 2026-10-03 |
| ErrorIcon | 오류 토스트 | 2026-10-03 |
| LoadingIcon | 불러오는 중 (animate-spin) | 2026-10-03 |
| CloseIcon | 닫기 | 2026-10-03 |
| CheckIcon | 선택됨 · 완료 | 2026-10-03 |
| ChevronDownIcon | 펼치기 | 2026-10-03 |
| ChevronRightIcon | 다음 · 자세히 | 2026-10-03 |
| AddIcon | 추가 | 2026-10-03 |
| DeleteIcon | 삭제 | 2026-10-03 |
| EditIcon | 수정 | 2026-10-03 |
| SearchIcon | 검색 | 2026-10-03 |
| MoreVerticalIcon | 더 보기 메뉴 (⋮) | 2026-10-29 |
| ChevronUpIcon | 접기 · 위로 | 2026-10-03 |
| ChevronLeftIcon | 이전 (캐러셀) | 2026-10-03 |
| PhoneIcon | 전화 걸기 (응급실·장소) | 2026-10-03 |
| CameraIcon | 사진 찍기 | 2026-10-03 |
| ImageIcon | 갤러리에서 사진 고르기 · 사진 | 2026-10-03 |
| MapPinIcon | 장소 · 위치 | 2026-10-03 |
| ShareIcon | 공유 | 2026-10-03 |
| PrintIcon | 인쇄 | 2026-10-03 |
| StarIcon | 별점 (채울 땐 fill="currentColor") | 2026-10-03 |
| ClockIcon | 시간 · 일정 | 2026-10-03 |
| CopyIcon | 링크 복사 | 2026-10-03 |
| DragHandleIcon | 끌어서 순서 바꾸기 | 2026-10-03 |
| UploadIcon | 파일 올리기 · 가져오기 | 2026-10-03 |
| DownloadIcon | 내려받기 (CSV) | 2026-10-03 |
| HospitalIcon | 응급실 · 약국 | 2026-10-03 |
| WalkIcon | 걷는 시간 | 2026-10-03 |
| ArrowLeftIcon | 뒤로 가기 (상단 바) | 2026-10-03 |
| LogoutIcon | 로그아웃 | 2026-10-03 |
| MinusIcon | 빼기 · 줄이기 (머무는 시간 −10분) | 2026-10-03 |
| CalendarIcon | 날짜 고르기 칸 (S1 여행 날짜) | 2026-10-03 |
| MapIcon | 지도로 보기 (자녀 현황 장소 칸) | 2026-10-28 |
| SeaThemeIcon | 바다 코스 (물결) — 코스 카드 띠 · 추억 페이지 | 2026-10-16 |
| HistoryThemeIcon | 역사·문화 코스 (기와지붕) | 2026-10-16 |
| NatureThemeIcon | 자연·경치 코스 (산) | 2026-10-16 |
