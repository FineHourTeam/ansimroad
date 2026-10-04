// 안심로드 도메인 타입. 화면·룰 엔진·저장소가 모두 이 파일의 타입을 공유한다.
// 시트 컬럼명은 첨부3 장소 조사표 v1(35컬럼)을 따른다.

export type PlaceType = "관광지" | "식당" | "카페휴식";
export type Theme = "바다" | "역사문화" | "자연경치";
export type VerifyStatus = "현장" | "전화" | "미확인";
export type Comfort = "상" | "중" | "하";
export type Wheelchair = "가능" | "일부" | "불가";
export type Stairs = "없음" | "우회가능" | "있음";
export type Indoor = "실내" | "실외" | "혼합";
export type YesNo = "예" | "아니오";
export type HasOrNot = "있음" | "없음";
export type FloorAccess = "1층" | "상층EV있음" | "상층EV없음";

/** 휴무요일 한 항목. nth 가 비어 있으면 매주, 있으면 그 달의 n번째 요일만 휴무. */
export interface ClosedRule {
  weekday: number; // 0=일 … 6=토
  nth: number[] | null;
}

export interface EmergencyInfo {
  name: string;
  phone: string;
  driveMin: number | null;
  /** 지도 마커용 좌표. 시트에 응급실 좌표 컬럼이 없어 설정값의 응급실 목록에서 이름으로 찾는다. */
  lat?: number;
  lng?: number;
}

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  area: string; // 지역
  region: string; // 권역
  mainTheme: Theme | null;
  subTheme: Theme | null;
  address: string;
  phoneRaw: string;
  /** '전화' 칸을 ' / ' 로 나눈 번호들. 전화 걸기는 phones[0] (D-01). */
  phones: string[];
  lat: number;
  lng: number;
  wheelchair: Wheelchair | null;
  stairs: Stairs | null;
  walkMin: number | null; // 필수보행(분)
  stayMin: number | null; // 어르신관람시간(분)
  indoor: Indoor | null;
  benches: YesNo | null;
  /** 시트 값이 비어 있으면 부록 A.4 기준으로 계산한 값 */
  comfort: Comfort;
  toilet: HasOrNot | null;
  accessibleToilet: "있음" | "없음" | "미확인" | null;
  dropoffM: number | null; // 하차~입구(m)
  parking: HasOrNot | null;
  closedRaw: string;
  closed: ClosedRule[];
  hoursRaw: string;
  openMin: number | null; // 운영 시작 (분, 0~1440)
  closeMin: number | null; // 운영 종료 (분, 0~1440)
  standingTable: HasOrNot | null; // 입식테이블
  floor: FloorAccess | null;
  er: EmergencyInfo | null; // 최근접응급실·응급실전화·응급실이동(분)
  pharmacy: string | null; // 최근접약국
  verify: VerifyStatus;
  verifiedAt: string;
  verifiedBy: string;
  photoUrl: string | null;
  /** 사진URL 칸에 공백·'|'로 여러 장을 적으면 모두 담는다 (첫 장 = photoUrl) */
  photoUrls: string[];
  note: string;
  /** 운영진이 추천 코스에 적은 장소 설명 */
  desc?: string;
}

export interface RowIssue {
  row: number; // 시트 기준 행 번호 (1부터)
  id: string;
  reason: string;
}

export interface PlaceDataset {
  places: Place[];
  /** 검증에서 빠진 행 (D-02 ②) */
  skipped: RowIssue[];
}

// ---------- 입력 (부록 A.1) ----------

export type Party = 1 | 2 | 3; // 3 = 3명 이상
export type AgeBand = 40 | 50 | 60 | 70 | 80; // 80 = 80대 이상
export type Mobility = "none" | "stairs" | "wheelchair";
export type WalkLimit = 10 | 20 | 30; // 30 = 30분 이상(상한 없음)
export type Transport = "car" | "transit";

export interface TripInput {
  party: Party;
  age: AgeBand;
  mobility: Mobility;
  walk: WalkLimit;
  date: string; // YYYY-MM-DD
  transport: Transport;
}

