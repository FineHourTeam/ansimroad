// 코스 장소 한 칸: 끌어서 · 위아래 버튼으로 순서 바꾸기, 이름 · 구분 · 머무는 시간, 펼치면 설명 · 사진
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ROLES, STAY_MAX, STAY_MIN, STAY_STEP, stepStay } from "./draft";
import { StopPhotos } from "./StopPhotos";
import {
  AddIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DeleteIcon,
  DragHandleIcon,
  MinusIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CuratedStop, StopRole } from "@/shared/domain/types";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";

export type StopPatch = (s: CuratedStop) => Partial<CuratedStop>;

export function StopCard({
  stop,
  index,
  count,
  courseId,
  open,
  onToggle,
  onPatch,
  onMove,
  onRemove,
  onBusy,
}: {
  stop: CuratedStop;
  index: number;
  count: number;
  courseId: string;
  open: boolean;
  onToggle: () => void;
  onPatch: (fn: StopPatch) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onBusy: (delta: 1 | -1) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });
  const n = String(index + 1);
  const id = `stop-${stop.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={`${n}번 장소`}
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-lg border p-3",
        open && "border-primary",
        isDragging && "relative z-10 shadow-md",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon-sm"
          className="cursor-grab touch-none"
          {...attributes}
          {...listeners}
          aria-label="끌어서 순서 바꾸기"
        >
          <DragHandleIcon />
        </Button>
        <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold">
          {n}
        </span>
        <Label htmlFor={`${id}-name`} className="sr-only">
          {n}번 장소 이름
        </Label>
        <Input
          id={`${id}-name`}
          className="min-w-40 flex-1 font-semibold"
          maxLength={30}
          value={stop.name}
          onChange={(e) => {
            const name = e.target.value;
            onPatch(() => ({ name }));
          }}
        />
        <Label htmlFor={`${id}-role`} className="sr-only">
          {n}번 장소 구분
        </Label>
        <Select
          value={stop.role}
          onValueChange={(v) => {
            onPatch(() => ({ role: v as StopRole }));
          }}
        >
          <SelectTrigger id={`${id}-role`} className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center gap-1 font-semibold whitespace-nowrap">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="10분 줄이기"
            disabled={stop.stayMin <= STAY_MIN}
            onClick={() => {
              onPatch((s) => ({ stayMin: stepStay(s.stayMin, -STAY_STEP) }));
            }}
          >
            <MinusIcon />
          </Button>
          <span aria-live="polite">{stop.stayMin}분</span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="10분 늘리기"
            disabled={stop.stayMin >= STAY_MAX}
            onClick={() => {
              onPatch((s) => ({ stayMin: stepStay(s.stayMin, STAY_STEP) }));
            }}
          >
            <AddIcon />
          </Button>
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="위로 옮기기"
            disabled={index === 0}
            onClick={() => {
              onMove(-1);
            }}
          >
            <ChevronUpIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="아래로 옮기기"
            disabled={index === count - 1}
            onClick={() => {
              onMove(1);
            }}
          >
            <ChevronDownIcon />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="코스에서 빼기" onClick={onRemove}>
            <DeleteIcon />
          </Button>
          <Button
            variant="link"
            aria-expanded={open}
            aria-controls={`${id}-body`}
            onClick={onToggle}
          >
            {open
              ? "접기"
              : `사진 · 설명${stop.photos.length > 0 ? ` (${String(stop.photos.length)}장)` : ""}`}
          </Button>
        </span>
      </div>
      {!stop.placeId && (
        <p className="text-muted-foreground text-xs">
          지도에서 찍은 새 위치 · 접근성 정보 없음 (확인 배지 없음)
        </p>
      )}
      {open && (
        <div id={`${id}-body`} className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-desc`}>설명</Label>
            <Textarea
              id={`${id}-desc`}
              rows={3}
              maxLength={300}
              placeholder="예: 입구 오른쪽 경사로로 들어가면 계단이 없어요. 2층 창가 자리가 바다 전망"
              value={stop.desc}
              onChange={(e) => {
                const desc = e.target.value;
                onPatch(() => ({ desc }));
              }}
            />
          </div>
          <StopPhotos
            courseId={courseId}
            stopId={stop.id}
            stopName={stop.name}
            photos={stop.photos}
            onBusy={onBusy}
            onAdd={(urls) => {
              onPatch((s) => ({
                photos: [...s.photos, ...urls.filter((u) => !s.photos.includes(u))],
              }));
            }}
            onRemove={(url) => {
              onPatch((s) => ({ photos: s.photos.filter((x) => x !== url) }));
            }}
          />
        </div>
      )}
    </li>
  );
}
