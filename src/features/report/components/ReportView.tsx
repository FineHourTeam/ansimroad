// 리포트 본문: 히어로(날짜 · 코스 · 숫자 3개) → 장소별 사진 · 공개 후기 → 공유 → '내 여행 만들기' 안내
import type { ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { CopyIcon, ShareIcon, StarIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { LegalLinks, PageBody } from "@/shared/components/common";
import type { PhotoRecord, PlaceReview, ReportSnapshot } from "@/shared/domain/types";
import { photosBySlot } from "@/shared/engine/timeline";
import { track } from "@/shared/lib/analytics";
import { isValidYmd, koreanMonthDay } from "@/shared/lib/date";
import { canWebShare, copyText, shareLink } from "@/shared/lib/share";
import { averageRating } from "../report";
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
  const webShare = canWebShare();

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

  return (
    <div className="bg-background min-h-svh">
      <Seo
        title={`${head} 여행 리포트`}
        description={`부모님과 다녀온 목포 하루 — 장소 ${String(course.stops.length)}곳 · 사진 ${String(photos.length)}장`}
        noindex
      />
      <header className="bg-background-subtle border-b">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-1 px-4 pt-8 pb-6 text-center">
          <p className="text-primary text-sm font-bold">안심로드 여행 리포트</p>
          <h1 className="mt-1 text-2xl leading-snug font-bold text-balance">{head}</h1>
          <p className="text-muted-foreground">부모님과 함께한 목포 하루</p>
          <ul className="mt-5 grid w-full grid-cols-3 gap-2">
            <Stat label="다녀온 장소">{course.stops.length}곳</Stat>
            <Stat label="남긴 사진">{photos.length}장</Stat>
            <Stat label="장소 별점">
              {avg === null ? (
                "—"
              ) : (
                <span className="inline-flex items-center gap-1">
                  <StarIcon size="sm" className="fill-current" />
                  {avg.toFixed(1)}
                </span>
              )}
            </Stat>
          </ul>
        </div>
      </header>

      <PageBody className="flex max-w-xl flex-col gap-4 pt-5">
        {photos.length === 0 && (
          <div className="bg-background-subtle rounded-lg p-4 text-center">
            <p className="font-semibold">아직 남긴 사진이 없어요</p>
            <p className="text-muted-foreground text-sm">
              부모님이 여행 화면에서 사진을 찍으면 이곳에 모여요.
            </p>
          </div>
        )}

        <ol className="flex flex-col gap-4">
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

        <Button
          variant={webShare ? "kakao" : "outline"}
          size="xl"
          className="mt-2 w-full"
          onClick={() => {
            void share();
          }}
        >
          {webShare ? <ShareIcon /> : <CopyIcon />}
          {webShare ? "카카오톡으로 공유하기" : "리포트 링크 복사하기"}
        </Button>

        {/* 바이럴: 받은 사람이 바로 시작하는 통로 */}
        <section className="border-primary flex flex-col gap-2 rounded-xl border-2 p-5 text-center">
          <h2 className="text-lg font-bold text-balance">우리 부모님 목포 여행도 만들어 보세요</h2>
          <p className="text-muted-foreground text-pretty">
            걷기 · 계단 · 화장실까지 모담팀이 직접 확인한 장소로 1분 만에 코스를 만들어요.
          </p>
          <Button asChild size="xl" className="mt-2 w-full">
            <Link to={`${paths.home}?utm_source=report&utm_medium=share`}>
              안심로드로 코스 만들기
            </Link>
          </Button>
        </section>

        <p className="text-muted-foreground text-center text-sm">
          {isValidYmd(trip.expiresOn)
            ? `이 리포트와 사진은 ${koreanMonthDay(trip.expiresOn)}까지 볼 수 있어요.`
            : `사진은 여행일로부터 ${String(expiryDays)}일 동안만 보여요.`}
        </p>
        <LegalLinks locationOn={locationOn} />
      </PageBody>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="bg-card text-card-foreground flex flex-col gap-0.5 rounded-xl border px-1 py-3">
      <strong className="text-primary text-xl">{children}</strong>
      <span className="text-muted-foreground text-xs">{label}</span>
    </li>
  );
}
