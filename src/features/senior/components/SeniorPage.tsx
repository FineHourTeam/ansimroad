// S4 어르신 여행 화면 (/t/{token}).
// 처음 열면 ⓪ 동의 화면(F-28) → 본 화면(①~⑤). 자녀가 코스를 고치면 새로 고치지 않아도 바로 바뀐다 (실시간 구독).
import { useState } from "react";
import { useParams } from "react-router";
import { keepDaysOf, tripTitle } from "../seniorView";
import { ConsentScreen } from "./ConsentScreen";
import { SeniorMain } from "./SeniorMain";
import { SeniorLoading, SeniorMessage } from "./SeniorMessage";
import { DEFAULT_SETTINGS, useSettings } from "@/features/places";
import { useTrip, useTripAccess } from "@/features/trip";
import type { ConsentChoice } from "@/shared/domain/types";
import { getConsent, setConsent } from "@/shared/lib/consent";

const LINK_PROBLEM = {
  not_found: {
    title: "링크를 다시 확인해 주세요",
    sub: "자녀에게 받은 링크를 그대로 눌러 열어 주세요",
  },
  wrong_role: {
    title: "어르신용 링크가 아니에요",
    sub: "자녀에게 어르신용 링크를 다시 받아 주세요",
  },
  expired: {
    title: "기간이 지난 여행이에요",
    sub: "보관 기간이 지나 더 볼 수 없어요",
  },
} as const;

const OFFLINE = "연결을 확인한 뒤 다시 열어 주세요";

export function SeniorPage() {
  const { token = "" } = useParams();
  // 다른 링크로 바뀌면 동의 상태부터 새로 읽는다
  return <SeniorScreen key={token} token={token} />;
}

function SeniorScreen({ token }: { token: string }) {
  const access = useTripAccess(token, "senior");
  const tripId = access.data?.ok ? access.data.access.tripId : null;
  const trip = useTrip(tripId);
  const settings = useSettings();
  // 이번 방문에 고른 동의 (기기에 저장하지 못해도 이번 방문 동안은 유지)
  const [chosen, setChosen] = useState<Partial<Record<string, ConsentChoice>>>({});

  if (access.isPending) return <SeniorLoading />;
  if (access.isError) {
    return (
      <SeniorMessage
        title={OFFLINE}
        onRetry={() => {
          void access.refetch();
        }}
      />
    );
  }
  if (!access.data.ok) return <SeniorMessage {...LINK_PROBLEM[access.data.reason]} />;
  if (trip.isPending || settings.isPending) return <SeniorLoading />;
  if (trip.isError) {
    return (
      <SeniorMessage
        title={OFFLINE}
        onRetry={() => {
          void trip.refetch();
        }}
      />
    );
  }
  if (!trip.data) return <SeniorMessage {...LINK_PROBLEM.not_found} />;

  // 설정 파일을 못 읽어도 기본값(위치 OFF)으로 동작한다
  const cfg = settings.data ?? DEFAULT_SETTINGS;
  const locationOn = cfg.locationCollectionEnabled;
  const title = tripTitle(trip.data);
  // 동의는 안내 문구별로 받는다: 위치 수집이 나중에 켜지면 위치 안내로 한 번 더 묻는다
  // (위치 없는 안내에 동의한 것으로 위치를 모으지 않게)
  const consentKey = locationOn ? `${token}.loc` : token;
  const consent = chosen[consentKey] ?? getConsent(consentKey);

  if (!consent) {
    return (
      <ConsentScreen
        trip={trip.data}
        keepDays={keepDaysOf(trip.data, cfg.tripExpiryDays)}
        locationOn={locationOn}
        onChoose={(c) => {
          setConsent(consentKey, c);
          setChosen((prev) => ({ ...prev, [consentKey]: c }));
          window.scrollTo(0, 0);
        }}
      />
    );
  }
  return (
    <SeniorMain
      trip={trip.data}
      title={title}
      consent={consent}
      locationOn={locationOn}
      photoMaxPx={cfg.photoMaxPx}
    />
  );
}
