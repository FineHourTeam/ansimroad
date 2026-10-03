// 라우트 경로 단일 출처 — 컴포넌트에서 '/f/abc' 문자열 하드코딩 금지 (rules.md § 라우팅).
// 이동은 navigate(paths.family(token)) 형태로만. 라우터 정의(router.tsx)도 이 상수를 쓴다.
// 화면 흐름: S1 → S2 → (S2-1) → 확정 → 자녀 S5(/f) · 어르신 S4(/t) → 여행 완료 → 리포트 S6(/r)
export const paths = {
  home: "/", // S1 메인 · 조건 입력
  result: "/result", // S2 코스 제안 (?p=2&a=70&m=stairs&w=20&d=2026-10-18&t=transit&ex=…)
  resultWithQuery: (query: string) => `/result?${query}`,
  resultDetail: "/result/:course", // S2-1 코스 상세 (확정 전, 같은 쿼리)
  resultDetailOf: (courseKey: string, query: string) =>
    `/result/${encodeURIComponent(courseKey)}?${query}`,

  // 자녀용 (familyToken이 곧 권한)
  family: (token: string) => `/f/${token}`, // S5
  familyPattern: "/f/:token",
  familyCourse: (token: string) => `/f/${token}/course`, // 확정 후 코스 보기·수정 (S2-1 스냅샷)
  familyCoursePattern: "/f/:token/course",
  share: (token: string) => `/f/${token}/share`, // S3 링크 모아 보기
  sharePattern: "/f/:token/share",
  print: (token: string) => `/f/${token}/print`, // S3 인쇄용
  printPattern: "/f/:token/print",

  senior: (token: string) => `/t/${token}`, // S4 어르신
  seniorPattern: "/t/:token",
  report: (token: string) => `/r/${token}`, // S6 여행 리포트 (읽기 전용 공유)
  reportPattern: "/r/:token",

  privacy: "/privacy",
  locationTerms: "/location-terms",

  // 관리자 (운영진 — 이메일 로그인 + admins/{uid})
  login: "/admin/login",
  admin: "/admin", // 추천 코스 만들기
  adminPlaces: "/admin/places", // 장소 데이터 35칸 · TourAPI 가져오기 · CSV

  notFound: "*",
} as const;
