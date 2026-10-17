// 장소 블록: 이름 · 역할 · 머무는 시간 · 사진(원본 비율 · 옆으로 넘기기) · 설명 · 주소 · 정보 꼬리표 · 주소 복사/길찾기/전화 · 후기 · 메모
import { toast } from "sonner";
import { ChevronDownIcon, ClockIcon, CopyIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VerifyBadge } from "@/shared/components/common";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Place, Transport, VerifyStatus } from "@/shared/domain/types";
import { naverDirectionsLink, telHref } from "@/shared/lib/format";
import { copyText } from "@/shared/lib/share";
import { placeFacts } from "@/shared/lib/placeFacts";
import { MemoBox } from "./MemoBox";
import { PlaceReviews } from "./PlaceReviews";

/** 확인 배지(F-08: 현장 '모담팀이 직접 확인' · 전화 '전화로 확인' · 미확인은 없음) + 머무는 시간 한 줄 */
function Meta({ stayMin, verify }: { stayMin: number | null; verify: VerifyStatus }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <VerifyBadge status={verify} />
      {stayMin !== null && (
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm font-semibold">
          <ClockIcon size="sm" className="text-course" />
          머무는 시간 {stayMin}분
        </p>
      )}
    </div>
  );
}

function Body({
  place,
  readOnly,
  transport,
}: {
  place: Place;
  readOnly: boolean;
  transport: Transport;
}) {
  const facts = placeFacts(place);
  const [phone, phone2] = place.phones;
  const address = place.address.trim();
  return (
    <div className="flex min-w-0 flex-col gap-3 text-base sm:col-span-3">
      {place.desc && <p className="leading-relaxed">{place.desc}</p>}
      {address && (
        <p className="flex items-start gap-1.5 text-sm leading-snug">
          <MapPinIcon size="sm" className="text-course mt-0.5 shrink-0" />
          <span>
            <span className="sr-only">주소 </span>
            {address}
          </span>
        </p>
      )}
      {facts.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="장소 정보">
          {facts.map((f) => (
            <li
              key={f.key}
              className="bg-background-subtle border-border/60 rounded-full border px-2.5 py-1 text-sm"
            >
              <span className="text-muted-foreground">{f.label}</span>{" "}
              <strong className="font-bold">{f.value}</strong>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        {address && (
          <Button
            variant="outline"
            size="xl"
            className="flex-1 px-2"
            aria-label={`${place.name} 주소 복사`}
            onClick={() =>
              void copyText(address).then((ok) => {
                if (ok) toast.success("주소를 복사했어요");
                else toast.error("복사하지 못했어요. 다시 눌러 주세요");
              })
            }
          >
            <CopyIcon />
            주소 복사
          </Button>
        )}
        {/* 네이버 지도 길찾기: 장소 좌표로 연결 (휴대폰은 네이버 지도 앱으로) */}
        <Button variant="outline" size="xl" className="flex-1 px-2" asChild>
          <a
            href={naverDirectionsLink(place, transport)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${place.name} 네이버 지도 길찾기 (새 창)`}
          >
            <MapPinIcon />
            길찾기
          </a>
        </Button>
        {phone && (
          <Button variant="outline" size="xl" className="flex-1 px-2" asChild>
            <a href={telHref(phone)} aria-label={`${place.name} 전화 걸기 ${phone}`}>
              <PhoneIcon />
              전화
            </a>
          </Button>
        )}
      </div>
      {/* D-01: 두 번째 번호는 글자로만 */}
      {phone2 && (
        <p className="text-muted-foreground text-right text-sm tabular-nums">다른 번호 {phone2}</p>
      )}
      <PlaceReviews placeId={place.id} />
      <MemoBox placeId={place.id} readOnly={readOnly} />
    </div>
  );
}

/** 코스의 장소 한 곳 (카드 틀 없음 · 시간 줄 오른쪽에 바로 놓는다). 번호 · 도착 시각은 바깥 시간 줄에, tag = 역할(오전 · 점심 …) */
export function PlaceBlock({
  place,
  stayMin,
  tag,
  readOnly,
  transport,
}: {
  place: Place;
  stayMin: number | null;
  tag: string;
  readOnly: boolean;
  transport: Transport;
}) {
  return (
    <article
      aria-label={place.name}
      className="flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:items-start sm:gap-4"
    >
      <header className="flex flex-col gap-1.5 sm:col-span-5">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-xl leading-snug font-extrabold tracking-tight">
            {place.name}
          </h3>
          <Badge className="bg-course-soft text-course-soft-foreground mt-0.5 border-transparent">
            {tag}
          </Badge>
        </div>
        <Meta stayMin={stayMin} verify={place.verify} />
      </header>
      <PlacePhoto
        url={place.photoUrl}
        urls={place.photoUrls}
        alt={place.name}
        className="sm:col-span-2"
      />
      <Body place={place} readOnly={readOnly} transport={transport} />
    </article>
  );
}

/** ④ 시간 남으면 들를 곳 (접힘) */
export function SparePlace({
  place,
  readOnly,
  transport,
  className,
}: {
  place: Place;
  readOnly: boolean;
  transport: Transport;
  className?: string;
}) {
  return (
    <details
      className={cn("group bg-card/70 border-input rounded-2xl border-2 border-dashed", className)}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <Badge variant="highlight">여유가 있으면</Badge>
        <span className="min-w-0 flex-1 text-lg font-bold">{place.name}</span>
        <ChevronDownIcon className="text-primary shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-5 sm:gap-4">
        <div className="sm:col-span-5">
          <Meta stayMin={place.stayMin} verify={place.verify} />
        </div>
        <PlacePhoto
          url={place.photoUrl}
          urls={place.photoUrls}
          alt={place.name}
          className="sm:col-span-2"
        />
        <Body place={place} readOnly={readOnly} transport={transport} />
      </div>
    </details>
  );
}
