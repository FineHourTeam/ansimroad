// 모든 라우트는 이 파일 한 곳에 (rules.md § 라우팅). 화면은 기능 단위로 나눠 불러온다 (코드 스플리팅).
import { lazy, Suspense, useEffect } from "react";
import { createBrowserRouter, Outlet, useLocation } from "react-router";
import { Loading } from "@/shared/components/common";
import { trackPageView } from "@/shared/lib/analytics";
import { paths } from "./paths";
import { ProtectedRoute } from "./protected-route";

const HomePage = lazy(() => import("@/features/planner").then((m) => ({ default: m.HomePage })));
const ResultsPage = lazy(() =>
  import("@/features/planner").then((m) => ({ default: m.ResultsPage })),
);
const ResultDetailPage = lazy(() =>
  import("@/features/planner").then((m) => ({ default: m.ResultDetailPage })),
);
const FamilyPage = lazy(() => import("@/features/family").then((m) => ({ default: m.FamilyPage })));
const FamilyCoursePage = lazy(() =>
  import("@/features/planner").then((m) => ({ default: m.FamilyCoursePage })),
);
const SharePage = lazy(() => import("@/features/family").then((m) => ({ default: m.SharePage })));
const PrintPage = lazy(() => import("@/features/family").then((m) => ({ default: m.PrintPage })));
const MemoriesPage = lazy(() =>
  import("@/features/family").then((m) => ({ default: m.MemoriesPage })),
);
const SeniorPage = lazy(() => import("@/features/senior").then((m) => ({ default: m.SeniorPage })));
const ReportPage = lazy(() => import("@/features/report").then((m) => ({ default: m.ReportPage })));
const AdminLoginPage = lazy(() =>
  import("@/features/admin").then((m) => ({ default: m.AdminLoginPage })),
);
const AdminCoursesPage = lazy(() =>
  import("@/features/admin").then((m) => ({ default: m.AdminCoursesPage })),
);
const AdminPlacesPage = lazy(() =>
  import("@/features/admin").then((m) => ({ default: m.AdminPlacesPage })),
);
const LegalPage = lazy(() => import("@/features/legal").then((m) => ({ default: m.LegalPage })));
const NotFoundPage = lazy(() =>
  import("@/features/legal").then((m) => ({ default: m.NotFoundPage })),
);
const ErrorPage = lazy(() => import("@/features/legal").then((m) => ({ default: m.ErrorPage })));

/** 공통 레이아웃: 화면이 바뀌면 맨 위로 + 통계(토큰은 지운 주소) */
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // 제목이 화면에서 바뀐 뒤에 보내도록 한 박자 늦춘다
    const id = window.setTimeout(trackPageView, 0);
    return () => {
      window.clearTimeout(id);
    };
  }, [pathname]);
  return (
    <Suspense fallback={<Loading />}>
      <Outlet />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <RouteEffects />,
    errorElement: (
      <Suspense fallback={<Loading />}>
        <ErrorPage />
      </Suspense>
    ),
    children: [
      { path: paths.home, element: <HomePage /> },
      { path: paths.result, element: <ResultsPage /> },
      { path: paths.resultDetail, element: <ResultDetailPage /> },
      { path: paths.familyPattern, element: <FamilyPage /> },
      { path: paths.familyCoursePattern, element: <FamilyCoursePage /> },
      { path: paths.sharePattern, element: <SharePage /> },
      { path: paths.printPattern, element: <PrintPage /> },
      { path: paths.memoriesPattern, element: <MemoriesPage /> },
      { path: paths.seniorPattern, element: <SeniorPage /> },
      { path: paths.reportPattern, element: <ReportPage /> },
      { path: paths.privacy, element: <LegalPage doc="privacy" /> },
      { path: paths.locationTerms, element: <LegalPage doc="location-terms" /> },
      { path: paths.login, element: <AdminLoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: paths.admin, element: <AdminCoursesPage /> },
          { path: paths.adminPlaces, element: <AdminPlacesPage /> },
        ],
      },
      { path: paths.notFound, element: <NotFoundPage /> },
    ],
  },
]);
