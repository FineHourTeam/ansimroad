// S2-1 코스 상세 (확정 전). S2 '자세히 보기'에서 열린다: 주소의 입력값으로 다시 만든 같은 코스 (F-12)
import { Link, useLocation, useParams } from "react-router";
import { paths } from "@/app/paths";
import { LoadingIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Loading, StateMessage } from "@/shared/components/common";
import { useConfirmCourse } from "../hooks/useConfirmCourse";
import { useCourseResult } from "../hooks/useCourseResult";
import { pickCourse } from "../lib/courses";
import { CourseDetail, DetailShell } from "./CourseDetail";

export function ResultDetailPage() {
  const { course: key = "" } = useParams();
  const { search } = useLocation();
  const r = useCourseResult(search);
  const confirmer = useConfirmCourse();
  const back = r.input ? paths.resultWithQuery(search.replace(/^\?/, "")) : paths.home;
  const isCurated = key.startsWith("c-");
  const course = r.result ? pickCourse(r.result, r.curated, key) : null;

  if (
    r.input &&
    (r.placesQ.isPending || r.settingsQ.isPending || (isCurated && r.curatedQ.isPending))
  ) {
    return (
      <DetailShell title="코스 상세" back={back}>
        <Seo title="코스 상세" />
        <Loading text="코스를 불러오고 있어요" />
      </DetailShell>
    );
  }
  const placesFailed = r.placesQ.isError && !r.placesQ.data;
  const curatedFailed = isCurated && r.curatedQ.isError && !r.curatedQ.data;
  if (r.input && (placesFailed || curatedFailed)) {
    return (
      <DetailShell title="코스 상세" back={back}>
        <Seo title="코스 상세" />
        <StateMessage
          title={curatedFailed ? "추천 코스를 불러오지 못했어요" : "장소 정보를 불러오지 못했어요"}
        >
          <p className="text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
          <Button
            size="xl"
            onClick={() => {
              if (placesFailed) void r.placesQ.refetch();
              if (curatedFailed) void r.curatedQ.refetch();
            }}
          >
            다시 시도하기
          </Button>
        </StateMessage>
      </DetailShell>
    );
  }
  if (!r.input || !course) {
    return (
      <DetailShell title="코스 상세" back={back}>
        <Seo title="코스 상세" />
        <StateMessage title="코스를 찾을 수 없어요">
          <p className="text-muted-foreground">조건이 바뀌었거나 주소가 잘못되었을 수 있어요.</p>
          <Button size="xl" asChild>
            <Link to={back}>코스 목록으로</Link>
          </Button>
        </StateMessage>
      </DetailShell>
    );
  }

  const input = r.input;
  const busy = confirmer.busyKey !== null;
  return (
    <>
      <Seo title={`${course.title} 상세`} />
      <CourseDetail
        course={course}
        input={input}
        settings={r.settings ?? null}
        back={back}
        cta={
          <Button
            size="cta"
            className="w-full"
            disabled={busy || !confirmer.ready}
            aria-busy={busy}
            onClick={() => {
              confirmer.confirm(input, course);
            }}
          >
            {busy && <LoadingIcon className="animate-spin motion-reduce:animate-none" />}
            {busy ? "확정하는 중…" : "이 코스로 확정하기"}
          </Button>
        }
      />
    </>
  );
}
