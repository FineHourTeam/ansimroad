// 코스 테마 아이콘 (모담 요청 2026-10-16): 바다 = 물결 · 역사·문화 = 기와지붕 · 자연·경치 = 산. 코스 카드 띠 · 추억 페이지에 테마 라벨과 함께
import { createIcon } from "./icon";

export const SeaThemeIcon = createIcon(
  "SeaThemeIcon",
  <>
    <path d="M3.5 9.5q2.125-2 4.25 0t4.25 0 4.25 0 4.25 0" />
    <path d="M3.5 15q2.125-2 4.25 0t4.25 0 4.25 0 4.25 0" />
  </>,
);

export const HistoryThemeIcon = createIcon(
  "HistoryThemeIcon",
  <>
    <path d="M3 10.5c3.5-.5 6.5-2.5 9-6 2.5 3.5 5.5 5.5 9 6" />
    <path d="M7.5 11v7.5M16.5 11v7.5" />
    <path d="M4.5 19h15" />
  </>,
);

export const NatureThemeIcon = createIcon(
  "NatureThemeIcon",
  <>
    <path d="M3 18.5l6.5-10 4 6 2.5-3.5 5 7.5z" />
    <circle cx="17" cy="5.5" r="1.75" />
  </>,
);
