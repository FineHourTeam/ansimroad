// 링크 보내기(F-15): 부모님 링크 · 자녀 링크 주소, 카카오톡(웹 공유) · 복사.
import { toast } from "sonner";
import type { TripSnapshot } from "@/shared/domain/types";
import { track } from "@/shared/lib/analytics";
import { koreanMonthDay } from "@/shared/lib/date";
import { copyText, shareLink } from "@/shared/lib/share";

/** 화면 경로 → 전체 주소 */
export const absoluteUrl = (path: string) => `${window.location.origin}${path}`;

/** 'https://ansimroad.web.app/t/AB12' → 'ansimroad.web.app/t/AB12' */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//, "");

export async function copyLink(url: string, doneText: string): Promise<void> {
  if (await copyText(url)) toast.success(doneText);
  else toast.error("복사하지 못했어요. 다시 눌러 주세요");
}

/** 카카오톡으로 보내기: 공유 창을 못 열면 복사로 대신한다 */
export async function sendSeniorLink(trip: TripSnapshot, url: string): Promise<void> {
  track("share_kakao");
  const head = `${koreanMonthDay(trip.input.date)} ${trip.course.title}`;
  const r = await shareLink({ title: head, text: `${head} — 사진만 찍으세요`, url });
  if (r === "failed") await copyLink(url, "부모님 링크를 복사했어요");
}
