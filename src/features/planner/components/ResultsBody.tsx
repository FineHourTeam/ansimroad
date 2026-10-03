// S2 본문: 코스 카드 · 모담팀 추천 코스 · 다른 코스 보기 / 결과 부족 안내
import type { ReactNode } from "react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { MapPinIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Course, TripInput } from "@/shared/domain/types";
import { encodeQuery } from "@/shared/lib/tripInput";
import { CourseCard } from "./CourseCard";

/** 카드 수에 맞춘 칸: 2장이면 가운데 2칸, 4장(목포 대표 코스 포함)이면 PC 한 줄 4칸 */
function gridClass(count: number): string {
  return cn(
    "grid gap-4 sm:grid-cols-2 sm:gap-5",
    count === 2 && "lg:mx-auto lg:max-w-3xl",
    count === 3 && "lg:grid-cols-3 lg:gap-6",
    count >= 4 && "lg:grid-cols-4",
  );
}

export interface ConfirmState {
  busyKey: string | null;
  failedKey: string | null;
  ready: boolean;
  confirm: (course: Course) => void;
}

export function CourseCards({
  courses,
  query,
  curated = false,
  state,
}: {
  courses: Course[];
  query: string;
  curated?: boolean;
  state: ConfirmState;
}) {
  return (
    <div className={gridClass(courses.length)}>
      {courses.map((c) => (
        <CourseCard
          key={c.key}
          course={c}
          curated={curated}
          detailHref={paths.resultDetailOf(c.key, query)}
          confirm={state.busyKey === c.key ? "busy" : state.failedKey === c.key ? "failed" : "idle"}
          disabled={!state.ready || state.busyKey !== null}
          onConfirm={() => {
            state.confirm(c);
          }}
        />
      ))}
    </div>
  );
}

/** ⑦ 코스 1개 이하: 카드 대신 안내 + 팀 문의 (억지로 채우지 않음). 다른 코스 보기로 다 쓴 경우는 따로 안내 */
export function ShortageCard({
  input,
  again,
  contactEmail,
}: {
  input: TripInput;
  /** 다른 코스 보기로 장소를 뺀 뒤라면 처음 코스로 돌아갈 수 있다 */
  again: boolean;
  contactEmail: string;
}) {
  return (
    <Card className="mx-auto mt-4 max-w-xl items-center gap-4 px-5 pt-8 pb-5 text-center">
      <span className="bg-background-subtle text-primary grid size-14 place-items-center rounded-full">
        <MapPinIcon size="lg" />
      </span>
      <h2 className="text-xl leading-snug font-extrabold text-balance">
        {again
          ? "이 조건으로 만들 수 있는 코스는 모두 보여 드렸어요"
          : "조건에 맞는 확인된 장소가 아직 부족해요"}
      </h2>
      <p className="text-muted-foreground text-base">
        {again
          ? "처음 코스로 돌아가거나 조건을 바꿔 보세요."
          : "조건을 바꿔 보거나 팀에 알려 주세요."}
      </p>
      <div className="flex w-full flex-col gap-2">
        {again && (
          <Button size="xl" className="w-full" asChild>
            <Link to={paths.resultWithQuery(encodeQuery(input))}>처음 코스로 돌아가기</Link>
          </Button>
        )}
        {contactEmail && (
          <Button variant={again ? "outline" : "default"} size="xl" className="w-full" asChild>
            <a href={`mailto:${contactEmail}`}>팀에 문의하기</a>
          </Button>
        )}
      </div>
    </Card>
  );
}

/** 모담팀 추천 코스 (관리자 페이지에서 만들어 공개한 코스) */
export function CuratedSection({
  isError,
  onRetry,
  children,
}: {
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="curated-title" className="mt-8 flex flex-col gap-3">
      <div>
        <h2 id="curated-title" className="text-xl font-extrabold">
          모담팀 추천 코스
        </h2>
        <p className="text-muted-foreground text-sm">
          운영진이 직접 짠 코스예요. 이동 조건은 장소마다 정보를 확인해 주세요.
        </p>
      </div>
      {isError ? (
        <div className="flex flex-wrap items-center gap-2 text-base">
          <p>추천 코스를 불러오지 못했어요.</p>
          <Button variant="outline" size="xl" onClick={onRetry}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
