// 확정 후 코스 수정 (지도 기반): 출발 시각 옮기기 · 장소 고르기(칩 · 지도 마커) · 머무는 시간 · 빼기 · 다른 장소 넣기
import { EditIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Course, Place } from "@/shared/domain/types";
import {
  addPlace,
  changeStay,
  MAX_STOPS,
  moveStop,
  MAX_STOPS_MESSAGE,
  removeStop,
  shiftStart,
} from "@/shared/lib/courseEdit";
import { hhmm } from "@/shared/lib/date";

export interface CandidatesStatus {
  pending: boolean;
  /** 있으면 불러오지 못한 것 */
  onRetry?: () => void;
}

export function CourseEditor({
  course,
  candidates,
  candidatesStatus,
  selId,
  onSelect,
  onChange,
}: {
  course: Course;
  /** 코스에 아직 없는 장소 */
  candidates: Place[];
  candidatesStatus?: CandidatesStatus;
  selId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: Course) => void;
}) {
  const selIndex = course.stops.findIndex((s) => s.place.id === selId);
  const sel = course.stops[selIndex];
  const selCand = sel ? undefined : candidates.find((p) => p.id === selId);
  const full = course.stops.length >= MAX_STOPS;

  return (
    <Card className="gap-0 py-0">
      <header className="bg-primary/5 flex items-start gap-3 px-5 py-4">
        <span className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full">
          <EditIcon size="sm" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-lg font-bold tracking-tight">코스 고치기</h3>
          <p className="text-muted-foreground text-sm">
            장소를 골라 시간을 고치거나 빼요. 지도의 회색 점이나 ‘다른 장소 넣기’로 새 장소를 넣어요
          </p>
        </div>
      </header>

      <div className="flex flex-col divide-y">
        {/* 출발 시각: shiftStart 는 07:00 ~ 16:00 사이로만 옮긴다 */}
        <section className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <span className="text-base font-bold">출발 시각</span>
          <Stepper
            value={hhmm(course.startMin)}
            minus={{
              label: "−10분 출발 앞당기기",
              disabled: course.startMin <= 7 * 60,
              onClick: () => {
                onChange(shiftStart(course, -10));
              },
            }}
            plus={{
              label: "+10분 출발 늦추기",
              disabled: course.startMin >= 16 * 60,
              onClick: () => {
                onChange(shiftStart(course, 10));
              },
            }}
          />
        </section>

        <section className="flex flex-col gap-3 px-5 py-4">
          <span className="text-base font-bold">고칠 장소</span>
          {/* 지도 마커가 겹쳐도 고를 수 있게 장소 칩 */}
          <ToggleGroup
            type="single"
            variant="choice"
            size="xl"
            aria-label="고칠 장소 고르기"
            value={sel ? sel.place.id : ""}
            onValueChange={(v) => {
              onSelect(v || null);
            }}
            className="w-full flex-wrap"
          >
            {course.stops.map((st, i) => (
              <ToggleGroupItem key={st.place.id} value={st.place.id} className="max-w-full px-4">
                <span className="tabular-nums">{i + 1}</span>{" "}
                <span className="truncate">{st.place.name}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {sel && (
            <div className="bg-background-subtle flex flex-col gap-3 rounded-xl p-4">
              <strong className="text-lg">
                {selIndex + 1}. {sel.place.name}
              </strong>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base">머무는 시간</span>
                <Stepper
                  value={`${String(sel.stayMin)}분`}
                  minus={{
                    label: "−10분 머무는 시간 줄이기",
                    disabled: sel.stayMin <= 10,
                    onClick: () => {
                      onChange(changeStay(course, selIndex, -10));
                    },
                  }}
                  plus={{
                    label: "+10분 머무는 시간 늘리기",
                    disabled: sel.stayMin >= 180,
                    onClick: () => {
                      onChange(changeStay(course, selIndex, 10));
                    },
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base">순서</span>
                <Stepper
                  value={`${String(selIndex + 1)}번째`}
                  minus={{
                    label: "앞으로 한 칸 옮기기",
                    text: "앞으로",
                    disabled: selIndex === 0,
                    onClick: () => {
                      onChange(moveStop(course, selIndex, -1));
                    },
                  }}
                  plus={{
                    label: "뒤로 한 칸 옮기기",
                    text: "뒤로",
                    disabled: selIndex === course.stops.length - 1,
                    onClick: () => {
                      onChange(moveStop(course, selIndex, 1));
                    },
                  }}
                />
              </div>
              <Button
                variant="destructive"
                size="xl"
                className="w-full"
                disabled={course.stops.length <= 1}
                onClick={() => {
                  onChange(removeStop(course, selIndex));
                  onSelect(null);
                }}
              >
                코스에서 빼기
              </Button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 px-5 py-4">
          {candidatesStatus?.pending ? (
            <Skeleton className="h-12 w-full" />
          ) : candidatesStatus?.onRetry ? (
            <div className="flex flex-wrap items-center gap-2 text-base">
              <p className="flex-1">장소 목록을 불러오지 못했어요</p>
              <Button variant="outline" size="xl" onClick={candidatesStatus.onRetry}>
                다시 불러오기
              </Button>
            </div>
          ) : full ? (
            <p className="text-muted-foreground text-sm">{MAX_STOPS_MESSAGE}</p>
          ) : candidates.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-place" className="text-base font-bold">
                다른 장소 넣기
              </Label>
              <Select
                value={selCand ? selCand.id : ""}
                onValueChange={(v) => {
                  onSelect(v);
                }}
              >
                <SelectTrigger
                  id="add-place"
                  className="bg-background w-full text-base data-[size=default]:h-12"
                >
                  <SelectValue placeholder="지도의 회색 점이나 여기서 골라요" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="min-h-12 text-base">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">코스에 더 넣을 수 있는 장소가 없어요</p>
          )}

          {selCand && (
            <div className="bg-background-subtle flex flex-wrap items-center gap-3 rounded-xl p-4">
              <strong className="min-w-0 flex-1 text-lg">{selCand.name}</strong>
              <Button
                size="xl"
                disabled={full}
                onClick={() => {
                  onChange(addPlace(course, selCand));
                  onSelect(null);
                }}
              >
                코스에 넣기
              </Button>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}

/** [−10분] 값 [+10분] */
function Stepper({
  value,
  minus,
  plus,
}: {
  value: string;
  /** text: 단추 글자 (없으면 −10분 / +10분) */
  minus: { label: string; text?: string; disabled: boolean; onClick: () => void };
  plus: { label: string; text?: string; disabled: boolean; onClick: () => void };
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="xl"
        aria-label={minus.label}
        disabled={minus.disabled}
        onClick={minus.onClick}
      >
        {minus.text ?? "−10분"}
      </Button>
      <span className="min-w-16 text-center text-lg font-extrabold tabular-nums">{value}</span>
      <Button
        variant="outline"
        size="xl"
        aria-label={plus.label}
        disabled={plus.disabled}
        onClick={plus.onClick}
      >
        {plus.text ?? "+10분"}
      </Button>
    </div>
  );
}