/** S1 폼 상태. 아직 고르지 않은 항목은 null. */
export type TripInputDraft = { [K in keyof TripInput]: TripInput[K] | null };

// ---------- 코스 ----------

export type CourseKey = "sea" | "history" | "nature" | "best" | `c-${string}`; // c-{id} = 운영진 추천 코스
export type StopRole = "am" | "lunch" | "pm" | "cafe";

export interface Stop {
  role: StopRole;
  place: Place;
  arriveMin: number; // 도착(시작) 시각, 분
  departMin: number; // 출발 시각, 분
  stayMin: number; // 머무는 시간
  travelMin: number; // 직전 장소에서 오는 이동시간 (첫 장소는 0)
  waitMin: number; // 점심 11:30 고정으로 생긴 대기
  /** 테마 외(폴백) 장소 여부 */
  fallback: boolean;
}

export interface Course {
  key: CourseKey;
  theme: Theme | null; // 대표 코스는 null
  title: string; // '바다 코스'
  stops: Stop[]; // 관광지 → 점심 → 관광지 → 카페 (4곳)
  spare: Place | null; // '여유가 있으면' 1곳 (P1)
  startMin: number;
  endMin: number;
  totalWalkMin: number; // 필수보행 합
  regions: string[];
  er: EmergencyInfo | null; // P8: 오전 관광지 기준
  pharmacy: string | null;
  fallbackBadge: boolean; // '테마 외 장소 포함'
}

export interface GenerateOptions {
  /** F-11 제외 목록 (이미 보여 준 장소 ID) */
  excluded?: string[];
  /** F-26 목포 대표 코스 생성 여부 */
  representative?: boolean;
  /** P3 순서로 점심 권역(P4)을 맞출 수 없을 때 오전·오후를 바꿔 다시 시도 (킥오프 확인 사항) */
  allowP3Swap?: boolean;
  /** 테마 장소가 2곳 이상이어도 조합이 안 되면 폴백 후보까지 넓힘 (킥오프 확인 사항) */
  fallbackOnInfeasible?: boolean;
}

export interface GenerateResult {
  /** 화면에 보여 줄 테마 코스. 1개 이하로 만들어지면 빈 배열(shortage=true). */
  courses: Course[];
  representative: Course | null;
  /** S2 ⑦: 코스 1개 이하 */
  shortage: boolean;
  /** 이번에 보여 준 장소 ID (다른 코스 보기용) */
  shownIds: string[];
  /** 디버깅·검수용: 장소별 제외 사유 */
  excludedReasons: Record<string, string[]>;
}

// ---------- 확정 · 링크 · 사진 ----------

export interface TripSnapshot {
  tripId: string;
  createdAt: string; // ISO
  input: TripInput;
  course: Course; // 확정 시점의 코스 (F-13). 자녀가 고치면 실시간으로 바뀐다
  expiresOn: string; // YYYY-MM-DD (여행일 + 30일, 이 날짜까지 열림)
  /** 확정 때 '나만 보기'를 끈 메모만 담긴다 (장소 ID → 메모). 어르신·가족 화면에 보인다. */
  memos: Record<string, string>;
  /** 자녀가 '여행 완료'를 누른 시각 */
  completedAt: string | null;
  /** 여행 리포트 공유 링크 /r/{token} (읽기 전용, 수정 · 업로드 권한 없음) */
  reportToken: string | null;
}

/**
 * 리포트 공유 링크(/r)가 읽는 공개본: trips/{tripId}/public/report.
 * 여행 문서의 메모 · 조건(나이대 · 이동 불편)은 널리 퍼지는 링크에 싣지 않는다.
 */
export interface ReportSnapshot {
  tripId: string;
  date: string; // 여행일 YYYY-MM-DD
  course: Course;
  expiresOn: string;
  completedAt: string;
}

