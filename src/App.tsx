import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";

// 배포 확인용 첫 화면 — 기존 시제품(_legacy/silverroad-web) 화면을 옮겨 오면서 라우터로 바꾼다.
export default function App() {
  const { t } = useTranslation();
  return (
    <>
      <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-primary text-sm font-semibold">{t("brand.preparing")}</p>
        <h1 className="text-4xl font-bold tracking-tight">{t("brand.name")}</h1>
        <p className="text-lg">{t("brand.tagline")}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{t("brand.trust")}</p>
      </main>
      <Toaster />
    </>
  );
}
