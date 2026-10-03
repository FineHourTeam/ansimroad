// S2-1 코스 상세 본문 (F-08 · F-09 · D-06 · D-07). 확정 전(S2-1)과 확정 후(/f/:token/course) 모두 이 화면을 쓴다.
// 휴대폰: 헤더 → 지도 → 장소 블록 / PC: 왼쪽 지도 고정 · 오른쪽 블록
import { useMemo, useState, type ReactNode } from "react";
import { EditIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmergencyLine, PageBody, TopBar } from "@/shared/components/common";
import { MapView, type MapPoint } from "@/shared/components/MapView";
import type { Course, Place, Settings, TripInput } from "@/shared/domain/types";
import { renameCourse } from "@/shared/lib/courseEdit";
import { hhmm, shortDate } from "@/shared/lib/date";
import { courseMapPoints } from "@/shared/lib/mapPoints";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
import { CourseEditor, type CandidatesStatus } from "./CourseEditor";
import { PlaceBlock, SparePlace } from "./PlaceBlock";

/** 상세 화면 틀 (불러오는 중 · 오류 · 못 찾음 안내용) */
export function DetailShell({
  title,
  back,
  children,
}: {
  title: string;
  back: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background min-h-dvh">
      <TopBar title={title} back={back} />
      <PageBody>{children}</PageBody>
    </div>
  );
}

export interface CourseDetailProps {
  course: Course;
  input: TripInput;
  settings: Pick<Settings, "emergencyRooms"> | null;
  back: string;
  /** 하단 고정 버튼 (이 코스로 확정하기) */
  cta?: ReactNode;
  /** 확정한 코스 (확정 버튼 없음 · 메모는 읽기만) */
  readOnly?: boolean;
  /** 확정 후 수정: 지도에서 장소를 눌러 빼기 · 시간 조정 · 넣기 */
  edit?: {
    candidates: Place[];
    onChange: (next: Course) => void;
    /** 넣을 장소 목록을 불러오는 중 · 실패(onRetry 있음) */
    candidatesStatus?: CandidatesStatus;
  };
}

