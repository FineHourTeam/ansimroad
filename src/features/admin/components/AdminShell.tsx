// 운영진 페이지 공통 틀: 상단 바(추천 코스 · 장소 데이터 탭 + 로그아웃). PC 화면 기준.
import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAdminSignOut } from "../hooks/useAdmin";
import { paths } from "@/app/paths";
import { LogoutIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { to: paths.admin, label: "추천 코스 만들기" },
  { to: paths.adminPlaces, label: "장소 데이터" },
] as const;

export function AdminShell({
  title,
  actions,
  confirmLeave = false,
  children,
}: {
  title: string;
  actions?: ReactNode;
  /** 저장하지 않은 편집이 있으면 로그아웃 전에 한 번 묻는다 */
  confirmLeave?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const signOut = useAdminSignOut();
  const [asking, setAsking] = useState(false);
  const logout = () => {
    signOut.mutate(undefined, {
      onSuccess: () => void navigate(paths.login, { replace: true }),
    });
  };
  return (
    <div className="bg-background-subtle min-h-dvh">
      <Seo title={`${title} · 운영진`} noindex />
      <header className="bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <span className="text-primary font-bold">안심로드 운영진</span>
          <nav aria-label="운영진 메뉴" className="flex gap-1">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-semibold",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={signOut.isPending}
            onClick={() => {
              if (confirmLeave) setAsking(true);
              else logout();
            }}
          >
            <LogoutIcon size="sm" />
            로그아웃
          </Button>
          <AlertDialog open={asking} onOpenChange={setAsking}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>저장하지 않은 내용이 있어요</AlertDialogTitle>
                <AlertDialogDescription>
                  지금 로그아웃하면 고친 내용이 사라져요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>닫기</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={logout}>
                  버리고 로그아웃하기
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
