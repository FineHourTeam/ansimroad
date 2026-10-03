// 코스 편집 칸: 이름 · 소개 → 지도에서 장소 고르기 → 예상 시간표 → 장소 순서 · 내용 → 공개 · 저장
import { useMemo, useState } from "react";
import { CourseActions } from "./CourseActions";
import { CourseMap } from "./CourseMap";
import { MAX_STOPS } from "./draft";
import { StopList } from "./StopList";
import { usePlaceData } from "@/features/places";
import { ChevronRightIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <section aria-label="코스 편집" className="flex min-w-0 flex-col gap-5 lg:col-span-3">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>코스 정보</h2>
          </CardTitle>
          <CardDescription>
            사용자 화면의 &apos;모담팀 추천 코스&apos;에 이대로 나와요
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="course-title" className="font-semibold">
              코스 이름
            </Label>
            <Input
              id="course-title"
              className="h-11 text-base font-bold md:text-base"
              placeholder="예: 목포 바다 한 바퀴"
              maxLength={30}
              value={draft.title}
              onChange={(e) => {
                const title = e.target.value;
                onEdit((c) => ({ ...c, title }));
              }}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="course-summary" className="font-semibold">
              한 줄 소개
            </Label>
            <Input
              id="course-summary"
              className="h-11 text-base md:text-base"
              placeholder="예: 계단 없이 바다를 가까이 보는 코스"
              maxLength={60}
              value={draft.summary}
              onChange={(e) => {
                const summary = e.target.value;
                onEdit((c) => ({ ...c, summary }));
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>지도에서 장소 고르기</h2>
          </CardTitle>
          <CardDescription>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              <li>
                <strong className="text-foreground font-semibold">회색 + 점</strong> 등록된 장소
                넣기
              </li>
              <li>
                <strong className="text-foreground font-semibold">빈 곳</strong> 새 위치 넣기
              </li>
              <li>
                <strong className="text-foreground font-semibold">번호 점</strong> 그 장소 펼치기
              </li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseMap
            stops={draft.stops}
            selectedId={openId}
            onSelectStop={setOpenId}
            onAdd={(stop) => {
              editStops((stops) => [...stops, stop]);
              setOpenId(stop.id);
            }}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h2 className="text-lg font-bold tracking-tight">
            코스 순서{" "}
            <span className="text-muted-foreground text-base font-semibold tabular-nums">
              {draft.stops.length} / {MAX_STOPS}곳
            </span>
          </h2>
          {draft.stops.some((s) => s.placeId) && (
            <p className="text-muted-foreground text-sm">
              등록된 장소는 접근성 정보와 응급실을 장소 데이터에서 가져와요
            </p>
          )}
        </div>

        {preview && (
          <section
            aria-label="예상 시간표"
            className="bg-accent/60 text-accent-foreground flex flex-col gap-2 rounded-2xl px-4 py-3"
          >
            <p className="flex items-center gap-2 text-sm font-bold">
              예상 시간표{" "}
              <Badge variant="default" className="tabular-nums">
                {hhmm(preview.startMin)} ~ {hhmm(preview.endMin)}
              </Badge>
            </p>
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
              {preview.stops.map((s, i) => (
                <li key={draft.stops[i]?.id ?? s.place.id} className="flex items-center gap-1">
                  <span className="bg-card text-card-foreground rounded-full border px-3 py-1">
                    <span className="text-primary font-bold tabular-nums">{hhmm(s.arriveMin)}</span>{" "}
                    {s.place.name}
                  </span>
                  {i < preview.stops.length - 1 && <ChevronRightIcon size="sm" />}
                </li>
              ))}
            </ol>
          </section>
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
      </div>

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
