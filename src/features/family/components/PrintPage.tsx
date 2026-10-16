// S3 인쇄용 보기 (/f/{token}/print, F-15): 확정 코스를 A4 한 장으로 + 휴대폰용 일정표 이미지(저장 · 공유).
// 어르신께 종이 · 사진으로 드릴 때 링크 주소와 QR 을 함께 싣는다.
import { useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/features/trip";
import { PageBody, TopBar } from "@/shared/components/common";
import { useFamilyTrip } from "../hooks/useFamilyTrip";
import { useLightPrint } from "../hooks/useLightPrint";
import { absoluteUrl } from "../lib/links";
import { FamilyStateView } from "./FamilyStateView";
import { ImageCard } from "./ImageCard";
import { PrintActions } from "./PrintActions";
import { PrintSheet } from "./PrintSheet";

export function PrintPage() {
  const { token = "" } = useParams();
  const state = useFamilyTrip(token);
  const reviews = useReviews(state.status === "ready" ? state.trip.tripId : null, false);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useLightPrint();
  // 앱 안에서 왔으면 온 곳으로, 링크로 바로 열었으면 자녀 현황으로
  const back = location.key === "default" ? paths.family(token) : () => void navigate(-1);

  return (
    <>
      <Seo title="인쇄 · 이미지" noindex />
      {/* A4 한 장 · 여백 12mm (이 화면에 있을 때만). 저장 직후 인쇄해도 알림(토스트)이 종이에 찍히지 않게 */}
      <style>
        {
          "@page { size: A4; margin: 12mm; } @media print { [data-sonner-toaster] { display: none !important; } }"
        }
      </style>
      <TopBar title="인쇄 · 이미지" back={back} />
      <PageBody className="flex flex-col gap-4 print:max-w-none print:p-0">
        {state.status === "ready" && reviews.isError && (
          <div
            role="alert"
            className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4 print:hidden"
          >
            <p className="font-bold">후기를 불러오지 못했어요. 후기 없이 인쇄돼요</p>
            <Button variant="outline" size="xl" onClick={() => void reviews.refetch()}>
              다시 불러오기
            </Button>
          </div>
        )}
        {state.status === "ready" ? (
          <PrintSheet trip={state.trip} access={state.access} reviews={reviews.data ?? {}} />
        ) : (
          <FamilyStateView state={state} />
        )}
      </PageBody>
      {state.status === "ready" && (
        <>
          <PrintActions
            trip={state.trip}
            seniorUrl={
              state.access.seniorToken ? absoluteUrl(paths.senior(state.access.seniorToken)) : null
            }
            cardRef={cardRef}
            printReady={!reviews.isPending}
          />
          {/* 이미지로 굽는 카드: 화면 밖에 그려 둔다 (보이지 않고, 읽지 않고, 누를 수 없다) */}
          <div
            aria-hidden="true"
            inert
            className="pointer-events-none fixed top-0 left-full print:hidden"
          >
            <ImageCard ref={cardRef} trip={state.trip} access={state.access} />
          </div>
        </>
      )}
    </>
  );
}
