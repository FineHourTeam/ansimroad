// 확정 후 코스 수정 (지도 기반): 출발 시각 옮기기 · 장소 고르기(칩 · 지도 마커) · 머무는 시간 · 빼기 · 다른 장소 넣기
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-base">
        <span className="font-bold">출발 {hhmm(course.startMin)}</span>
        {/* shiftStart 는 07:00 ~ 16:00 사이로만 옮긴다 */}
        <Button
          variant="outline"
          size="xl"
          aria-label="−10분 출발 앞당기기"
          disabled={course.startMin <= 7 * 60}
          onClick={() => {
            onChange(shiftStart(course, -10));
          }}
        >
          −10분
        </Button>
        <Button
          variant="outline"
          size="xl"
          aria-label="+10분 출발 늦추기"
          disabled={course.startMin >= 16 * 60}
          onClick={() => {
            onChange(shiftStart(course, 10));
          }}
        >
          +10분
        </Button>
      </div>

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
          <ToggleGroupItem key={st.place.id} value={st.place.id} className="rounded-full px-4">
            {i + 1} {st.place.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {sel && (
        <Card size="sm" className="gap-3 px-4">
          <strong className="text-lg">
            {selIndex + 1}. {sel.place.name}
          </strong>
          <div className="flex flex-wrap items-center gap-2 text-base">
            <span>머무는 시간 {sel.stayMin}분</span>
            <Button
              variant="outline"
              size="xl"
              aria-label="−10분 머무는 시간 줄이기"
              disabled={sel.stayMin <= 10}
              onClick={() => {
                onChange(changeStay(course, selIndex, -10));
              }}
            >
              −10분
            </Button>
            <Button
              variant="outline"
              size="xl"
              aria-label="+10분 머무는 시간 늘리기"
              disabled={sel.stayMin >= 180}
              onClick={() => {
                onChange(changeStay(course, selIndex, 10));
              }}
            >
              +10분
            </Button>
            <Button
              variant="destructive"
              size="xl"
              disabled={course.stops.length <= 1}
              onClick={() => {
                onChange(removeStop(course, selIndex));
                onSelect(null);
              }}
            >
              코스에서 빼기
            </Button>
          </div>
        </Card>
      )}
      {candidatesStatus?.pending ? (
        <Skeleton className="h-12 w-full" />
      ) : candidatesStatus?.onRetry ? (
        <div className="flex flex-wrap items-center gap-2 text-base">
          <p>장소 목록을 불러오지 못했어요</p>
          <Button variant="outline" size="xl" onClick={candidatesStatus.onRetry}>
            다시 불러오기
          </Button>
        </div>
      ) : full ? (
        <p className="text-muted-foreground text-sm">{MAX_STOPS_MESSAGE}</p>
      ) : candidates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-place" className="text-base">
            다른 장소 넣기
          </Label>
          <Select
            value={selCand ? selCand.id : ""}
            onValueChange={(v) => {
              onSelect(v);
            }}
          >
            <SelectTrigger id="add-place" className="w-full text-base data-[size=default]:h-12">
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
        <Card size="sm" className="gap-3 px-4">
          <strong className="text-lg">{selCand.name}</strong>
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
        </Card>
      )}
    </div>
  );
}
