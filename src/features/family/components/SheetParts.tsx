// 인쇄용 한 장(PrintSheet)과 휴대폰 이미지 카드(ImageCard)가 함께 쓰는 조각: 머리띠 · 장소 정보 줄 · 꼬리표 · 안전 정보 · QR · 링크 주소
import { Fragment, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ClockIcon, HospitalIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Course, Place } from "@/shared/domain/types";
import { hhmm, longDate } from "@/shared/lib/date";
import { erDisplayName } from "@/shared/lib/format";
import { placeFacts } from "@/shared/lib/placeFacts";
import { displayUrl } from "../lib/links";

/** 좁은 화면에서도 전화번호가 '061-' 에서 끊기지 않게 */
export const Phone = ({ n }: { n: string }) => <span className="whitespace-nowrap">{n}</span>;

/** 위 머리띠: 로고 · 날짜 · 코스 이름 · 시간 (+ 인쇄용은 오른쪽에 코스 지도). 다크 화면에서는 어두운 청록 — 인쇄 · 이미지는 늘 밝은 색 */
export function SheetHeader({
  date,
  course,
  map,
}: {
  date: string;
  course: Course;
  map?: ReactNode;
}) {
  const info = (
    <div className="flex flex-col gap-4 print:gap-3">
      <div className="flex items-center justify-between gap-3">
        <BrandLogo height={24} tone="white" />
        <p className="text-sm font-semibold tabular-nums">{longDate(date)}</p>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl print:text-3xl">
          {course.title}
        </h1>
        <p className="text-base font-semibold tabular-nums">
          {hhmm(course.startMin)} ~ {hhmm(course.endMin)} · {course.stops.length}곳 · 걷는 시간 약{" "}
          {course.totalWalkMin}분
        </p>
      </div>
    </div>
  );
  return (
    <header
      className={cn(
        "bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground rounded-2xl px-5 py-5 print:px-7 print:py-4",
        map && "grid gap-4 sm:grid-cols-2 sm:items-center print:grid-cols-2",
      )}
    >
      {info}
      {map}
    </header>
  );
}

function Item({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground flex">{icon}</span>
      {children}
    </span>
  );
}

/** 머무는 시간 · 이동 · 전화 한 줄. 항목마다 아이콘이 앞에 서서 좁으면 항목 단위로 줄바꿈된다 */
export function PlaceLine({
  place,
  stayMin,
  travelMin,
  className,
}: {
  place: Place;
  stayMin: number | null;
  travelMin?: number;
  className?: string;
}) {
  if (stayMin === null && !travelMin && place.phones.length === 0) return null;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5", className)}>
      {stayMin !== null && <Item icon={<ClockIcon size="sm" />}>머무는 시간 {stayMin}분</Item>}
      {!!travelMin && (
        <Item icon={<MapPinIcon size="sm" />}>앞 장소에서 차로 약 {travelMin}분</Item>
      )}
      {place.phones.length > 0 && (
        <Item icon={<PhoneIcon size="sm" />}>
          {place.phones.map((ph, i) => (
            <Fragment key={ph}>
              {i > 0 && " / "}
              <Phone n={ph} />
            </Fragment>
          ))}
        </Item>
      )}
    </p>
  );
}

/** 걷는 시간 · 계단 · 화장실 … 을 작은 꼬리표로 */
export function FactTags({ place, className }: { place: Place; className?: string }) {
  const facts = placeFacts(place);
  if (facts.length === 0) return null;
  return (
    <ul aria-label="장소 정보" className={cn("flex flex-wrap gap-1", className)}>
      {facts.map((f) => (
        <li
          key={f.key}
          className="bg-background-subtle text-foreground rounded-full border px-2 py-0.5 leading-normal font-semibold print:py-0"
        >
          {f.label} {f.value}
        </li>
      ))}
    </ul>
  );
}

/** 메모: 모래빛 쪽지 */
export function MemoNote({ memo, className }: { memo: string; className?: string }) {
  return (
    <p
      className={cn(
        "bg-highlight/25 text-highlight-foreground dark:bg-highlight/15 dark:text-highlight rounded-lg px-2.5 py-1.5 font-semibold",
        className,
      )}
    >
      메모: {memo}
    </p>
  );
}

/** 안전 정보: 경보처럼 보이지 않게 흰 상자 + 벽돌색 아이콘 하나 */
export function SafetyBox({ course, className }: { course: Course; className?: string }) {
  if (course.er === null && !course.pharmacy) return null;
  return (
    <section
      aria-label="안전 정보"
      className={cn(
        "bg-card text-card-foreground flex break-inside-avoid items-start gap-3 rounded-2xl border p-4 print:p-3",
        className,
      )}
    >
      <span className="bg-emergency-soft text-emergency grid size-9 shrink-0 place-items-center rounded-full">
        <HospitalIcon size="sm" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-extrabold">안전 정보</h2>
        {course.er && (
          <>
            <p>
              가까운 응급실 <strong>{erDisplayName(course.er.name)}</strong>
            </p>
            <p className="tabular-nums">
              <Phone n={course.er.phone} />
              {course.er.driveMin !== null && ` · 차로 ${String(course.er.driveMin)}분`}
            </p>
          </>
        )}
        {course.pharmacy && (
          <p>
            가까운 약국 <strong>{course.pharmacy}</strong>
          </p>
        )}
      </div>
    </section>
  );
}

/** 링크 주소: 경로('…/t/') 뒤에서만 줄을 바꿔 토큰이 한두 글자씩 떨어지지 않게 */
export function UrlText({ url, className }: { url: string; className?: string }) {
  const shown = displayUrl(url);
  const cut = shown.lastIndexOf("/") + 1;
  return (
    <span className={cn("wrap-anywhere", className)}>
      {shown.slice(0, cut)}
      <wbr />
      <span className="whitespace-nowrap">{shown.slice(cut)}</span>
    </span>
  );
}

/** 모래빛 주소 칸 (S3 링크 모아 보기 · S5 보내기 카드) — 복사는 바로 아래 버튼으로 */
export function UrlPill({ url }: { url: string }) {
  return (
    <p className="bg-background-subtle rounded-xl px-3.5 py-2.5 text-base font-semibold">
      <UrlText url={url} />
    </p>
  );
}

/** 링크 한 장: 휴대폰 카메라로 찍으면 바로 열리는 QR + 주소 */
export function QrCard({
  label,
  title,
  url,
  qrSize = 64,
  className,
}: {
  label: string;
  title: string;
  url: string;
  qrSize?: number;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "bg-card text-card-foreground m-0 flex break-inside-avoid items-center gap-3 rounded-xl border p-3 print:p-2.5",
        className,
      )}
    >
      <QRCodeSVG value={url} size={qrSize} marginSize={0} title={`${label} 링크 QR 코드`} />
      <figcaption className="flex min-w-0 flex-col items-start gap-1">
        <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-xs font-bold">
          {label}
        </span>
        {/* 주소 글자는 싣지 않는다 (종이를 보고 주소를 치는 사람은 없다 — QR 로 들어간다) */}
        <strong className="text-sm leading-snug">{title}</strong>
      </figcaption>
    </figure>
  );
}
