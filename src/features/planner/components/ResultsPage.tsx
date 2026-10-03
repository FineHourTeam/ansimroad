// S2 코스 3개 제안 (F-04~F-07 · F-11 · F-12 · F-26 · N-12).
// 결과는 주소(입력값 + 제외 목록)만으로 다시 만든다 → 같은 주소면 같은 카드.
import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading, PageBody, StateMessage, TopBar } from "@/shared/components/common";
import { track } from "@/shared/lib/analytics";
import { inputSummary } from "@/shared/lib/format";
import { encodeQuery } from "@/shared/lib/tripInput";
import { useConfirmCourse } from "../hooks/useConfirmCourse";
import { useCourseResult } from "../hooks/useCourseResult";
import { CourseCards, CuratedSection, ShortageCard, type ConfirmState } from "./ResultsBody";

// '코스 생성' 통계는 S1에서 온 화면 한 번만 (StrictMode 이중 실행 방지)
const tracked = new Set<string>();

export function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const r = useCourseResult(location.search);
  const { input, excluded, result, settings } = r;
  const confirmer = useConfirmCourse();
  const fromS1 = (location.state as { fromS1?: boolean } | null)?.fromS1 === true;

  useEffect(() => {
    if (!result || !fromS1 || tracked.has(location.key)) return;
    tracked.add(location.key);
    track("course_generate");
    // 새로고침·뒤로 가기로 다시 세지 않도록 표시를 지운다
    void navigate(location.pathname + location.search, { replace: true, state: null });
  }, [result, fromS1, location.key, location.pathname, location.search, navigate]);

  if (!input) {
    return (
      <div className="bg-background min-h-dvh">
        <Seo title="코스 제안" />
        <TopBar title="코스 제안" back={paths.home} />
        <PageBody>
          <StateMessage title="여행 조건을 다시 골라 주세요">
            <p className="text-muted-foreground">주소에 담긴 조건이 빠졌거나 잘못되었어요.</p>
            <Button size="xl" asChild>
              <Link to={paths.home}>조건 고르기</Link>
            </Button>
          </StateMessage>
        </PageBody>
      </div>
    );
  }

  const query = encodeQuery(input, excluded);
  const back = `${paths.home}?${encodeQuery(input)}`; // S1이 입력값을 그대로 보여 주도록
  const state: ConfirmState = {
    ...confirmer,
    confirm: (course) => {
      confirmer.confirm(input, course);
    },
  };

  let body: ReactNode;
  // 백그라운드 재요청이 실패해도 이미 받은 데이터가 있으면 그대로 보여 준다
  const curatedFailed = r.curatedQ.isError && !r.curatedQ.data;
  // 운영진 추천 코스는 조건과 무관해서, 조건에 맞는 코스가 모자라도 보여 준다
  const curatedBlock = (r.curated.length > 0 || curatedFailed) && (
    <CuratedSection
      isError={curatedFailed}
      onRetry={() => {
        void r.curatedQ.refetch();
      }}
    >
      <CourseCards courses={r.curated} query={query} curated state={state} />
    </CuratedSection>
  );
  if (r.placesQ.isError && !r.placesQ.data) {
    body = (
      <StateMessage title="장소 정보를 불러오지 못했어요">
        <p className="text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
        {settings?.contactEmail && (
          <p className="text-muted-foreground">
            팀 문의{" "}
            <a className="underline underline-offset-4" href={`mailto:${settings.contactEmail}`}>
              {settings.contactEmail}
            </a>
          </p>
        )}
        <Button
          size="xl"
          onClick={() => {
            void r.placesQ.refetch();
          }}
        >
          다시 시도하기
        </Button>
      </StateMessage>
    );
  } else if (!result || !settings) {
    body = <Loading text="코스를 만들고 있어요" />;
  } else if (result.shortage) {
    body = (
      <>
        <ShortageCard
          input={input}
          again={excluded.length > 0}
          contactEmail={settings.contactEmail}
        />
        {curatedBlock}
      </>
    );
  } else {
    // ③ 순서 고정: 바다 → 역사·문화 → 자연·경치 (→ 목포 대표 코스, 있을 때만 맨 뒤)
    const cards = [...result.courses, ...(result.representative ? [result.representative] : [])];
    body = (
      <>
        <CourseCards courses={cards} query={query} state={state} />
        {curatedBlock}
        {/* ⑨ 방금 보여 준 장소를 빼고 같은 룰로 다시 (무작위 없음, 제외 목록은 주소에) */}
        {settings.otherCoursesEnabled && (
          <Button
            variant="outline"
            size="cta"
            className="mx-auto mt-6 flex w-full max-w-sm"
            onClick={() => {
              track("course_regenerate");
              confirmer.reset(); // 코스 키(sea 등)가 같아 이전 카드의 '다시 시도하기'가 남지 않도록
              void navigate(
                paths.resultWithQuery(encodeQuery(input, [...excluded, ...result.shownIds])),
              );
              window.scrollTo(0, 0);
            }}
          >
            다른 코스 보기
          </Button>
        )}
      </>
    );
  }

  return (
    <div className="bg-background min-h-dvh">
      <Seo title="코스 제안" />
      <TopBar title="이런 코스는 어떠세요?" back={back} />
      <PageBody wide className="flex flex-col gap-4">
        {/* ② 입력 요약 줄: 누르면 S1 (입력값 유지) */}
        <Link
          to={back}
          className="hover:border-primary flex min-h-12 items-center gap-3 rounded-lg border px-4 py-2 text-base font-semibold sm:mx-auto sm:w-fit"
        >
          <span className="min-w-0 flex-1">{inputSummary(input)}</span>
          <Badge>수정</Badge>
        </Link>
        <div>{body}</div>
      </PageBody>
    </div>
  );
}
