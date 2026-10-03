// 리포트 본문 (여행 앨범): 히어로(사진 · 날짜 · 코스) → 요약(숫자 3개 + 공유) → 장소별 사진 · 공개 후기 → 공유 → '내 여행 만들기'
import type { ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Seo } from "@/components/Seo";
import { CameraIcon, CopyIcon, ShareIcon, StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LegalLinks, PageBody } from "@/shared/components/common";
import type { PhotoRecord, PlaceReview, ReportSnapshot } from "@/shared/domain/types";
import { photosBySlot } from "@/shared/engine/timeline";
import { track } from "@/shared/lib/analytics";
import { isValidYmd, koreanMonthDay } from "@/shared/lib/date";
import { canWebShare, copyText, shareLink } from "@/shared/lib/share";
import { averageRating, heroPhoto } from "../report";
import { ReportHero } from "./ReportHero";
import { ReportStop } from "./ReportStop";

export function ReportView({
  token,
  trip,
  photos,
  reviews,
  locationOn,
  expiryDays,
}: {
  token: string;
  trip: ReportSnapshot;
  photos: PhotoRecord[];
  reviews: Record<string, PlaceReview>;
  locationOn: boolean;
  expiryDays: number;
}) {
  const { course, date } = trip;
  const groups = photosBySlot(course, photos, locationOn);
  const avg = averageRating(reviews);
  const head = `${koreanMonthDay(date)} ${course.title}`;

  const share = async () => {
    track("report_share");
    const url = `${window.location.origin}${paths.report(token)}`;
    if (canWebShare()) {
      const r = await shareLink({
        title: `${head} · 여행 리포트`,
        text: `부모님과 다녀온 목포 하루 — ${head}`,
        url,
      });
      if (r !== "failed") return;
    }
    if (await copyText(url)) toast.success("리포트 링크를 복사했어요");
    else toast.error("복사하지 못했어요. 다시 눌러 주세요");
  };
  const shareButton = <ShareButton onShare={share} />;

  return (
    <>
      <Seo
        title={`${head} 여행 리포트`}
        description={`부모님과 다녀온 목포 하루 — 장소 ${String(course.stops.length)}곳 · 사진 ${String(photos.length)}장`}
        noindex
      />
      <ReportHero date={date} title={course.title} photo={heroPhoto(course, groups, reviews)} />

      {/* PC(sm 이상)에서는 요약 카드를 히어로와 같은 너비로 — 히어로의 둥근 아래 모서리가 카드 뒤로 숨는다 */}
      <PageBody className="flex max-w-xl flex-col gap-4 pt-0 sm:px-0">
        <Card className="relative z-10 -mt-10">
          <CardContent className="flex flex-col gap-5">
            <ul className="divide-border grid grid-cols-3 divide-x text-center">
              <Stat label="다녀온 장소" unit="곳">
                {course.stops.length}
              </Stat>
              <Stat label="남긴 사진" unit="장">
                {photos.length}
              </Stat>
              <Stat label="장소 별점">
                {avg === null ? (
                  "—"
                ) : (
                  <>
                    <StarIcon className="text-highlight mr-0.5 size-5 self-center fill-current" />
                    {avg.toFixed(1)}
                  </>
                )}
              </Stat>
            </ul>
            {shareButton}
          </CardContent>
        </Card>

        {photos.length === 0 && (
          <div className="border-input flex flex-col items-center gap-2 rounded-2xl border border-dashed px-5 py-6 text-center">
            <span className="bg-accent text-primary grid size-12 place-items-center rounded-full">
              <CameraIcon />
            </span>
            <p className="font-bold">아직 남긴 사진이 없어요</p>
            <p className="text-muted-foreground text-sm">
              부모님이 여행 화면에서 사진을 찍으면 이곳에 모여요.
            </p>
          </div>
        )}

        <ol className="mt-2 flex flex-col gap-4">
          {course.stops.map((s, i) => (
            <ReportStop
              key={s.place.id}
              index={i}
              stop={s}
              review={reviews[s.place.id]}
              photos={groups[i] ?? []}
            />
          ))}
        </ol>

        <section className="mt-4 flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-bold tracking-tight">이 하루를 가족과 함께 나눠요</p>
          {shareButton}
        </section>

        {/* 바이럴: 받은 사람이 바로 시작하는 통로 */}
        <section className="bg-card text-card-foreground from-accent to-card border-primary/20 mt-6 flex flex-col items-center gap-3 rounded-2xl border bg-linear-to-b px-5 py-7 text-center shadow-sm">
          <BrandLogo height={36} />
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-balance">
            우리 부모님 목포 여행도 만들어 보세요
          </h2>
          <p className="text-muted-foreground text-pretty">
            걷기 · 계단 · 화장실까지 모담팀이 직접 확인한 장소로 1분 만에 코스를 만들어요.
          </p>
          <Button asChild size="cta" className="mt-2 w-full">
            <Link to={`${paths.home}?utm_source=report&utm_medium=share`}>
              안심로드로 코스 만들기
            </Link>
          </Button>
        </section>

        <p className="text-muted-foreground mt-2 text-center text-sm">
          {isValidYmd(trip.expiresOn)
            ? `이 리포트와 사진은 ${koreanMonthDay(trip.expiresOn)}까지 볼 수 있어요.`
            : `사진은 여행일로부터 ${String(expiryDays)}일 동안만 보여요.`}
        </p>
        <LegalLinks locationOn={locationOn} className="mt-4" />
      </PageBody>
    </>
  );
}

/** 공유 시트가 있으면 카카오톡(공유 시트), 없으면 링크 복사 — 위 요약과 맨 아래에 같은 버튼을 둔다 */
function ShareButton({ onShare }: { onShare: () => Promise<void> }) {
  const webShare = canWebShare();
  return (
    <Button
      variant={webShare ? "kakao" : "outline"}
      size="xl"
      className="w-full"
      onClick={() => {
        void onShare();
      }}
    >
      {webShare ? <ShareIcon /> : <CopyIcon />}
      {webShare ? "카카오톡으로 공유하기" : "리포트 링크 복사하기"}
    </Button>
  );
}

function Stat({ label, unit, children }: { label: string; unit?: string; children: ReactNode }) {
  return (
    <li className="flex flex-col items-center gap-1 px-1">
      {/* 값 칸 높이를 고정해 별 아이콘이 있어도 세 이름표가 한 줄에 맞는다 */}
      <strong className="flex h-8 items-baseline justify-center gap-0.5 text-2xl leading-8 font-extrabold tracking-tight tabular-nums">
        {children}
        {unit && <span className="text-base font-bold">{unit}</span>}
      </strong>
      <span className="text-muted-foreground text-sm">{label}</span>
    </li>
  );
}
