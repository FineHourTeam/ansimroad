// 링크 보내기(F-15): 부모님 링크 · 자녀 링크 주소, 카카오톡(웹 공유) · 복사.
import { toast } from "sonner";
import type { TripSnapshot } from "@/shared/domain/types";
import { track } from "@/shared/lib/analytics";
import { koreanMonthDay } from "@/shared/lib/date";
import { canWebShare, copyText, shareLink } from "@/shared/lib/share";
import { familySelfText, seniorShareText } from "./shareText";

/** 화면 경로 → 전체 주소 */
export const absoluteUrl = (path: string) => `${window.location.origin}${path}`;

/** 'https://ansimroad.web.app/t/AB12' → 'ansimroad.web.app/t/AB12' */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, "");

export async function copyLink(url: string, doneText: string): Promise<void> {
  if (await copyText(url)) toast.success(doneText);
  else toast.error("복사하지 못했어요. 다시 눌러 주세요");
}

/**
 * 카카오톡으로 보내기: 날짜 · 코스 · 장소별 시각 · 주소 + 부모님 링크 (링크는 글 맨 끝에).
 * 공유 창이 없거나(안드로이드 카카오톡 인앱 · PC 파이어폭스 등) 못 열면 글째 복사해 붙여 넣게 한다
 */
export async function sendSeniorLink(trip: TripSnapshot, url: string): Promise<void> {
  track("share_kakao");
  const text = seniorShareText(trip, url);
  const r = canWebShare()
    ? await shareLink({ title: `${koreanMonthDay(trip.input.date)} ${trip.course.title}`, text })
    : "failed";
  if (r !== "failed") return;
  if (await copyText(text))
    toast.success("일정과 부모님 링크를 복사했어요. 카카오톡에 붙여 넣어 주세요");
  else toast.error("복사하지 못했어요. 다시 눌러 주세요");
}

/** 보내 두기 버튼 아래 안내 */
export const SELF_LINK_HINT =
  "카카오톡 '나와의 채팅'에 보내 두면 링크를 잃어버려도 다시 찾을 수 있어요.";

/**
 * 내 카톡·문자로 보내 두기 (모담 제안 2026-10-29): 휴대폰 공유 창으로 자녀용 링크를 자기에게 보낸다(받는 곳은 사용자가 고른다).
 * 공유 창이 없거나 PC 면 같은 글을 복사해 '나와의 채팅'에 붙여 넣게 한다
 */
export async function sendFamilyLinkToSelf(trip: TripSnapshot, url: string): Promise<void> {
  const text = familySelfText(trip, url);
  const r = canWebShare() ? await shareLink({ title: "안심로드 자녀용 링크", text }) : "failed";
  if (r !== "failed") return;
  if (await copyText(text))
    toast.success("자녀용 링크를 복사했어요. 카카오톡 '나와의 채팅'에 붙여 넣어 두세요");
  else toast.error("복사하지 못했어요. 다시 눌러 주세요");
}
