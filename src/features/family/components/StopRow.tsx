// ③ 타임라인 한 줄: 왼쪽 예정(번호 · 시각 · 장소 · 주소 복사 · 길찾기 · 머무는 시간 조정) | 가운데 점 | 오른쪽 실제 사진 칸
import { AddIcon, CameraIcon, CopyIcon, MapPinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Course, PhotoRecord, Stop, Transport } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { naverDirectionsLink } from "@/shared/lib/format";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
import { copyLink } from "../lib/links";
import { PhotoCard } from "./PhotoCard";
import { NowLine } from "./StatusBanner";

/** 예정 | 점 | 사진 — 가운데 칸 폭은 DOT_COL 이 정한다 */
export const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-1.5 sm:gap-x-0";
export const DOT_COL = "w-5 sm:w-10";

export interface StopRowProps {
  course: Course;
  stop: Stop;
  index: number;
  /** 길찾기 수단 (자가용 → 자동차, 택시 · 버스 → 대중교통) */
  transport: Transport;
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
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold">머무는 시간 {stop.stayMin}분</p>
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="xl"
          className="px-1"
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
          className="px-1"
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

/** 주소 글자(길게 눌러 고를 수 있다) + [주소 복사] [길찾기] — 네이버 지도 길찾기는 장소 좌표로 연결한다 */
function PlaceAddress({ stop, transport }: Pick<StopRowProps, "stop" | "transport">) {
  const { place } = stop;
  const address = place.address.trim();
  return (
    <div className="flex flex-col gap-1.5">
      {address && <p className="text-muted-foreground text-sm leading-snug">{address}</p>}
      <div className={address ? "grid grid-cols-2 gap-1.5" : "grid"}>
        {address && (
          <Button
            variant="outline"
            size="xl"
            className="px-1 text-sm"
            aria-label={`${place.name} 주소 복사`}
            onClick={() => void copyLink(address, "주소를 복사했어요")}
          >
            {/* 휴대폰 반 칸은 좁아서 글자만 (아이콘은 넓은 화면에서) */}
            <CopyIcon size="sm" className="hidden sm:block" />
            주소 복사
          </Button>
        )}
        <Button variant="outline" size="xl" className="px-1 text-sm" asChild>
          <a
            href={naverDirectionsLink(place, transport)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${place.name} 네이버 지도 길찾기 (새 창)`}
          >
            <MapPinIcon size="sm" className="hidden sm:block" />
            길찾기
          </a>
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
            className="w-full border-dashed"
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
          className="bg-card/60 h-auto min-h-36 w-full flex-1 flex-col gap-2 rounded-2xl border-dashed px-2 py-4 whitespace-normal"
          disabled={p.busy}
          aria-label={`${name} 사진 올리기`}
          onClick={pick}
        >
          <span className="bg-accent text-primary grid size-11 place-items-center rounded-full">
            <CameraIcon />
          </span>
          <span className="text-muted-foreground text-sm font-medium">
            {p.past ? "아직 사진이 없어요" : "아직 도착 전"}
          </span>
          <span className="text-primary text-sm font-bold">눌러서 사진 올리기</span>
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
      {/* self-start: 사진이 여러 장이어도 예정 카드는 제 내용 높이만 */}
      <div className="bg-card text-card-foreground border-border/80 flex flex-col gap-2 self-start rounded-2xl border p-3 shadow-sm sm:p-4">
        <p className="flex items-center gap-1.5">
          <span className="bg-course text-course-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold">
            {p.index + 1}
          </span>
          <strong className="text-lg leading-none font-extrabold tabular-nums">
            {hhmm(stop.arriveMin)}
          </strong>
        </p>
        {/* 역할(오전 · 점심 · 쉬어 가기)은 늘 이름 위 한 줄 — 좁은 칸에서도 네 카드의 머리 모양이 같다 */}
        <p className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-sm font-semibold">
            {ROLE_LABEL[stop.role]}
          </span>
          <span className="text-base leading-snug font-bold">{stop.place.name}</span>
        </p>
        <PlaceAddress stop={stop} transport={p.transport} />
        {p.memo && (
          <p className="bg-highlight/25 text-highlight-foreground dark:bg-highlight/15 dark:text-highlight rounded-lg px-2 py-1 text-sm font-medium">
            메모: {p.memo}
          </p>
        )}
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
      {/* 점은 번호 · 시각 줄 높이에 (가운데에 두면 사진이 많은 줄에서 떠 보인다) */}
      <span aria-hidden="true" className={cn("flex justify-center pt-4 sm:pt-5", DOT_COL)}>
        <span
          className={cn(
            "ring-background-subtle z-10 size-3.5 rounded-full ring-4",
            has ? "bg-success text-success-foreground" : "bg-input",
          )}
        />
      </span>
      <PhotoSlot {...p} />
    </li>
  );
}