/** 링크 토큰으로 연 여행. 어떤 역할로 열었는지에 따라 볼 수 있는 값이 다르다 */
export interface TripAccess {
  tripId: string;
  role: TokenRole;
  token: string;
  /** 자녀(family)로 열었을 때만: 어르신 링크 · 자녀 링크 (S3 · S5 공유 카드) */
  seniorToken: string | null;
  familyToken: string | null;
}

export interface PlaceReview {
  rating: number; // 1~5
  text: string; // 한 줄 (선택)
  priv: boolean; // 나만 보기
  at: string; // ISO
}

/** 다른 가족에게 보여 주는 공개 후기 (누가 썼는지는 남기지 않는다) */
export interface PublicReview {
  rating: number;
  text: string;
  at: string;
}

export type LocationStatus =
  | "off" // 위치 수집 설정 OFF (기본)
  | "ok" // 위치 저장됨
  | "skipped" // 동의 화면에서 '위치 없이 시작'
  | "denied"; // 브라우저 위치 권한 거부·실패

export interface PhotoRecord {
  id: string;
  tripId: string;
  takenAt: string; // ISO, 업로드 때 기록한 시각 (EXIF 아님)
  url: string; // 표시용 URL (로컬 구현은 object URL)
  width: number;
  height: number;
  lat: number | null;
  lng: number | null;
  locationStatus: LocationStatus;
  /** 자녀가 카드를 눌러 올린 사진은 고른 장소 순번(0~3)에 바로 붙는다 */
  stopIndex?: number;
  /** 올린 사람 */
  by: "family" | "senior";
}

export interface NewPhoto {
  blob: Blob; // EXIF 제거본
  width: number;
  height: number;
  takenAt: string;
  lat: number | null;
  lng: number | null;
  locationStatus: LocationStatus;
  stopIndex?: number;
}

export type TokenRole = "senior" | "family" | "report"; // report = 여행 리포트 공유 (읽기 전용)

export type TokenLookup =
  { ok: true; access: TripAccess } | { ok: false; reason: "not_found" | "wrong_role" | "expired" };

export type ConsentChoice = "agree" | "no_location";

// ---------- 설정값 (F-24) ----------

export interface Settings {
  /** F-11 다른 코스 보기 (기본 ON) */
  otherCoursesEnabled: boolean;
  /** F-24 위치 수집 (기본 OFF) */
  locationCollectionEnabled: boolean;
  /** 팀 문의 이메일 (발주자 제공) */
  contactEmail: string;
  /** 권역별 응급실 (시트 값이 비었을 때 사용) */
  emergencyByRegion: Record<string, EmergencyInfo>;
  /** 응급실 좌표 목록 (지도 마커, F-09). 이름이 시트 '최근접응급실' 값과 같아야 한다. */
  emergencyRooms: { name: string; phone: string; lat: number; lng: number }[];
  /** F-26 목포 대표 코스 (옵션 C) */
  representativeCourseEnabled: boolean;
  /** F-15 인쇄용 보기 (S) */
  printViewEnabled: boolean;
  /** F-22 60초 자동 갱신 (S) */
  autoRefreshEnabled: boolean;
  autoRefreshSeconds: number;
  /** 링크 유효기간 (여행일 + N일) */
  tripExpiryDays: number;
  /** 업로드 사진 긴 변 최대 px */
  photoMaxPx: number;
  /** 룰 해석 스위치 (킥오프 때 확정) */
  rules: {
    allowP3Swap: boolean;
    fallbackOnInfeasible: boolean;
  };
}

// ---------- 운영진 추천 코스 (관리자 페이지) ----------

export interface CuratedStop {
  id: string;
  /** 장소 데이터에 있는 곳이면 그 ID (접근성 정보 · 응급실을 가져온다), 지도에서 새로 찍은 곳이면 없음 */
  placeId?: string;
  name: string;
  lat: number;
  lng: number;
  role: StopRole;
  stayMin: number;
  desc: string;
  photos: string[]; // URL 또는 data URL
}

export interface CuratedCourse {
  id: string;
  title: string;
  summary: string;
  stops: CuratedStop[];
  published: boolean;
  updatedAt: string;
}
