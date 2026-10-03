// S3 인쇄용 보기 (/f/{token}/print, F-15): 확정 코스를 A4 한 장으로. 어르신께 종이로 드릴 때 두 링크 주소를 함께 싣는다.
import { Link, useParams } from "react-router";
import { paths } from "@/app/paths";
import { PrintIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useReviews } from "@/features/trip";
import { useFamilyTrip } from "../hooks/useFamilyTrip";
import { FamilyStateView } from "./FamilyStateView";
import { PrintSheet } from "./PrintSheet";

export function PrintPage() {
  const { token = "" } = useParams();
  const state = useFamilyTrip(token);
  const reviews = useReviews(state.status === "ready" ? state.trip.tripId : null, false);
  return (
    <div className="bg-background-subtle text-foreground print:bg-background min-h-dvh">
      <Seo title="인쇄용 코스" noindex />
      {/* A4 한 장 (이 화면에 있을 때만) */}
      <style>{"@page { size: A4; margin: 12mm; }"}</style>
      <div className="bg-background/95 sticky top-0 z-20 border-b backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl justify-between gap-2 px-4 py-2">
          <Button asChild variant="outline" size="xl">
            <Link to={paths.share(token)}>돌아가기</Link>
          </Button>
          {state.status === "ready" && (
            <Button
              size="xl"
              disabled={reviews.isPending}
              onClick={() => {
                window.print();
              }}
            >
              <PrintIcon />
              인쇄하기
            </Button>
          )}
        </div>
      </div>
      <main className="py-4 sm:px-4 sm:py-6 print:p-0">
        {state.status === "ready" && reviews.isError && (
          <div
            role="alert"
            className="mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 print:hidden"
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
          <div className="bg-background mx-auto max-w-3xl">
            <FamilyStateView state={state} />
          </div>
        )}
      </main>
    </div>
  );
}
