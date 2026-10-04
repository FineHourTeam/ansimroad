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
  ImageIcon,
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
        "bg-card text-card-foreground border-border/80 flex flex-col rounded-2xl border shadow-sm",
        open && "border-primary ring-primary/15 ring-2",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <div className="flex flex-wrap items-center gap-3 p-3 pr-4">
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground cursor-grab touch-none"
          {...attributes}
          {...listeners}
          aria-label="끌어서 순서 바꾸기"
        >
          <DragHandleIcon />
        </Button>
        <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums">
          {n}
        </span>
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <Label htmlFor={`${id}-name`} className="sr-only">
            {n}번 장소 이름
          </Label>
          <Input
            id={`${id}-name`}
            className="h-10 text-base font-semibold md:text-base"
            maxLength={30}
            value={stop.name}
            onChange={(e) => {
              const name = e.target.value;
              onPatch(() => ({ name }));
            }}
          />
        </div>
        <Label htmlFor={`${id}-role`} className="sr-only">
          {n}번 장소 구분
        </Label>
        <Select
          value={stop.role}
          onValueChange={(v) => {
            onPatch(() => ({ role: v as StopRole }));
          }}
        >
          <SelectTrigger id={`${id}-role`} className="w-28 data-[size=default]:h-10">
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
        <span className="border-input bg-background flex h-10 items-center rounded-lg border px-1 font-semibold whitespace-nowrap">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="10분 줄이기"
            disabled={stop.stayMin <= STAY_MIN}
            onClick={() => {
              onPatch((s) => ({ stayMin: stepStay(s.stayMin, -STAY_STEP) }));
            }}
          >
            <MinusIcon />
          </Button>
          <span aria-live="polite" className="w-12 text-center tabular-nums">
            {stop.stayMin}분
          </span>
          <Button
            variant="ghost"
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
        <span className="text-muted-foreground flex items-center">
          <Button
            variant="ghost"
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
            variant="ghost"
            size="icon-sm"
            aria-label="아래로 옮기기"
            disabled={index === count - 1}
            onClick={() => {
              onMove(1);
            }}
          >
            <ChevronDownIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="코스에서 빼기" onClick={onRemove}>
            <DeleteIcon />
          </Button>
        </span>
        {/* 폭을 고정해 펼침 · 사진 수와 상관없이 모든 줄의 칸이 같은 자리에 선다 */}
        <Button
          variant={open ? "secondary" : "outline"}
          className="ml-auto w-40"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={onToggle}
        >
          <ImageIcon />
          사진 · 설명
          {stop.photos.length > 0 && (
            <span className="text-primary text-xs font-bold tabular-nums">
              {stop.photos.length}장
            </span>
          )}
          <ChevronDownIcon className={cn("ml-auto transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {!stop.placeId && (
        <p className="text-muted-foreground -mt-1 pr-4 pb-3 pl-24 text-sm">
          지도에서 찍은 새 위치 · 접근성 정보 없음 (확인 배지 없음)
        </p>
      )}
      {open && (
        <div
          id={`${id}-body`}
          className="bg-background-subtle/60 flex flex-col gap-4 rounded-b-2xl border-t p-4 pl-24"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-desc`} className="font-semibold">
              설명
            </Label>
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
