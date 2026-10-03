// 자녀 링크 화면의 로딩 · 오류 · 열 수 없는 링크 안내 (S5 · S3 · 인쇄용 공통)
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { Button } from "@/components/ui/button";
import { Loading, StateMessage } from "@/shared/components/common";
import type { FamilyTripState } from "../hooks/useFamilyTrip";

export function FamilyStateView({
  state,
}: {
  state: Exclude<FamilyTripState, { status: "ready" }>;
}) {
  if (state.status === "loading") return <Loading text="여행 정보를 불러오는 중이에요" />;
  if (state.status === "error") {
    return (
      <StateMessage title="여행 정보를 불러오지 못했어요">
        <p className="text-muted-foreground">인터넷 연결을 확인하고 다시 불러와 주세요.</p>
        <Button size="xl" onClick={state.retry}>
          다시 불러오기
        </Button>
      </StateMessage>
    );
  }
  if (state.reason === "expired") {
    return (
      <StateMessage title="기간이 지난 여행이에요">
        <p className="text-muted-foreground">
          링크는 여행일로부터 {state.expiryDays}일 동안만 열려요.
        </p>
        <Button asChild variant="outline" size="xl">
          <Link to={paths.home}>새 여행 계획하기</Link>
        </Button>
      </StateMessage>
    );
  }
  // not_found · wrong_role(어르신용 /t 토큰) 모두 같은 안내 — 토큰 종류를 드러내지 않는다
  return (
    <StateMessage title="링크를 다시 확인해 주세요">
      <p className="text-muted-foreground">이 화면은 확정 때 받은 ‘자녀용 링크’로만 열려요.</p>
      <Button asChild variant="outline" size="xl">
        <Link to={paths.home}>새 여행 계획하기</Link>
      </Button>
    </StateMessage>
  );
}
