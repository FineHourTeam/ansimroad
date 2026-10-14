// S2-1 코스 상세 본문 (F-08 · F-09 · D-06 · D-07). 확정 전(S2-1)과 확정 후(/f/:token/course) 모두 이 화면을 쓴다.
// 휴대폰: 헤더 카드 → 지도 → 시간 줄 위 장소 블록 → 아래 고정 확정 버튼 / PC: 왼쪽 지도 고정 · 오른쪽 블록
import { useMemo, useState, type ReactNode } from "react";
import { EmergencyLine, PageBody, StickyActionBar, TopBar } from "@/shared/components/common";
import { MapView, type MapPoint } from "@/shared/components/MapView";
import type { Course, Place, Settings, TripInput } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { courseMapPoints } from "@/shared/lib/mapPoints";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
import { CourseEditor, type CandidatesStatus } from "./CourseEditor";
import { CourseHeader } from "./CourseHeader";
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
    <div className="min-h-dvh">
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

  const last = course.stops.length - 1;
  return (
    <div className="min-h-dvh">
      {/* 코스 이름은 아래 제목(h2)에 있어 위 막대는 화면 이름만 */}
      <TopBar title="코스 상세" back={back} />
      <PageBody
        wide
        surface="plain"
        className="flex flex-col gap-4 lg:grid lg:grid-cols-11 lg:items-start lg:gap-x-8"
      >
        {/* ① 코스 헤더 */}
        <CourseHeader
          course={course}
          date={input.date}
          readOnly={readOnly}
          edit={
            edit && {
              editing,
              onChange: edit.onChange,
              onToggle: () => {
                setEditing(!editing);
                setSelId(null);
              },
            }
          }
          className="lg:col-span-6 lg:col-start-6 lg:row-start-1"
        />

        {/* ② 지도: 장소 + 응급실 (수정 중에는 넣을 수 있는 장소도 회색 점으로) */}
        <div className="lg:sticky lg:top-20 lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <MapView
            points={points}
            selectedId={selId}
            // isolate: 지도 안 요소(네이버 로고 등)의 z-index 가 아래 고정 띠 위로 올라오지 않게
            className="border-border/80 bg-card isolate rounded-2xl shadow-sm"
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

          {/* ③ 일정: 왼쪽 시간 줄(번호 · 도착 시각) + 장소 블록. 다음 장소까지 이동은 줄 옆에 */}
          <ol aria-label="코스 일정" className="mt-2 flex flex-col">
            {course.stops.map((s, i) => {
              const next = course.stops[i + 1];
              return (
                <li key={s.place.id} className="flex gap-3">
                  <div className="flex w-11 shrink-0 flex-col items-center">
                    <span
                      aria-hidden="true"
                      className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full text-base font-extrabold tabular-nums shadow-sm"
                    >
                      {i + 1}
                    </span>
                    <time className="text-primary mt-1.5 text-sm font-bold tabular-nums">
                      {hhmm(s.arriveMin)}
                    </time>
                    {i < last && (
                      <span
                        aria-hidden="true"
                        className="bg-primary/20 mt-2 w-0.5 flex-1 rounded-full"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <PlaceBlock
                      place={s.place}
                      stayMin={s.stayMin}
                      readOnly={readOnly}
                      tag={ROLE_LABEL[s.role]}
                    />
                    {next ? (
                      <p className="text-muted-foreground border-border/70 mt-4 flex min-h-12 flex-wrap items-center gap-x-3 border-t py-2 text-sm font-medium">
                        {next.travelMin > 0 && <span>차로 약 {next.travelMin}분</span>}
                        {next.waitMin > 0 && <span>점심 전 여유 {next.waitMin}분</span>}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {/* ④ 시간 남으면 들를 곳 (접힘) — 시간 줄 오른쪽 칸에 맞춘다 */}
          {course.spare && (
            <SparePlace place={course.spare} readOnly={readOnly} className="ml-14" />
          )}

          {/* ⑤ 안전 정보 */}
          {(course.er ?? course.pharmacy) && (
            <section className="border-border mt-2 flex flex-col gap-3 border-t pt-5">
              <h3 className="text-lg font-bold tracking-tight">안전 정보</h3>
              <EmergencyLine er={course.er} prefix="최근접 응급실" />
              {course.pharmacy && (
                <p className="text-base">
                  <span className="text-muted-foreground mr-1.5 text-sm">최근접 약국</span>
                  <strong className="font-semibold">{course.pharmacy}</strong>
                </p>
              )}
            </section>
          )}

          {/* D-07 출처 */}
          <p className="text-muted-foreground text-center text-sm">
            자료: 한국관광공사 TourAPI · 국립중앙의료원 · 모담 현장·전화 확인
          </p>
        </div>
      </PageBody>
      {/* ⑥ 하단 고정 버튼 */}
      {cta && <StickyActionBar wide>{cta}</StickyActionBar>}
    </div>
  );
}
