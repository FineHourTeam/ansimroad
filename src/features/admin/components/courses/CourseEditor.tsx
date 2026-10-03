// 코스 편집 칸: 이름 · 소개 → 지도에서 장소 고르기 → 예상 시간표 → 장소 순서 · 내용 → 공개 · 저장
import { useMemo, useState } from "react";
import { CourseActions } from "./CourseActions";
import { CourseMap } from "./CourseMap";
import { MAX_STOPS } from "./draft";
import { StopList } from "./StopList";
import { usePlaceData } from "@/features/places";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CuratedCourse, CuratedStop } from "@/shared/domain/types";
import { curatedToCourse } from "@/shared/lib/curated";
import { hhmm } from "@/shared/lib/date";

export function CourseEditor({
  draft,
  dirty,
  saved,
  saving,
  deleting,
  uploading,
  onEdit,
  onBusy,
  onSave,
  onDelete,
}: {
  draft: CuratedCourse;
  dirty: boolean;
  saved: CuratedCourse | undefined;
  saving: boolean;
  deleting: boolean;
  uploading: boolean;
  /** 최신 코스를 받아 고친다 (사진을 올리는 동안 다른 칸을 고쳐도 덮어쓰지 않게) */
  onEdit: (fn: (c: CuratedCourse) => CuratedCourse) => void;
  /** 사진 올리기 시작(+1) · 끝(-1) */
  onBusy: (delta: 1 | -1) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const placeData = usePlaceData();
  const places = useMemo(() => placeData.data?.places ?? [], [placeData.data]);
  const preview = useMemo(
    () => (draft.stops.length > 0 ? curatedToCourse(draft, places) : null),
    [draft, places],
  );
  const editStops = (fn: (stops: CuratedStop[]) => CuratedStop[]) => {
    onEdit((c) => {
      const stops = fn(c.stops);
      return stops === c.stops ? c : { ...c, stops };
    });
  };

  return (
    <section aria-label="코스 편집" className="flex min-w-0 flex-col gap-4 lg:col-span-3">
      <div className="bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="course-title">코스 이름</Label>
          <Input
            id="course-title"
            className="text-lg font-bold"
            placeholder="예: 목포 바다 한 바퀴"
            maxLength={30}
            value={draft.title}
            onChange={(e) => {
              const title = e.target.value;
              onEdit((c) => ({ ...c, title }));
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="course-summary">한 줄 소개</Label>
          <Input
            id="course-summary"
            placeholder="예: 계단 없이 바다를 가까이 보는 코스"
            maxLength={60}
            value={draft.summary}
            onChange={(e) => {
              const summary = e.target.value;
              onEdit((c) => ({ ...c, summary }));
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          회색 + 점을 누르면 등록된 장소가 들어가요 · 지도 빈 곳을 누르면 새 위치를 넣어요 · 번호
          점을 누르면 그 장소를 펼쳐요 · 장소는 {MAX_STOPS}곳까지 넣을 수 있어요
        </p>
        <CourseMap
          stops={draft.stops}
          selectedId={openId}
          onSelectStop={setOpenId}
          onAdd={(stop) => {
            editStops((stops) => [...stops, stop]);
            setOpenId(stop.id);
          }}
        />
      </div>

      {preview && (
        <section
          aria-label="예상 시간표"
          className="border-primary/30 bg-background flex flex-col gap-1 rounded-lg border p-3 text-sm"
        >
          <p className="font-bold">
            예상 시간표 {hhmm(preview.startMin)} ~ {hhmm(preview.endMin)}
          </p>
          <ol className="flex flex-wrap gap-x-2 gap-y-1">
            {preview.stops.map((s, i) => (
              <li key={draft.stops[i]?.id ?? s.place.id}>
                <span className="text-primary font-semibold">{hhmm(s.arriveMin)}</span>{" "}
                {s.place.name}
                {i < preview.stops.length - 1 && <span aria-hidden="true"> →</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {draft.stops.some((s) => s.placeId) && (
        <p className="text-muted-foreground text-sm">
          등록된 장소는 접근성 정보와 응급실을 장소 데이터에서 가져와요
        </p>
      )}
      <StopList
        stops={draft.stops}
        courseId={draft.id}
        openId={openId}
        onToggle={(id) => {
          setOpenId((cur) => (cur === id ? null : id));
        }}
        onChange={editStops}
        onBusy={onBusy}
      />

      <CourseActions
        draft={draft}
        dirty={dirty}
        saved={saved}
        saving={saving}
        deleting={deleting}
        uploading={uploading}
        onPublish={(published) => {
          onEdit((c) => ({ ...c, published }));
        }}
        onSave={onSave}
        onDelete={onDelete}
      />
    </section>
  );
}