export function CourseDetail({
  course,
  input,
  settings,
  back,
  cta,
  readOnly = false,
  edit,
}: CourseDetailProps) {
  const [editing, setEditing] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const editor = editing ? edit : undefined; // 수정 중일 때만 있는 값

  const allPlaces = edit?.candidates;
  const showCands = !!editor;

  const candidates = useMemo(() => {
    if (!allPlaces) return [];
    const inCourse = new Set([
      ...course.stops.map((s) => s.place.id),
      ...(course.spare ? [course.spare.id] : []),
    ]);
    return allPlaces.filter((p) => !inCourse.has(p.id));
  }, [course, allPlaces]);

  // 지도는 points 가 바뀔 때마다 다시 그리므로 고정한다
  const points = useMemo(() => {
    const pts = courseMapPoints(course, settings ?? { emergencyRooms: [] });
    if (!showCands) return pts;
    const cands: MapPoint[] = candidates.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      name: p.name,
      label: "+",
      kind: "cand",
      id: p.id,
    }));
    return [...pts, ...cands];
  }, [course, settings, showCands, candidates]);

  return (
    <div className="bg-background min-h-dvh">
      {/* 코스 이름은 아래 제목(h2)에 있어 위 막대는 화면 이름만 */}
      <TopBar title="코스 상세" back={back} />
      <PageBody
        wide
        className="flex flex-col gap-4 lg:grid lg:grid-cols-11 lg:items-start lg:gap-x-8"
      >
        {/* ① 코스 헤더 */}
        <header className="flex flex-col gap-2 lg:col-span-6 lg:col-start-6 lg:row-start-1">
          <div className="flex flex-wrap items-center gap-2">
            {editor ? (
              <div className="flex w-full max-w-sm flex-col gap-1.5">
                <Label htmlFor="course-title" className="text-base">
                  코스 이름
                </Label>
                <Input
                  key={course.title}
                  id="course-title"
                  defaultValue={course.title}
                  maxLength={30}
                  className="h-12 text-xl font-extrabold"
                  onBlur={(e) => {
                    const next = renameCourse(course, e.target.value);
                    if (next !== course) editor.onChange(next);
                    else e.target.value = course.title;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              </div>
            ) : (
              <h2 className="text-primary text-2xl leading-snug font-extrabold text-balance">
                {course.title}
              </h2>
            )}
            {readOnly && (
              <Badge variant="outline" className="border-success text-success">
                확정한 코스
              </Badge>
            )}
          </div>
          {edit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={editor ? "default" : "outline"}
                size="xl"
                onClick={() => {
                  setEditing(!editing);
                  setSelId(null);
                }}
              >
                <EditIcon size="sm" />
                {editor ? "수정 끝내기" : "코스 수정"}
              </Button>
              {editor && (
                <p className="text-muted-foreground text-sm">
                  장소를 골라 시간을 고치거나 빼요. 지도의 회색 점이나 ‘다른 장소 넣기’로 새 장소를
                  넣어요
                </p>
              )}
            </div>
          )}
          <p className="text-muted-foreground flex flex-wrap gap-x-2 text-base font-semibold">
            <span>{shortDate(input.date)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
            </span>
            <span aria-hidden="true">·</span>
            <span>총 걷는 시간 약 {course.totalWalkMin}분</span>
          </p>
        </header>

        {/* ② 지도: 장소 + 응급실 (수정 중에는 넣을 수 있는 장소도 회색 점으로) */}
        <div className="lg:sticky lg:top-20 lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <MapView
            points={points}
            selectedId={selId}
            onSelect={
              editor
                ? (p) => {
                    if (p.kind !== "er") setSelId(p.id ?? null);
                  }
                : undefined
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-6 lg:col-start-6 lg:row-start-2">
          {editor && (
            <CourseEditor
              course={course}
              candidates={candidates}
              candidatesStatus={editor.candidatesStatus}
              selId={selId}
              onSelect={setSelId}
              onChange={editor.onChange}
            />
          )}

          {/* ③ 장소 블록 */}
          <ol className="flex flex-col">
            {course.stops.map((s, i) => (
              <li key={s.place.id}>
                {i > 0 && (
                  <p className="text-muted-foreground ml-4 flex min-h-6 flex-wrap gap-x-3 border-l-2 border-dashed py-2 pl-5 text-sm">
                    {s.travelMin > 0 && <span>차로 약 {s.travelMin}분</span>}
                    {s.waitMin > 0 && <span>점심 전 여유 {s.waitMin}분</span>}
                  </p>
                )}
                <PlaceBlock
                  place={s.place}
                  stayMin={s.stayMin}
                  readOnly={readOnly}
                  head={
                    <>
                      <span
                        aria-hidden="true"
                        className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full text-base font-extrabold"
                      >
                        {i + 1}
                      </span>
                      <span className="text-primary flex shrink-0 items-center gap-2 font-extrabold tabular-nums">
                        <time>{hhmm(s.arriveMin)}</time>
                        <Badge variant="secondary">{ROLE_LABEL[s.role]}</Badge>
                      </span>
                    </>
                  }
                />
              </li>
            ))}
          </ol>

          {/* ④ 시간 남으면 들를 곳 (접힘) */}
          {course.spare && <SparePlace place={course.spare} readOnly={readOnly} />}

          {/* ⑤ 안전 정보 */}
          {(course.er ?? course.pharmacy) && (
            <Card className="gap-3 px-4">
              <h3 className="text-lg font-extrabold">안전 정보</h3>
              <EmergencyLine er={course.er} prefix="최근접 응급실" className="text-base" />
              {course.pharmacy && (
                <p className="text-base font-semibold">
                  <span className="text-muted-foreground mr-1.5 font-bold">최근접 약국</span>
                  {course.pharmacy}
                </p>
              )}
            </Card>
          )}

          {/* D-07 출처 */}
          <p className="text-muted-foreground text-center text-sm">
            자료: 한국관광공사 TourAPI · 국립중앙의료원 · 모담 현장·전화 확인
          </p>

          {/* ⑥ 하단 고정 버튼 */}
          {cta && (
            <div className="bg-background/95 sticky bottom-0 z-20 -mx-4 border-t px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-t-0 lg:px-0">
              {cta}
            </div>
          )}
        </div>
      </PageBody>
    </div>
  );
}
