// S3 링크 모아 보기 (/f/{token}/share): 부모님 링크 · 자녀 링크 · 코스 요약 · 인쇄 · 이미지 (F-13 · F-14 · F-15 · F-27)
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { ChevronRightIcon, CopyIcon, InfoIcon, PrintIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { LegalLinks, PageBody, TopBar } from "@/shared/components/common";
import type { TripAccess, TripSnapshot } from "@/shared/domain/types";
import { hhmm, shortDate } from "@/shared/lib/date";
import { ROLE_LABEL } from "@/shared/lib/placeFacts";
import { encodeQuery } from "@/shared/lib/tripInput";
import { useFamilyTrip } from "../hooks/useFamilyTrip";
import { absoluteUrl, copyLink } from "../lib/links";
import { FamilyStateView } from "./FamilyStateView";
import { SeniorShareButtons } from "./SeniorShareButtons";
import { UrlPill } from "./SheetParts";

const CARD = "bg-card text-card-foreground flex flex-col gap-3 rounded-2xl border p-5 shadow-sm";

function StepTitle({ id, n, children }: { id: string; n: number; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-full text-sm">
        {n}
      </span>
      {children}
    </h2>
  );
}

function CourseSummary({ trip, token }: { trip: TripSnapshot; token: string }) {
  const { course, input } = trip;
  return (
    <section aria-label="확정한 코스" className={CARD}>
      <div>
        <p className="text-muted-foreground text-sm font-semibold tabular-nums">
          {shortDate(input.date)} · {hhmm(course.startMin)} ~ {hhmm(course.endMin)}
        </p>
        <p className="text-2xl font-extrabold tracking-tight">{course.title}</p>
      </div>
      <ol className="flex flex-col gap-1.5">
        {course.stops.map((s, i) => (
          <li key={s.place.id} className="flex items-center gap-2.5">
            <span className="bg-accent text-accent-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{s.place.name}</span>
            <span className="text-muted-foreground text-sm">{ROLE_LABEL[s.role]}</span>
          </li>
        ))}
      </ol>
      <Link
        to={paths.familyCourse(token)}
        className="text-primary inline-flex min-h-11 items-center gap-1 self-start font-bold"
      >
        코스 자세히 보기
        <ChevronRightIcon size="sm" />
      </Link>
    </section>
  );
}

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
  const { input } = trip;
  const token = access.token;
  const seniorUrl = access.seniorToken ? absoluteUrl(paths.senior(access.seniorToken)) : null;
  const familyUrl = absoluteUrl(paths.family(token));

  return (
    <div className="flex flex-col gap-4">
      <CourseSummary trip={trip} token={token} />

      {seniorUrl && (
        <section aria-labelledby="share-senior" className={CARD}>
          <StepTitle id="share-senior" n={1}>
            부모님께 보내는 링크
          </StepTitle>
          <p className="text-muted-foreground -mt-1">
            부모님은 이 링크로 일정을 보고 사진을 남겨요.
          </p>
          {/* 복사는 아래 '부모님 링크 복사' 버튼 하나로 (보내기 카드와 같은 모양) */}
          <UrlPill url={seniorUrl} />
          <SeniorShareButtons trip={trip} url={seniorUrl} />
        </section>
      )}

      <section aria-labelledby="share-family" className={CARD}>
        <StepTitle id="share-family" n={seniorUrl ? 2 : 1}>
          자녀용 화면(내 링크)
        </StepTitle>
        <p className="text-muted-foreground -mt-1">이 링크에서 부모님 사진과 현황을 봐요.</p>
        {/* 1단계와 같은 모양: 모래빛 주소 칸 + 복사 버튼 */}
        <UrlPill url={familyUrl} />
        <Button
          variant="outline"
          size="xl"
          onClick={() => void copyLink(familyUrl, "자녀용 링크를 복사했어요")}
        >
          <CopyIcon />
          자녀용 링크 복사
        </Button>
        <Link
          to={paths.family(token)}
          className="text-primary inline-flex min-h-11 items-center gap-1 self-start font-bold"
        >
          내 현황 화면 열기
          <ChevronRightIcon size="sm" />
        </Link>
      </section>

      <section aria-label="알아 두세요" className="flex gap-3 px-1">
        <InfoIcon className="text-primary mt-0.5 shrink-0" />
        <ul className="text-muted-foreground flex flex-col gap-1.5 text-sm leading-relaxed">
          <li>두 링크는 로그인 없이 열려요. 링크가 곧 권한이에요.</li>
          <li>
            여행 당일 부모님 화면에서 ‘사진 남기기’를 누르면{" "}
            {locationOn ? "사진과 위치·시각이" : "사진과 찍은 시각이"} 자녀 화면에 바로 보여요.
          </li>
          <li>링크를 잃어버리면 다시 만들어야 해요. 저장해 두세요.</li>
          <li>사진에 다른 분 얼굴이 크게 나오지 않게 찍어 주세요. 요청하면 지워 드려요.</li>
        </ul>
      </section>

      {printOn && (
        <Button asChild variant="outline" size="xl">
          <Link to={paths.print(token)}>
            <PrintIcon />
            인쇄 · 이미지로 보기
          </Link>
        </Button>
      )}

      <Button asChild variant="link" size="xl" className="self-center">
        <Link to={paths.resultWithQuery(encodeQuery(input))}>다른 코스 다시 고르기</Link>
      </Button>

      <LegalLinks locationOn={locationOn} className="mt-4" />
    </div>
  );
}

export function SharePage() {
  const { token = "" } = useParams();
  const state = useFamilyTrip(token);
  return (
    <div className="text-foreground min-h-dvh">
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
