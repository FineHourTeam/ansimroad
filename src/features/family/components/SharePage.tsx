// S3 링크 모아 보기 (/f/{token}/share): 부모님 링크 · 자녀 링크 · 코스 요약 · 인쇄용 (F-13 · F-14 · F-15 · F-27)
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronRightIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { LegalLinks, PageBody, TopBar } from "@/shared/components/common";
import type { TripAccess, TripSnapshot } from "@/shared/domain/types";
import { shortDate } from "@/shared/lib/date";
import { encodeQuery } from "@/shared/lib/tripInput";
import { useFamilyTrip } from "../hooks/useFamilyTrip";
import { absoluteUrl, displayUrl, routeLine } from "../lib/links";
import { FamilyStateView } from "./FamilyStateView";
import { LinkBox } from "./LinkBox";
import { SeniorShareButtons } from "./SeniorShareButtons";

function ShareBody({
  trip,
  access,
  locationOn,
  printOn,
}: {
  trip: TripSnapshot;
  access: TripAccess;
  locationOn: boolean;
  printOn: boolean;
}) {
  const { course, input } = trip;
  const token = access.token;
  const seniorUrl = access.seniorToken ? absoluteUrl(paths.senior(access.seniorToken)) : null;
  const familyUrl = absoluteUrl(paths.family(token));

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={paths.familyCourse(token)}
        className="border-primary/30 bg-primary/5 hover:border-primary flex flex-col items-center gap-1.5 rounded-xl border px-4 py-4 text-center"
      >
        <span className="text-primary text-xl font-extrabold">
          {course.title} · {shortDate(input.date)}
        </span>
        <span className="text-base">{routeLine(course)}</span>
        <span className="text-primary inline-flex min-h-8 items-center gap-1 text-base font-bold">
          코스 자세히 보기
          <ChevronRightIcon size="sm" />
        </span>
      </Link>

      {seniorUrl && (
        <section aria-labelledby="share-senior" className="flex flex-col gap-2.5">
          <h2 id="share-senior" className="text-lg font-extrabold">
            부모님께 보내는 링크
          </h2>
          {/* 복사는 아래 '부모님 링크 복사' 버튼 하나로 (보내기 카드와 같은 모양) */}
          <p className="bg-background-subtle rounded-lg px-3 py-2 text-base font-semibold break-all">
            {displayUrl(seniorUrl)}
          </p>
          <SeniorShareButtons trip={trip} url={seniorUrl} />
        </section>
      )}

      <section aria-labelledby="share-family" className="flex flex-col gap-2.5">
        <h2 id="share-family" className="text-lg font-extrabold">
          자녀용 화면(내 링크)
        </h2>
        <LinkBox
          url={familyUrl}
          label="자녀용 링크 복사"
          sub="이 링크에서 부모님 사진과 현황을 봐요"
          doneText="자녀용 링크를 복사했어요"
        />
        <Button asChild variant="link" size="xl" className="self-start px-0 font-bold">
          <Link to={paths.family(token)}>
            내 현황 화면 열기
            <ChevronRightIcon size="sm" />
          </Link>
        </Button>
      </section>

      <ul className="bg-background-subtle flex list-disc flex-col gap-1 rounded-lg py-4 pr-4 pl-8 text-sm leading-relaxed">
        <li>두 링크는 로그인 없이 열려요. 링크가 곧 권한이에요.</li>
        <li>
          여행 당일 부모님 화면에서 ‘사진 남기기’를 누르면{" "}
          {locationOn ? "사진과 위치·시각이" : "사진과 찍은 시각이"} 자녀 화면에 바로 보여요.
        </li>
        <li>링크를 잃어버리면 다시 만들어야 해요. 저장해 두세요.</li>
        <li>사진에 다른 분 얼굴이 크게 나오지 않게 찍어 주세요. 요청하면 지워 드려요.</li>
      </ul>

      {printOn && (
        <Button asChild variant="outline" size="xl">
          <Link to={paths.print(token)}>이 코스 인쇄용으로 보기</Link>
        </Button>
      )}

      <Button asChild variant="link" size="xl" className="self-center">
        <Link to={paths.resultWithQuery(encodeQuery(input))}>다른 코스 다시 고르기</Link>
      </Button>

      <LegalLinks locationOn={locationOn} />
    </div>
  );
}

export function SharePage() {
  const { token = "" } = useParams();
  const state = useFamilyTrip(token);
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <Seo title="링크 모아 보기" noindex />
      <TopBar title="링크 모아 보기" back={paths.family(token)} />
      <PageBody className="max-w-2xl">
        {state.status === "ready" ? (
          <ShareBody
            trip={state.trip}
            access={state.access}
            locationOn={state.settings.locationCollectionEnabled}
            printOn={state.settings.printViewEnabled}
          />
        ) : (
          <FamilyStateView state={state} />
        )}
      </PageBody>
    </div>
  );
}
