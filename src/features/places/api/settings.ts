// 설정값(F-24): public/config/settings.json 을 실행 중에 읽어서, 재빌드 없이 파일 교체만으로 바뀐다.
// 파일을 못 읽어도 기본값으로 동작한다 (문의 이메일은 확정 주소가 들어오기 전까지 비워 둔다).
import type { Settings } from "@/shared/domain/types";

export const DEFAULT_SETTINGS: Settings = {
  otherCoursesEnabled: true,
  locationCollectionEnabled: false,
  contactEmail: "", // 비어 있으면 화면이 문의 주소를 숨긴다
  emergencyByRegion: {},
  emergencyRooms: [],
  representativeCourseEnabled: false,
  printViewEnabled: false,
  autoRefreshEnabled: false,
  autoRefreshSeconds: 60,
  tripExpiryDays: 30,
  photoMaxPx: 1600,
  rules: { allowP3Swap: true, fallbackOnInfeasible: true },
};

export async function fetchSettings(): Promise<Settings> {
  let json: Partial<Settings> = {};
  try {
    const r = await fetch("/config/settings.json", { cache: "no-cache" });
    if (r.ok) json = (await r.json()) as Partial<Settings>;
  } catch {
    // 네트워크 오류 → 기본값
  }
  // 예시 주소(…@example.com)로는 문의가 어디에도 닿지 않으므로 비운다
  const contactEmail = json.contactEmail?.trim().toLowerCase().endsWith("@example.com")
    ? ""
    : (json.contactEmail ?? "");
  return {
    ...DEFAULT_SETTINGS,
    ...json,
    contactEmail,
    rules: { ...DEFAULT_SETTINGS.rules, ...json.rules },
  };
}
