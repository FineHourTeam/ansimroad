// 확정 직후 자녀가 할 일: 부모님께 링크 보내기. 여행 전에는 크게, 당일부터는 바로가기 줄만 남긴다.
// 여행을 마치면 맨 위에 리포트 링크가 뜬다.
import { Link } from "react-router";
import { paths } from "@/app/paths";
import { ChevronRightIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { TripSnapshot } from "@/shared/domain/types";
import { absoluteUrl, displayUrl } from "../lib/links";
import { SeniorShareButtons } from "./SeniorShareButtons";

export function ReportCard({ reportToken }: { reportToken: string }) {
  return (
    <Link
      to={paths.report(reportToken)}
      className="bg-primary text-primary-foreground flex min-h-16 items-center justify-between gap-3 rounded-xl px-5 py-4"
    >
      <span className="flex flex-col gap-0.5">
        <strong className="text-lg">여행 리포트가 만들어졌어요</strong>
        <span className="text-sm font-semibold">가족 · 친구에게 공유해 보세요</span>
      </span>
      <ChevronRightIcon />
    </Link>
  );
}

/** 코스 보기·수정 · 링크 모아 보기 · 인쇄용 바로가기 */
export function FamilyLinks({ token, printOn }: { token: string; printOn: boolean }) {
  const links = [
    { to: paths.familyCourse(token), label: "코스 보기·수정" },
    { to: paths.share(token), label: "링크 모아 보기" },
    ...(printOn ? [{ to: paths.print(token), label: "인쇄용" }] : []),
  ];
  return (
    <nav aria-label="코스 바로가기" className="flex flex-wrap gap-2">
      {links.map((l) => (
        <Button key={l.to} asChild variant="outline" size="xl" className="flex-1">
          <Link to={l.to}>{l.label}</Link>
        </Button>
      ))}
    </nav>
  );
}

export function SendCard({
  trip,
  seniorToken,
  token,
  printOn,
}: {
  trip: TripSnapshot;
  seniorToken: string;
  token: string;
  printOn: boolean;
}) {
  const url = absoluteUrl(paths.senior(seniorToken));
  return (
    <section
      aria-labelledby="family-send-title"
      className="border-primary bg-card text-card-foreground flex flex-col gap-3 rounded-xl border-2 p-4"
    >
      <h2 id="family-send-title" className="text-lg font-bold">
        부모님께 링크를 보내 주세요
      </h2>
      <p className="text-muted-foreground">
        부모님은 이 링크 하나로 일정을 보고 사진만 찍으시면 돼요.
      </p>
      <p className="bg-background-subtle rounded-lg px-3 py-2 text-base font-semibold break-all">
        {displayUrl(url)}
      </p>
      <SeniorShareButtons trip={trip} url={url} />
      <FamilyLinks token={token} printOn={printOn} />
    </section>
  );
}
