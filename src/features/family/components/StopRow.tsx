// ③ 타임라인 한 줄: 왼쪽 예정(시각 · 장소 · 머무는 시간 조정) | 가운데 점 | 오른쪽 실제 사진 칸
import { AddIcon, CameraIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Course, PhotoRecord, Stop } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
import { PhotoCard } from "./PhotoCard";
import { NowLine } from "./StatusBanner";

/** 예정 | 점 | 사진 — 가운데 칸 폭은 DOT_COL 이 정한다 */
export const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-1.5 sm:gap-x-0";
export const DOT_COL = "w-5 sm:w-10";

export interface StopRowProps {
  course: Course;
  stop: Stop;
  index: number;
  memo: string | undefined;
  photos: PhotoRecord[];
  past: boolean;
  /** 지금 이 장소에 머무는 중 */
  nowHere: boolean;
  nowLabel: string;
  locationOn: boolean;
  upload: "idle" | "sending" | "error";
  busy: boolean;
  onPick: (index: number) => void;
  onStay: (index: number, deltaMin: number) => void;
}

function StayAdjust({ stop, index, onStay }: Pick<StopRowProps, "stop" | "index" | "onStay">) {
  const name = stop.place.name;
  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5">
      <p className="text-sm font-bold">머무는 시간 {stop.stayMin}분</p>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="xl"
          className="px-3"
          aria-label={`${name} 10분 줄이기`}
          onClick={() => {
            onStay(index, -10);
          }}
        >
          −10분
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="px-3"
          aria-label={`${name} 10분 늘리기`}
          onClick={() => {
            onStay(index, 10);
          }}
        >
          +10분
        </Button>
      </div>
    </div>
  );
}

function PhotoSlot(p: StopRowProps) {
  const name = p.stop.place.name;
  const pick = () => {
    p.onPick(p.index);
  };
  return (
    <div role="group" aria-label={`${name} 실제 사진`} className="flex min-w-0 flex-col gap-2">
      {p.photos.length > 0 ? (
        <>
          {p.photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} course={p.course} locationOn={p.locationOn} />
          ))}
          <Button
            variant="outline"
            size="xl"
            className="self-start"
            disabled={p.busy}
            aria-label={`${name} 사진 더 올리기`}
            onClick={pick}
          >
            <AddIcon />
            사진
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="xl"
          className="h-auto min-h-24 w-full flex-1 flex-col gap-1 border-dashed px-2 py-3 whitespace-normal"
          disabled={p.busy}
          aria-label={`${name} 사진 올리기`}
          onClick={pick}
        >
          <span className="text-muted-foreground">
            {p.past ? "아직 사진이 없어요" : "아직 도착 전"}
          </span>
          <span className="text-primary flex items-center gap-1 font-bold">
            <CameraIcon size="sm" />
            눌러서 사진 올리기
          </span>
        </Button>
      )}
      {p.upload === "sending" && (
        <p role="status" className="text-center text-sm font-bold">
          사진을 올리는 중이에요…
        </p>
      )}
      {p.upload === "error" && (
        <p role="alert" className="text-destructive text-center text-sm font-bold">
          사진을 올리지 못했어요. 다시 눌러 주세요
        </p>
      )}
    </div>
  );
}

export function StopRow(p: StopRowProps) {
  const { stop } = p;
  const has = p.photos.length > 0;
  return (
    <li className={ROW_GRID}>
      <div className="bg-card text-card-foreground flex flex-col gap-1.5 rounded-lg border p-3 shadow-sm sm:p-4">
        <p className="flex flex-wrap items-center gap-1.5">
          <strong className="text-lg font-extrabold tabular-nums">{hhmm(stop.arriveMin)}</strong>
          <Badge variant="secondary">{ROLE_LABEL[stop.role]}</Badge>
        </p>
        <p className="text-base leading-snug font-bold">{stop.place.name}</p>
        {p.memo && <p className="text-muted-foreground text-sm">메모: {p.memo}</p>}
        <StayAdjust stop={stop} index={p.index} onStay={p.onStay} />
        {/* 지금 선은 제 줄을 따로 둔다: 글자 · 버튼 · 장소 사진을 가로지르지 않게 */}
        {p.nowHere && (
          <div className="py-3">
            <NowLine label={p.nowLabel} />
          </div>
        )}
        {stop.place.photoUrl && (
          <PlacePhoto url={stop.place.photoUrl} urls={stop.place.photoUrls} alt={stop.place.name} />
        )}
      </div>
      <span aria-hidden="true" className={cn("flex items-center justify-center", DOT_COL)}>
        <span
          className={cn(
            "ring-background z-10 size-3.5 rounded-full ring-4",
            has ? "bg-success text-success-foreground" : "bg-border",
          )}
        />
      </span>
      <PhotoSlot {...p} />
    </li>
  );
}
