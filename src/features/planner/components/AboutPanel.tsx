// S1 ⑪ 접힌 소개: 서비스 소개 · 데이터 출처 · 문의 (문구는 계약 후 발주자 제공 — 지금은 같은 구성의 임시 문구)
import { ChevronDownIcon, InfoIcon } from "@/components/icons";

export function AboutPanel({ contactEmail }: { contactEmail: string | null }) {
  return (
    <details className="group bg-card text-card-foreground border-border/80 mt-6 overflow-hidden rounded-2xl border shadow-sm">
      <summary className="hover:bg-accent/50 flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-base font-semibold transition-colors [&::-webkit-details-marker]:hidden">
        <InfoIcon className="text-primary shrink-0" />
        <span className="flex-1">서비스 소개 · 데이터 출처 · 문의</span>
        <ChevronDownIcon className="text-muted-foreground shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="flex flex-col divide-y border-t px-5 text-base">
        <section className="flex flex-col gap-1 py-4">
          <h3 className="text-primary font-extrabold">서비스 소개</h3>
          <p>부모님과 여행을 계획할 때 계단·걷는 거리·화장실 같은 정보는 미리 알기 어려워요.</p>
          <p>그래서 목포의 장소를 모담팀이 직접 찾아가거나 전화로 확인했어요.</p>
          <p>안심로드는 창업 팀 ‘모담’이 운영해요.</p>
        </section>
        <section className="flex flex-col gap-1 py-4">
          <h3 className="text-primary font-extrabold">데이터 출처</h3>
          <ul className="list-disc pl-5">
            <li>관광지 정보·사진: 한국관광공사 TourAPI</li>
            <li>응급실 정보: 국립중앙의료원</li>
            <li>계단·화장실·쉴 곳: 모담 팀 현장·전화 확인</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            응급실 정보는 실시간 운영 상황이 아니에요. 위급할 때는 119에 먼저 연락해 주세요.
          </p>
        </section>
        <section className="flex flex-col gap-1 py-4">
          <h3 className="text-primary font-extrabold">문의</h3>
          {contactEmail && (
            <p>
              <a className="underline underline-offset-4" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </p>
          )}
          <p>장소 정보가 실제와 다르면 이메일로 알려 주세요.</p>
        </section>
      </div>
    </details>
  );
}
