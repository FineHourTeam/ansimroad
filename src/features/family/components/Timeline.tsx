// ③ 예정과 실제(사진)를 나란히 (휴대폰 폭은 위아래로). 여행 당일에는 지금 시각을 빨간 선으로 보여 준다.
import { Fragment } from "react";
import type { Course, PhotoRecord, Transport } from "@/shared/domain/types";
import type { NowPos } from "@/shared/engine/timeline";
import type { UploadState } from "../hooks/usePhotoUpload";
import { NowLine } from "./StatusBanner";
import { DOT_COL, ROW_GRID, StopRow } from "./StopRow";

export function Timeline({
  course,
  transport,
  memos,
  slots,
  nowPos,
  nowLabel,
  isPastMin,
  locationOn,
  upload,
  onPick,
  onStay,
  onAddNext,
  onRemove,
  onMemo,
}: {
  course: Course;
  transport: Transport;
  memos: Record<string, string>;
  slots: PhotoRecord[][];
  /** 여행 당일에만 */
  nowPos: NowPos | null;
  nowLabel: string;
  isPastMin: (min: number) => boolean;
  locationOn: boolean;
  upload: UploadState;
  onPick: (index: number) => void;
  onStay: (index: number, deltaMin: number) => void;
  onAddNext: (index: number) => void;
  onRemove: (index: number) => void;
  onMemo: (placeId: string, text: string) => Promise<void>;
}) {
  const busy = upload.kind === "sending";
  return (
    <section aria-label="예정과 실제 사진" className="flex flex-col gap-2">
      <div
        aria-hidden="true"
        className={`${ROW_GRID} text-muted-foreground hidden text-sm font-bold sm:grid`}
      >
        <span className="pl-1">예정</span>
        <span className={DOT_COL} />
        <span className="pl-1">실제 (사진)</span>
      </div>
      <ol className="sm:before:bg-border relative flex flex-col gap-6 sm:gap-3 sm:before:absolute sm:before:inset-y-0 sm:before:left-1/2 sm:before:w-0.5 sm:before:-translate-x-1/2 sm:before:rounded-full">
        {course.stops.map((stop, i) => (
          <Fragment key={stop.place.id}>
            {nowPos?.kind === "before" && nowPos.index === i && (
              <li className="py-3">
                <NowLine label={nowLabel} moving={i > 0} />
              </li>
            )}
            <StopRow
              course={course}
              stop={stop}
              index={i}
              transport={transport}
              memo={memos[stop.place.id]}
              photos={slots[i] ?? []}
              past={isPastMin(stop.arriveMin)}
              nowHere={nowPos?.kind === "inside" && nowPos.index === i}
              nowLabel={nowLabel}
              locationOn={locationOn}
              upload={upload.kind !== "idle" && upload.stopIndex === i ? upload.kind : "idle"}
              uploadReason={
                upload.kind === "error" && upload.stopIndex === i ? upload.reason : null
              }
              busy={busy}
              onPick={onPick}
              onStay={onStay}
              onAddNext={onAddNext}
              onRemove={onRemove}
              onMemo={onMemo}
            />
          </Fragment>
        ))}
        {nowPos?.kind === "after" && (
          <li className="py-3">
            <NowLine label={nowLabel} />
          </li>
        )}
      </ol>
    </section>
  );
}
