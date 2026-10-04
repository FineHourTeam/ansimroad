// S5 자녀 현황 타임라인 (/f/{token}) — 자녀용 링크가 곧 권한
import { useParams } from "react-router";
import { Seo } from "@/components/Seo";
import { PageBody, TopBar } from "@/shared/components/common";
import { useFamilyTrip } from "../hooks/useFamilyTrip";
import { FamilyDashboard } from "./FamilyDashboard";
import { FamilyStateView } from "./FamilyStateView";

export function FamilyPage() {
  const { token = "" } = useParams();
  const state = useFamilyTrip(token);
  return (
    <div className="text-foreground min-h-dvh">
      <Seo title="부모님 여행 현황" noindex />
      <TopBar title="부모님 여행 현황" brand />
      <PageBody>
        {state.status === "ready" ? (
          <FamilyDashboard trip={state.trip} access={state.access} settings={state.settings} />
        ) : (
          <FamilyStateView state={state} />
        )}
      </PageBody>
    </div>
  );
}
