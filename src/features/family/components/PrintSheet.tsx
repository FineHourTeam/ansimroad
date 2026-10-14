// 인쇄용 한 장 (A4 · 여백 12mm): 머리띠(오른쪽에 코스 지도) · 시간 줄 일정(장소마다 정사각형 사진) · 메모 · 공개 후기 · 안전 정보 · 두 링크 QR.
// 꼬리표는 어르신이 읽기 좋게 종이에서 한 단계 크게 — 대신 여유 장소는 꼬리표 없이 (한 장에 들어가게).
// 화면에서는 모래빛 위 흰 종이, 인쇄할 때는 한 쪽을 꽉 채운다 (QR 은 쪽 아래에 붙는다).
import { useMemo } from "react";
import { paths } from "@/app/paths";
import { StarIcon } from "@/components/icons";
import { MapView } from "@/shared/components/MapView";
import type { PlaceReview, Stop, TripAccess, TripSnapshot } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { courseMapPoints } from "@/shared/lib/mapPoints";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
import { absoluteUrl } from "../lib/links";
import { FactTags, MemoNote, PlaceLine, QrCard, SafetyBox, SheetHeader } from "./SheetParts";

function Review({ review }: { review: PlaceReview }) {
  return (
    <p className="flex flex-wrap items-center gap-1 font-semibold">
      <span className="text-highlight flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].slice(0, review.rating).map((n) => (
          <StarIcon key={n} size="sm" fill="currentColor" />
        ))}
      </span>
      <span className="sr-only">별점 {review.rating}점</span>
      {review.text}
    </p>
  );
}

function StopItem({
  stop,
  num,
  memo,
  review,
}: {
  stop: Stop;
  num: number;
  memo?: string;
  review?: PlaceReview;
}) {
  return (
    <li className="group flex break-inside-avoid gap-3 pb-5 last:pb-0 print:pb-3">
      <div className="flex w-14 shrink-0 flex-col items-end">
        <strong className="text-primary text-lg leading-7 font-extrabold tabular-nums">
          {hhmm(stop.arriveMin)}
        </strong>
        <span className="text-muted-foreground text-sm font-semibold whitespace-nowrap">
          {ROLE_LABEL[stop.role]}
        </span>
      </div>
      {/* 번호 배지 + 다음 장소로 이어지는 선 */}
      <div className="relative flex w-7 shrink-0 justify-center">
        <span className="bg-primary text-primary-foreground z-10 grid size-7 place-items-center rounded-full text-sm font-bold">
          {num}
        </span>
        <span
          aria-hidden="true"
          className="bg-border absolute top-8 -bottom-1 w-0.5 rounded-full group-last:hidden"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm print:gap-1">
        <p className="text-lg leading-7 font-extrabold tracking-tight">{stop.place.name}</p>
        <div className="flex items-start gap-3">
          {stop.place.photoUrl && (
            <img
              src={stop.place.photoUrl}
              alt={`${stop.place.name} 사진`}
              decoding="async"
              referrerPolicy="no-referrer"
              className="bg-background-subtle aspect-square w-20 shrink-0 rounded-xl object-cover sm:w-24"
              onError={(e) => {
                e.currentTarget.hidden = true;
              }}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 print:gap-1">
            <PlaceLine
              place={stop.place}
              stayMin={stop.stayMin}
              travelMin={num > 1 ? stop.travelMin : 0}
            />
            <FactTags place={stop.place} className="text-xs print:text-sm" />
          </div>
        </div>
        {memo && <MemoNote memo={memo} />}
        {review && !review.priv && <Review review={review} />}
      </div>
    </li>
  );
}

export function PrintSheet({
  trip,
  access,
  reviews,
}: {
  trip: TripSnapshot;
  access: TripAccess;
  reviews: Record<string, PlaceReview>;
}) {
  const { course, input } = trip;
  const spare = course.spare;
  // 지도는 points 가 바뀌면 다시 그리므로 고정한다
  const points = useMemo(() => courseMapPoints(course, { emergencyRooms: [] }), [course]);
  return (
    <article className="bg-card text-card-foreground mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl border p-4 leading-relaxed shadow-sm [-webkit-print-color-adjust:exact] [print-color-adjust:exact] sm:p-8 print:min-h-[270mm] print:max-w-none print:gap-3 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <SheetHeader
        date={input.date}
        course={course}
        map={<MapView points={points} still className="border-0" />}
      />

      <ol aria-label="일정" className="flex flex-col px-1">
        {course.stops.map((s, i) => (
          <StopItem
            key={s.place.id}
            stop={s}
            num={i + 1}
            memo={trip.memos[s.place.id]}
            review={reviews[s.place.id]}
          />
        ))}
      </ol>

      <div className="grid gap-3 text-sm sm:grid-cols-2 print:grid-cols-2">
        {spare && (
          <section
            aria-label="여유가 있으면"
            className="border-input flex break-inside-avoid flex-col gap-1.5 rounded-2xl border border-dashed p-4 print:gap-1 print:p-3"
          >
            <h2 className="text-primary text-sm font-extrabold">여유가 있으면</h2>
            <p className="text-base font-extrabold">{spare.name}</p>
            <PlaceLine place={spare} stayMin={spare.stayMin} />
          </section>
        )}
        <SafetyBox
          course={course}
          className={spare ? undefined : "sm:col-span-2 print:col-span-2"}
        />
      </div>

      {/* 인쇄할 때는 쪽 아래로 붙는다 (print:min-h + mt-auto) */}
      <div className="flex flex-col gap-3 print:mt-auto print:gap-2">
        <section aria-label="링크 주소" className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          {access.seniorToken && (
            <QrCard
              label="부모님용"
              title="여행 당일 사진 남기기"
              url={absoluteUrl(paths.senior(access.seniorToken))}
            />
          )}
          <QrCard
            label="자녀용"
            title="부모님 사진과 현황 보기"
            url={absoluteUrl(paths.family(access.token))}
          />
        </section>
        <p className="text-muted-foreground text-center text-xs">
          자료: 한국관광공사 TourAPI · 국립중앙의료원 · 모담 현장·전화 확인 · 안심로드
        </p>
      </div>
    </article>
  );
}
