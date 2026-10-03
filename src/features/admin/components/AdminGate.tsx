// 운영진 가드 본체 (app/protected-route 가 지연 로딩한다 — 운영진 코드를 첫 화면 번들에 넣지 않으려고)
import { Navigate, Outlet, useLocation } from "react-router";
import { useAdminState } from "../hooks/useAdmin";
import { AdminForbidden } from "./AdminForbidden";
import { paths } from "@/app/paths";
import { Loading } from "@/shared/components/common";

export function AdminGate() {
  const state = useAdminState();
  const location = useLocation();

  if (state.status === "loading") return <Loading text="운영진인지 확인하고 있어요" />;
  if (state.status === "guest") {
    // 원래 가려던 곳을 기억해 로그인 후 복귀
    return <Navigate to={paths.login} state={{ from: location.pathname }} replace />;
  }
  if (state.status === "forbidden") return <AdminForbidden email={state.email} />;
  return <Outlet />;
}
