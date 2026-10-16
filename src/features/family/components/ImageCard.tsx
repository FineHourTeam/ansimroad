// 휴대폰 화면용 일정표 카드 — 화면 밖에 그려 두었다가 PNG(가로 1080px)로 굽는다 (lib/imageExport).
// 인쇄용과 같은 내용을 한 줄 폭으로, 링크는 부모님용 QR 하나만. 외부 장소 사진은 담지 않는다 (관광공사 사진 서버가 CORS 를 막는다).
import type { Ref } from "react";
import { paths } from "@/app/paths";
import type { Stop, TripAccess, TripSnapshot } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { courseTone } from "@/shared/lib/courseTheme";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
import { absoluteUrl } from "../lib/links";
import { AddressLine, MemoNote, PlaceLine, QrCard, SafetyBox, SheetHeader } from "./SheetParts";

function CardStop({ stop, num, memo }: { stop: Stop; num: number; memo?: string }) {
  return (
    <li className="flex gap-3">
      <span className="bg-course text-course-foreground grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold">
        {num}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-course text-base leading-7 font-extrabold tabular-nums">
          {hhmm(stop.arriveMin)}
          <span className="text-muted-foreground ml-1.5 text-sm font-semibold">
            {ROLE_LABEL[stop.role]}
          </span>
        </p>
        <p className="text-lg leading-snug font-extrabold tracking-tight">{stop.place.name}</p>
        <AddressLine address={stop.place.address} />
        {/* 휴대폰 한두 화면에 들어오게: 시각 · 이름 · 주소 · 머무는 시간 · 전화 · 메모만 (꼬리표 · 이동 시간은 인쇄용에) */}
        <PlaceLine place={stop.place} stayMin={stop.stayMin} />
        {memo && <MemoNote memo={memo} />}
      </div>
    </li>
  );
}

/** 폭 360px(w-90) 고정 — lib/imageExport 의 CARD_WIDTH 와 같다 */
export function ImageCard({
  trip,
  access,
  ref,
}: {
  trip: TripSnapshot;
  access: TripAccess;
  ref: Ref<HTMLDivElement>;
}) {
  const { course, input } = trip;
  return (
    <div
      ref={ref}
      data-course={courseTone(course.theme)}
      className="bg-background-subtle text-foreground flex w-90 flex-col gap-3 p-4 text-sm leading-relaxed"
    >
      <SheetHeader date={input.date} course={course} />

      <ol className="bg-card text-card-foreground flex flex-col gap-4 rounded-2xl border p-4">
        {course.stops.map((s, i) => (
          <CardStop key={s.place.id} stop={s} num={i + 1} memo={trip.memos[s.place.id]} />
        ))}
      </ol>

      {course.spare && (
        <p className="border-input rounded-2xl border border-dashed px-4 py-3">
          <span className="text-primary font-extrabold">여유가 있으면 </span>
          <strong className="font-extrabold">{course.spare.name}</strong>
          {course.spare.stayMin !== null && ` · 머무는 시간 ${String(course.spare.stayMin)}분`}
        </p>
      )}

      <SafetyBox course={course} />

      {access.seniorToken && (
        <QrCard
          label="부모님용"
          title="여행 당일 사진 남기기"
          url={absoluteUrl(paths.senior(access.seniorToken))}
          qrSize={104}
        />
      )}
      <p className="text-muted-foreground text-center text-xs">
        자료: 한국관광공사 TourAPI · 국립중앙의료원 · 모담 현장·전화 확인 · 안심로드
      </p>
    </div>
  );
}
