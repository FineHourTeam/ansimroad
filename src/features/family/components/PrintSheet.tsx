// 인쇄용 한 장 (A4): 코스 · 시각 · 장소 정보 · 메모 · 공개 후기 · 안전 정보 · 두 링크 주소와 QR
import { Fragment } from "react";
import { erDisplayName } from "@/shared/lib/format";
import { QRCodeSVG } from "qrcode.react";
import { StarIcon } from "@/components/icons";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Place, PlaceReview, TripAccess, TripSnapshot } from "@/shared/domain/types";
import { hhmm, longDate } from "@/shared/lib/date";
import { placeFacts, ROLE_LABEL } from "@/shared/lib/placeFacts";
import { paths } from "@/app/paths";
import { absoluteUrl, displayUrl } from "../lib/links";

/** 좁은 화면에서도 전화번호가 '061-' 에서 끊기지 않게 */
const Phone = ({ n }: { n: string }) => <span className="whitespace-nowrap">{n}</span>;

function PlaceLines({
  num,
  place,
  stayMin,
  travel,
  review,
  memo,
}: {
  num?: number;
  place: Place;
  stayMin: number | null;
  travel?: string | null;
  review?: PlaceReview;
  memo?: string;
}) {
  const facts = placeFacts(place);
  const phones = place.phones.length > 0 && (
    <>
      전화{" "}
      {place.phones.map((ph, i) => (
        <Fragment key={ph}>
          {i > 0 && " / "}
          <Phone n={ph} />
        </Fragment>
      ))}
    </>
  );
  const line = [stayMin !== null && `머무는 시간 ${String(stayMin)}분`, phones, travel].filter(
    Boolean,
  );
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <p className="flex items-center gap-2 text-lg font-extrabold print:text-base">
        {num !== undefined && (
          <span className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-full text-sm">
            {num}
          </span>
        )}
        {place.name}
      </p>
      {line.length > 0 && (
        <p className="text-base print:text-sm">
          {line.map((x, i) => (
            // 순서가 고정된 세 칸(머무는 시간 · 전화 · 이동)이라 순번을 키로 쓴다
            <Fragment key={i}>
              {i > 0 && " · "}
              {x}
            </Fragment>
          ))}
        </p>
      )}
      {facts.length > 0 && (
        <p className="text-sm">{facts.map((f) => `${f.label} ${f.value}`).join(" · ")}</p>
      )}
      {memo && <p className="text-sm font-semibold">메모: {memo}</p>}
      {review && !review.priv && (
        <p className="flex flex-wrap items-center gap-1 text-sm font-semibold">
          <span className="text-primary flex" aria-hidden="true">
            {[1, 2, 3, 4, 5].slice(0, review.rating).map((n) => (
              <StarIcon key={n} size="sm" fill="currentColor" />
            ))}
          </span>
          <span className="sr-only">별점 {review.rating}점</span>
          {review.text}
        </p>
      )}
    </div>
  );
}

/** 링크 한 장: 휴대폰 카메라로 찍으면 바로 열리는 QR + 주소 */
function LinkCard({ title, desc, url }: { title: string; desc: string; url: string }) {
  return (
    <figure className="border-primary/30 m-0 flex break-inside-avoid flex-row items-center gap-3 rounded-lg border-2 p-3 print:p-2">
      <QRCodeSVG
        value={url}
        size={120}
        marginSize={1}
        title={`${title} 링크 QR 코드`}
        className="shrink-0"
      />
      <figcaption className="flex min-w-0 flex-col gap-1">
        <strong className="text-lg print:text-base">{title}</strong>
        <span className="text-sm">{desc}</span>
        <span className="text-base font-bold break-all print:text-sm">{displayUrl(url)}</span>
      </figcaption>
    </figure>
  );
}

export function PrintSheet({
  trip,
  access,
  reviews,
}: {
  trip: TripSnapshot;
  access: TripAccess;
  reviews: Record<string, PlaceReview>;
}) {
  const { course, input } = trip;
  return (
    <article className="bg-background text-foreground mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5 leading-normal [-webkit-print-color-adjust:exact] [print-color-adjust:exact] sm:rounded-md sm:px-9 sm:py-8 sm:shadow-md print:max-w-none print:gap-2 print:p-0 print:leading-snug print:shadow-none">
      <header className="border-primary border-b-2 pb-3 print:pb-2">
        <p className="text-primary text-base font-bold print:text-sm">
          안심로드 · {longDate(input.date)}
        </p>
        <h1 className="text-primary text-2xl font-extrabold print:text-xl">{course.title}</h1>
        <p className="text-base font-semibold print:text-sm">
          {hhmm(course.startMin)} ~ {hhmm(course.endMin)} · 총 걷는 시간 약 {course.totalWalkMin}분
        </p>
      </header>

      <ol className="flex flex-col">
        {course.stops.map((s, i) => (
          <li
            key={s.place.id}
            className="flex break-inside-avoid gap-3 border-b py-3 print:gap-2 print:py-2"
          >
            <div className="w-16 shrink-0">
              <strong className="text-primary block text-lg font-extrabold tabular-nums">
                {hhmm(s.arriveMin)}
              </strong>
              <span className="text-sm font-bold">{ROLE_LABEL[s.role]}</span>
            </div>
            <PlacePhoto url={s.place.photoUrl} alt={s.place.name} className="w-26 shrink-0" />
            <PlaceLines
              num={i + 1}
              place={s.place}
              stayMin={s.stayMin}
              travel={
                i > 0 && s.travelMin > 0 ? `앞 장소에서 차로 약 ${String(s.travelMin)}분` : null
              }
              review={reviews[s.place.id]}
              memo={trip.memos[s.place.id]}
            />
          </li>
        ))}
      </ol>

      {course.spare && (
        <section className="break-inside-avoid rounded-md border p-3 print:p-2">
          <h2 className="text-primary mb-1 text-base font-extrabold">여유가 있으면</h2>
          <PlaceLines place={course.spare} stayMin={course.spare.stayMin} />
        </section>
      )}

      {(course.er !== null || course.pharmacy) && (
        <section className="border-emergency/30 bg-emergency-soft text-emergency-soft-foreground break-inside-avoid rounded-md border p-3 print:p-2">
          <h2 className="text-emergency mb-1 text-base font-extrabold">안전 정보</h2>
          {course.er && (
            <p className="text-base print:text-sm">
              최근접 응급실 <strong>{erDisplayName(course.er.name)}</strong> ·{" "}
              <Phone n={course.er.phone} />
              {course.er.driveMin !== null && ` · 차로 ${String(course.er.driveMin)}분`}
            </p>
          )}
          {course.pharmacy && (
            <p className="text-base print:text-sm">
              최근접 약국 <strong>{course.pharmacy}</strong>
            </p>
          )}
        </section>
      )}

      <section
        aria-label="링크 주소"
        className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2"
      >
        {access.seniorToken && (
          <LinkCard
            title="부모님용"
            desc="여행 당일 사진 남기기"
            url={absoluteUrl(paths.senior(access.seniorToken))}
          />
        )}
        <LinkCard
          title="자녀용"
          desc="부모님 사진과 현황 보기"
          url={absoluteUrl(paths.family(access.token))}
        />
      </section>

      <p className="text-muted-foreground text-center text-sm">
        자료: 한국관광공사 TourAPI · 국립중앙의료원 · 모담 현장·전화 확인
      </p>
    </article>
  );
}
