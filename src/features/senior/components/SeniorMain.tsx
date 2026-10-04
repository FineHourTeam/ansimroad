// S4 본 화면 ①~⑤: 제목 · 오늘 일정(상태 + 지금 시각 선) · 사진 남기기 · 응급실 전화.
// 글자·버튼 기준은 §0.3 S4 열(N-03): 본문 22px+(text-2xl), 장소명 26px+(text-3xl), 버튼 64px+, 회색 글자·팝업 없음. 메뉴·뒤로·로고·법적 링크 없음.
import { useEffect, useState } from "react";
import { useSeniorPhoto } from "../hooks/useSeniorPhoto";
import { canShootOn, countSentToday, dayGapOf, dayNotice } from "../seniorView";
import { PhotoDock } from "./PhotoDock";
import { SeniorFrame, SeniorHeader } from "./SeniorMessage";
import { SeniorTimeline } from "./SeniorTimeline";
import { Seo } from "@/components/Seo";
import { usePhotos } from "@/features/trip";
import type { ConsentChoice, TripSnapshot } from "@/shared/domain/types";
import { nowLinePosition, seniorStates, type StopState } from "@/shared/engine/timeline";
import { now } from "@/shared/lib/clock";
import { hhmm, minutesOfDay, toLocalYmd } from "@/shared/lib/date";

const TICK_MS = 30_000; // 상태(완료 · 지금 여기)는 시각 기준이라 30초마다 다시 계산

export function SeniorMain({
  trip,
  title,
  consent,
  locationOn,
  photoMaxPx,
}: {
  trip: TripSnapshot;
  title: string;
  consent: ConsentChoice;
  locationOn: boolean;
  photoMaxPx: number;
}) {
  const { course } = trip;
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const shoot = useSeniorPhoto({ tripId: trip.tripId, course, consent, locationOn, photoMaxPx });
  const photos = usePhotos(trip.tripId);

  const current = now();
  const minute = minutesOfDay(current);
  const dayGap = dayGapOf(current, trip.input.date);
  const isTripDay = dayGap === 0;
  const past = dayGap > 1; // 다음날까지는 사진을 받으니 이틀째부터 '지난 여행'
  const states: StopState[] = past
    ? course.stops.map(() => "done")
    : seniorStates(course, minute, isTripDay, shoot.nowOverride);
  const nowLine =
    isTripDay && shoot.nowOverride === undefined ? nowLinePosition(course, minute) : null;
  const notice = dayNotice(dayGap);
  const sentToday = countSentToday(photos.data ?? [], toLocalYmd(current));

  return (
    <SeniorFrame>
      <Seo title={title} noindex />
      {/* F-16: 메뉴 · 뒤로 · 로고 없이 날짜와 코스 이름만 */}
      <SeniorHeader trip={trip}>
        {notice && (
          <p className="bg-highlight text-highlight-foreground self-start rounded-full px-4 py-1 text-xl font-bold">
            {notice}
          </p>
        )}
      </SeniorHeader>
      <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
        <SeniorTimeline
          course={course}
          memos={trip.memos}
          states={states}
          nowLine={nowLine}
          nowLabel={hhmm(minute)}
        />
        {course.pharmacy && (
          <p className="bg-background-subtle rounded-2xl px-4 py-3 text-2xl font-semibold">
            가까운 약국 · {course.pharmacy}
          </p>
        )}
      </main>
      <PhotoDock
        phase={shoot.phase}
        canShoot={canShootOn(dayGap)}
        past={past}
        sentToday={sentToday}
        noLocationNote={shoot.noLocationNote}
        er={course.er}
        onFile={shoot.onFile}
      />
    </SeniorFrame>
  );
}
