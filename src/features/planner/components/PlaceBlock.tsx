// 장소 블록: 사진(원본 비율 · 옆으로 넘기기) · 머무는 시간 · 설명 · 정보 줄 · 확인 배지 · 지도/전화 · 후기 · 메모
import type { ReactNode } from "react";
import { ChevronDownIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerifyBadge } from "@/shared/components/common";
import { PlacePhoto } from "@/shared/components/PlacePhoto";
import type { Place } from "@/shared/domain/types";
import { naverMapLink, telHref } from "@/shared/lib/format";
import { placeFacts } from "@/shared/lib/placeFacts";
import { MemoBox } from "./MemoBox";
import { PlaceReviews } from "./PlaceReviews";

function Body({
  place,
  stayMin,
  readOnly,
}: {
  place: Place;
  stayMin: number | null;
  readOnly: boolean;
}) {
  const facts = placeFacts(place);
  const [phone, phone2] = place.phones;
  return (
    <div className="flex min-w-0 flex-col gap-3 text-base sm:col-span-3">
      {stayMin !== null && <p className="font-bold">머무는 시간 {stayMin}분</p>}
      {place.desc && <p className="leading-relaxed">{place.desc}</p>}
      {facts.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="장소 정보">
          {facts.map((f) => (
            <li key={f.key} className="bg-background-subtle rounded-md px-2.5 py-1 text-sm">
              {f.label} <strong className="font-bold">{f.value}</strong>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VerifyBadge status={place.verify} />
        <span className="ml-auto flex gap-2">
          <Button variant="outline" size="xl" className="rounded-full" asChild>
            <a
              href={naverMapLink(place.name, place.address)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${place.name} 지도 보기 (새 창)`}
            >
              <MapPinIcon size="sm" />
              지도
            </a>
          </Button>
          {phone && (
            <Button variant="outline" size="xl" className="rounded-full" asChild>
              <a href={telHref(phone)} aria-label={`${place.name} 전화 걸기 ${phone}`}>
                <PhoneIcon size="sm" />
                전화
              </a>
            </Button>
          )}
        </span>
      </div>
      {/* D-01: 두 번째 번호는 글자로만 */}
      {phone2 && <p className="text-muted-foreground text-right text-sm">다른 번호 {phone2}</p>}
      <PlaceReviews placeId={place.id} />
      <MemoBox placeId={place.id} readOnly={readOnly} />
    </div>
  );
}

/** 코스의 장소 한 곳 (카드). head = 번호 · 도착 시각 · 역할 */
export function PlaceBlock({
  place,
  stayMin,
  head,
  readOnly,
}: {
  place: Place;
  stayMin: number | null;
  head: ReactNode;
  readOnly: boolean;
}) {
  return (
    <Card className="px-4">
      <article
        aria-label={place.name}
        className="flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:items-start sm:gap-4"
      >
        <div className="flex items-center gap-3 sm:col-span-5">
          {head}
          <h3 className="min-w-0 text-xl leading-snug font-extrabold">{place.name}</h3>
        </div>
        <PlacePhoto
          url={place.photoUrl}
          urls={place.photoUrls}
          alt={place.name}
          className="sm:col-span-2"
        />
        <Body place={place} stayMin={stayMin} readOnly={readOnly} />
      </article>
    </Card>
  );
}

/** ④ 시간 남으면 들를 곳 (접힘) */
export function SparePlace({ place, readOnly }: { place: Place; readOnly: boolean }) {
  return (
    <details className="group bg-background rounded-xl border-2 border-dashed">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-sm font-bold">
          여유가 있으면
        </span>
        <span className="min-w-0 flex-1 text-lg font-bold">{place.name}</span>
        <ChevronDownIcon className="text-primary transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-5 sm:gap-4">
        <PlacePhoto
          url={place.photoUrl}
          urls={place.photoUrls}
          alt={place.name}
          className="sm:col-span-2"
        />
        <Body place={place} stayMin={place.stayMin} readOnly={readOnly} />
      </div>
    </details>
  );
}
