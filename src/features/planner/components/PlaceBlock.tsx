// 장소 블록: 이름 · 역할 · 머무는 시간 · 사진(원본 비율 · 옆으로 넘기기) · 설명 · 정보 꼬리표 · 지도/전화 · 후기 · 메모
import { ChevronDownIcon, ClockIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Place } from "@/shared/domain/types";
import { naverMapLink, telHref } from "@/shared/lib/format";
import { placeFacts } from "@/shared/lib/placeFacts";
import { MemoBox } from "./MemoBox";
import { PlaceReviews } from "./PlaceReviews";

/** 머무는 시간 한 줄 (확인 배지는 두지 않는다 — 코스의 장소는 모두 확인을 거친 곳이다) */
function Meta({ stayMin }: { stayMin: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {stayMin !== null && (
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm font-semibold">
          <ClockIcon size="sm" className="text-primary" />
          머무는 시간 {stayMin}분
        </p>
      )}
    </div>
  );
}

function Body({ place, readOnly }: { place: Place; readOnly: boolean }) {
  const facts = placeFacts(place);
  const [phone, phone2] = place.phones;
  return (
    <div className="flex min-w-0 flex-col gap-3 text-base sm:col-span-3">
      {place.desc && <p className="leading-relaxed">{place.desc}</p>}
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
        <Button variant="outline" size="xl" className="flex-1" asChild>
          <a
            href={naverMapLink(place.name, place.address)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${place.name} 지도 보기 (새 창)`}
          >
            <MapPinIcon />
            지도
          </a>
        </Button>
        {phone && (
          <Button variant="outline" size="xl" className="flex-1" asChild>
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
}: {
  place: Place;
  stayMin: number | null;
  tag: string;
  readOnly: boolean;
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
          <Badge variant="secondary" className="mt-0.5">
            {tag}
          </Badge>
        </div>
        <Meta stayMin={stayMin} />
      </header>
      <PlacePhoto
        url={place.photoUrl}
        urls={place.photoUrls}
        alt={place.name}
        className="sm:col-span-2"
      />
      <Body place={place} readOnly={readOnly} />
    </article>
  );
}

/** ④ 시간 남으면 들를 곳 (접힘) */
export function SparePlace({
  place,
  readOnly,
  className,
}: {
  place: Place;
  readOnly: boolean;
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
          <Meta stayMin={place.stayMin} />
        </div>
        <PlacePhoto
          url={place.photoUrl}
          urls={place.photoUrls}
          alt={place.name}
          className="sm:col-span-2"
        />
        <Body place={place} readOnly={readOnly} />
      </div>
    </details>
  );
}
