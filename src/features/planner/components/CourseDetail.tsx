// S2-1 코스 상세 본문 (F-08 · F-09 · D-06 · D-07). 확정 전에만 쓴다 — 확정한 코스는 자녀 현황(/f)에서 바로 고친다.
// 휴대폰: 헤더 카드 → 지도 → 시간 줄 위 장소 블록 → 아래 고정 확정 버튼 / PC: 왼쪽 지도 고정 · 오른쪽 블록
import { useMemo, type ReactNode } from "react";
import { EmergencyLine, PageBody, StickyActionBar, TopBar } from "@/shared/components/common";
import { MapView } from "@/shared/components/MapView";
import type { Course, Settings, TripInput } from "@/shared/domain/types";
import { hhmm } from "@/shared/lib/date";
import { courseTone } from "@/shared/lib/courseTheme";
import { courseMapPoints } from "@/shared/lib/mapPoints";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
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
}

export function CourseDetail({ course, input, settings, back, cta }: CourseDetailProps) {
  // 지도는 points 가 바뀔 때마다 다시 그리므로 고정한다
  const points = useMemo(
    () => courseMapPoints(course, settings ?? { emergencyRooms: [] }),
    [course, settings],
  );

  const last = course.stops.length - 1;
  return (
    // data-course: 번호 원 · 지도 마커 · 경로 선 · 꼬리표가 코스 테마 색 (확정 버튼은 브랜드 청록 그대로)
    <div className="min-h-dvh" data-course={courseTone(course.theme)}>
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
          className="lg:col-span-6 lg:col-start-6 lg:row-start-1"
        />

        {/* ② 지도: 장소 + 응급실 */}
        <div className="lg:sticky lg:top-20 lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <MapView
            points={points}
            // isolate: 지도 안 요소(네이버 로고 등)의 z-index 가 아래 고정 띠 위로 올라오지 않게
            className="border-border/80 bg-card isolate rounded-2xl shadow-sm"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-6 lg:col-start-6 lg:row-start-2">
          {/* ③ 일정: 왼쪽 시간 줄(번호 · 도착 시각) + 장소 블록. 다음 장소까지 이동은 줄 옆에 */}
          <ol aria-label="코스 일정" className="mt-2 flex flex-col">
            {course.stops.map((s, i) => {
              const next = course.stops[i + 1];
              return (
                <li key={s.place.id} className="flex gap-3">
                  <div className="flex w-11 shrink-0 flex-col items-center">
                    <span
                      aria-hidden="true"
                      className="bg-course text-course-foreground grid size-9 place-items-center rounded-full text-base font-extrabold tabular-nums shadow-sm"
                    >
                      {i + 1}
                    </span>
                    <time className="text-course mt-1.5 text-sm font-bold tabular-nums">
                      {hhmm(s.arriveMin)}
                    </time>
                    {i < last && (
                      <span
                        aria-hidden="true"
                        className="bg-course/20 mt-2 w-0.5 flex-1 rounded-full"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <PlaceBlock
                      place={s.place}
                      stayMin={s.stayMin}
                      transport={input.transport}
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
            <SparePlace place={course.spare} transport={input.transport} className="ml-14" />
          )}

          {/* ⑤ 응급 · 편의 정보 */}
          {(course.er ?? course.pharmacy) && (
            <section className="border-border mt-2 flex flex-col gap-3 border-t pt-5">
              <h3 className="text-lg font-bold tracking-tight">응급·편의 정보</h3>
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
            자료: 한국관광공사 TourAPI · 국립중앙의료원 · 모담 장소 정보
          </p>
        </div>
      </PageBody>
      {/* ⑥ 하단 고정 버튼 */}
      {cta && <StickyActionBar wide>{cta}</StickyActionBar>}
    </div>
  );
}
