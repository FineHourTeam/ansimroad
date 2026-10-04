// 운영진 가드 단일 지점 — 화면별 if-navigate 금지 (rules.md § 라우팅).
// 판정(이메일 로그인 + admins/{uid})은 features/admin 의 AdminGate 가 소유하고, 여기서는 지연 로딩만 한다.
import { lazy, Suspense } from "react";
import { Loading } from "@/shared/components/common";

const AdminGate = lazy(() => import("@/features/admin").then((m) => ({ default: m.AdminGate })));

export function ProtectedRoute() {
  return (
    <Suspense fallback={<Loading text="운영진인지 확인하고 있어요" />}>
      <AdminGate />
    </Suspense>
  );
}
