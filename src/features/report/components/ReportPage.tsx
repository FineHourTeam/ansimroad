// S6 여행 리포트 (/r/{token}): '여행 완료' 뒤 자녀가 공유하는 읽기 전용 페이지.
// 받은 사람이 맨 아래 '코스 만들기'로 들어오는 바이럴 통로다. 나만 보기 후기는 담지 않는다 (보안 규칙도 공개 후기만 허용).
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS, useSettings } from "@/features/places";
import { usePhotos, useReportTrip, useReviews, useTripAccess } from "@/features/trip";
import { LegalLinks, Loading, PageBody, StateMessage } from "@/shared/components/common";
import { ReportView } from "./ReportView";

export function ReportPage() {
  const { token = "" } = useParams();
  const settingsQuery = useSettings();
  const settings = settingsQuery.data ?? DEFAULT_SETTINGS;
  const access = useTripAccess(token, "report");
  const tripId = access.data?.ok ? access.data.access.tripId : null;
  const trip = useReportTrip(tripId);
  const photos = usePhotos(tripId);
  const reviews = useReviews(tripId, true);
  const locationOn = settings.locationCollectionEnabled;

  if (access.isPending || settingsQuery.isPending) return <LoadingPage />;
  if (access.isError) {
    return (
      <LoadError
        locationOn={locationOn}
        busy={access.isFetching}
        onRetry={() => {
          void access.refetch();
        }}
      />
    );
  }
  if (!access.data.ok) {
    const { reason } = access.data;
    return (
      <StateShell locationOn={locationOn}>
        {reason === "expired" ? (
          <Guide title="보관 기간이 지난 리포트예요">
            리포트와 사진은 여행일로부터 {settings.tripExpiryDays}일 동안만 볼 수 있어요.
          </Guide>
        ) : reason === "wrong_role" ? (
          <Guide title="리포트 링크가 아니에요">
            여행 리포트는 ‘여행 완료’ 뒤 받은 리포트 링크로만 열려요.
          </Guide>
        ) : (
          <NotFound />
        )}
      </StateShell>
    );
  }

  if (trip.isPending || photos.isPending || reviews.isPending) return <LoadingPage />;
  if (trip.isError || photos.isError || reviews.isError) {
    return (
      <LoadError
        locationOn={locationOn}
        busy={trip.isFetching || photos.isFetching || reviews.isFetching}
        onRetry={() => {
          void trip.refetch();
          void photos.refetch();
          void reviews.refetch();
        }}
      />
    );
  }
  if (!trip.data) {
    return (
      <StateShell locationOn={locationOn}>
        <NotFound />
      </StateShell>
    );
  }
  return (
    <ReportView
      token={token}
      trip={trip.data}
      photos={photos.data}
      reviews={reviews.data}
      locationOn={locationOn}
      expiryDays={settings.tripExpiryDays}
    />
  );
}

/** 불러오는 동안에도 리포트와 같은 모래빛 바탕 */
function LoadingPage() {
  return (
    <PageBody>
      <Loading />
    </PageBody>
  );
}

function StateShell({ locationOn, children }: { locationOn: boolean; children: ReactNode }) {
  return (
    <>
      <Seo title="여행 리포트" noindex />
      {/* 길 잃은 화면 위쪽의 로고 (누르면 첫 화면) — 404 화면과 같은 머리 */}
      <header className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <Link to={paths.home} className="inline-flex min-h-11 items-center">
          <BrandLogo height={28} />
        </Link>
      </header>
      <PageBody>
        {children}
        <LegalLinks locationOn={locationOn} />
      </PageBody>
    </>
  );
}

function Guide({ title, children }: { title: string; children: ReactNode }) {
  return (
    <StateMessage title={title}>
      <p className="text-muted-foreground text-balance">{children}</p>
      <Button asChild size="xl" className="mt-2 px-6">
        <Link to={paths.home}>안심로드 둘러보기</Link>
      </Button>
    </StateMessage>
  );
}

function NotFound() {
  return <Guide title="리포트를 찾을 수 없어요">링크가 잘못되었거나 보관 기간이 지났어요.</Guide>;
}

function LoadError({
  locationOn,
  busy,
  onRetry,
}: {
  locationOn: boolean;
  /** 다시 불러오는 중이면 버튼을 잠그고 진행 문구를 보여 준다 (오류 상태는 성공할 때까지 그대로라서) */
  busy: boolean;
  onRetry: () => void;
}) {
  return (
    <StateShell locationOn={locationOn}>
      <StateMessage title="리포트를 불러오지 못했어요">
        <p className="text-muted-foreground text-balance">
          인터넷 연결을 확인하고 다시 불러와 주세요.
        </p>
        <Button size="xl" className="mt-2 px-6" disabled={busy} onClick={onRetry}>
          {busy ? "불러오는 중이에요" : "다시 불러오기"}
        </Button>
      </StateMessage>
    </StateShell>
  );
}
