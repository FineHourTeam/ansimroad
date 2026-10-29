// 카카오톡으로 보내는 글 (모담 확정 양식 2026-10-16). 링크는 부모님용만 싣는다 (자녀용 링크는 빼고).
// 주소는 카카오톡에서 길게 눌러 복사해 내비게이션에 붙여 넣을 수 있게 장소마다 한 줄로.
import type { TripSnapshot } from "@/shared/domain/types";
import { hhmm, koreanMonthDay, WEEKDAYS, weekdayOf } from "@/shared/lib/date";
import { circled, ROLE_NOTE } from "@/shared/lib/placeFacts";

/** '10월 18일(일)' */
export function monthDayWeekday(ymd: string): string {
  return `${koreanMonthDay(ymd)}(${WEEKDAYS[weekdayOf(ymd)] ?? ""})`;
}

type ShareTrip = Pick<TripSnapshot, "input" | "course">;

/**
 * 자녀가 자기에게 보내 두는 글 (모담 제안 2026-10-29): 카카오톡 '나와의 채팅' · 문자에 보관해 링크를 잃어버려도 다시 찾게 한다.
 * 부모님 링크와 헷갈리지 않게 '자녀용'과 '부모님께는 보내지 마세요'를 링크 바로 위에 둔다
 */
export function familySelfText(trip: ShareTrip, familyUrl: string): string {
  return [
    `[안심로드] ${monthDayWeekday(trip.input.date)} ${trip.course.title}`,
    "자녀용 링크(부모님께는 보내지 마세요)",
    `👉 ${familyUrl}`,
    "이 링크에서 부모님 사진과 여행 현황을 봐요.",
  ].join("\n");
}

/** 부모님께 링크 보내기 (F-15) */
export function seniorShareText(trip: ShareTrip, seniorUrl: string): string {
  const { course } = trip;
  const stops = course.stops.flatMap((s, i) => {
    const head = `${circled(i)} ${hhmm(s.arriveMin)} ${s.place.name}${ROLE_NOTE[s.role] ?? ""}`;
    const addr = s.place.address.trim();
    return addr ? [head, `📍 ${addr}`] : [head];
  });
  return [
    `[안심로드] ${monthDayWeekday(trip.input.date)} ${course.title}`,
    "여행 일정 보내 드려요.",
    "",
    ...stops,
    "",
    "📷 여행 날 아래 링크를 열고 '사진 남기기'만 눌러 주세요.",
    `👉 ${seniorUrl}`,
  ].join("\n");
}

/** 일정표 이미지와 함께 보내는 글 (인쇄 · 이미지 화면) */
export function scheduleShareText(trip: ShareTrip, seniorUrl: string | null): string {
  const { course } = trip;
  const stops = course.stops.map((s, i) => {
    const addr = s.place.address.trim();
    return `${circled(i)} ${hhmm(s.arriveMin)} ${s.place.name}${addr ? ` · ${addr}` : ""}`;
  });
  return [
    `[안심로드] ${monthDayWeekday(trip.input.date)} ${course.title} 일정표예요`,
    `${hhmm(course.startMin)} ~ ${hhmm(course.endMin)} · 걷는 시간 약 ${String(course.totalWalkMin)}분`,
    "",
    ...stops,
    ...(seniorUrl ? ["", `📷 여행 날 사진 남기기: ${seniorUrl}`] : []),
  ].join("\n");
}
