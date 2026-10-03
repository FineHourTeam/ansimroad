// ⓪ 첫 진입 동의 화면 (F-28): 이 기기에서 /t 링크를 처음 열 때 1회, 본 화면 앞에 화면 전체로 (팝업 아님).
// 위치 수집 설정 OFF(기본): 사진·시각 안내 + 버튼 1개. ON: 위치 안내 + 버튼 2개 + 위치정보 이용약관 링크.
// 안내 항목: 개인정보 보호법 제15조 ② 고지 사항. 문구 확정은 발주자(계약 후).
import { SeniorDock, SeniorFrame } from "./SeniorMessage";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { LegalLinks } from "@/shared/components/common";
import type { ConsentChoice } from "@/shared/domain/types";

function consentCopy(
  locationOn: boolean,
  keepDays: number,
): { lead: string; items: [string, string][] } {
  const keep = `여행일 ${String(keepDays)}일 뒤 자동으로 지워져요`;
  const later = `${keep}.`;
  if (locationOn) {
    return {
      lead: `여행 날 ‘사진 남기기’를 누르면 사진과 지금 위치·시각이 자녀에게 보내져요. ${later} 위치를 원하지 않으면 ‘위치 없이 시작’을 눌러 주세요.`,
      items: [
        ["수집 항목", "사진, 찍은 시각, 지금 위치"],
        ["목적", "여행 중 자녀에게 사진과 위치·시각을 보내요"],
        ["보유 기간", keep],
        ["받는 사람", "자녀 (자녀용 링크로 봐요)"],
        [
          "거부할 수 있어요",
          "‘위치 없이 시작’을 누르면 위치는 보내지 않아요. 사진은 ‘사진 남기기’를 누를 때만 보내져요.",
        ],
      ],
    };
  }
  return {
    lead: `여행 날 ‘사진 남기기’를 누르면 사진과 찍은 시각이 자녀에게 보내져요. 위치는 보내지 않아요. ${later}`,
    items: [
      ["수집 항목", "사진, 찍은 시각 (위치는 수집하지 않아요)"],
      ["목적", "여행 중 자녀에게 사진과 시각을 보내요"],
      ["보유 기간", keep],
      ["받는 사람", "자녀 (자녀용 링크로 봐요)"],
      ["거부할 수 있어요", "사진은 ‘사진 남기기’를 누를 때만 보내져요."],
    ],
  };
}

export function ConsentScreen({
  title,
  keepDays,
  locationOn,
  onChoose,
}: {
  title: string;
  keepDays: number;
  locationOn: boolean;
  onChoose: (c: ConsentChoice) => void;
}) {
  const { lead, items } = consentCopy(locationOn, keepDays);
  return (
    <SeniorFrame>
      <Seo title={title} noindex />
      <header className="border-b-2 px-4 pt-6 pb-4">
        <h1 className="text-3xl leading-snug font-extrabold text-balance">{title}</h1>
      </header>
      <main className="flex-1 px-4 pt-5 pb-6">
        <p className="bg-background-subtle rounded-xl p-4 text-2xl leading-relaxed font-semibold text-pretty">
          {lead}
        </p>
        <dl className="mt-5 divide-y">
          {items.map(([k, v]) => (
            <div key={k} className="py-3">
              <dt className="text-primary text-2xl font-extrabold">{k}</dt>
              <dd className="mt-1 text-2xl leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
      </main>
      {/* 버튼은 아래에 고정: 안내가 길어도 첫 화면에서 바로 보인다 */}
      <SeniorDock>
        <Button
          size="senior"
          className="w-full"
          onClick={() => {
            onChoose("agree");
          }}
        >
          동의하고 시작
        </Button>
        {locationOn && (
          <Button
            size="senior"
            variant="outline"
            className="w-full"
            onClick={() => {
              onChoose("no_location");
            }}
          >
            위치 없이 시작
          </Button>
        )}
        {/* F-27: 처리방침 링크는 여기(동의 화면)에만, 본 화면에는 두지 않는다 */}
        {/* 링크마다 손가락 탭 48px (*:min-h-12) */}
        <LegalLinks
          locationOn={locationOn}
          className="text-foreground mt-0 text-xl font-semibold *:inline-flex *:min-h-12 *:items-center"
        />
      </SeniorDock>
    </SeniorFrame>
  );
}
