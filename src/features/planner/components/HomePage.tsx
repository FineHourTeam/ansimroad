// S1 메인 · 조건 입력 (F-01 · F-02 · F-03 · N-12 · F-27).
// 위쪽 소개 블록(①~③)이 메인 역할을 하고, 같은 화면에서 조건 6가지(④~⑨)를 골라 코스를 만든다.
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { paths } from "@/app/paths";
import { LoadingIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/features/places";
import { LegalLinks, StickyActionBar } from "@/shared/components/common";
import type { TripInputDraft } from "@/shared/domain/types";
import { now } from "@/shared/lib/clock";
import { toLocalYmd } from "@/shared/lib/date";
import {
  decodeQuery,
  encodeQuery,
  FIELD_ORDER,
  firstMissing,
  isComplete,
  loadDraft,
  saveDraft,
} from "@/shared/lib/tripInput";
import { AboutPanel } from "./AboutPanel";
import { HomeIntro } from "./HomeIntro";
import { RecentTrips } from "./RecentTrips";
import { FIELD_SHORT, FIELD_TITLES, type FieldKey } from "../lib/fields";
import { TripFields } from "./TripFields";

export function HomePage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const settings = useSettings().data; // 장소 데이터를 못 읽어도 문의 이메일은 보여야 한다
  const today = toLocalYmd(now());

  // F-03: S2의 뒤로·요약 줄은 주소에 입력값을 싣고 온다. 없으면 이 탭에 임시 저장한 값.
  const [init] = useState(() => {
    const fromUrl = decodeQuery(search).input;
    const d: TripInputDraft = fromUrl ?? loadDraft();
    // 지난 날짜는 다시 고르게 한다 (⑧ 오늘 이후만)
    return {
      fromUrl: fromUrl !== null,
      draft: d.date !== null && d.date < today ? { ...d, date: null } : d,
    };
  });
  const [draft, setDraft] = useState<TripInputDraft>(init.draft);
  const [missing, setMissing] = useState<FieldKey | null>(null);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (!init.fromUrl) return;
    // S2에서 돌아옴: 스크롤은 입력 폼으로, 주소의 입력값은 지워서 새로고침 때 최신 임시 저장값을 쓰게 한다
    document.getElementById("trip-form")?.scrollIntoView({ block: "start" });
    void navigate({ search: "" }, { replace: true });
  }, [init.fromUrl, navigate]);

  useEffect(
    () => () => {
      window.clearTimeout(slowTimer.current);
    },
    [],
  );

  const set = <K extends FieldKey>(k: K, v: TripInputDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const missingNow = missing && draft[missing] === null ? missing : null;
  // ⑩ 버튼 바로 위 '남은 항목: 여행 날짜' 한 줄 (모담 요청 2026-10-16)
  const remaining = FIELD_ORDER.filter((k) => draft[k] === null).map((k) => FIELD_SHORT[k]);

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (slowTimer.current !== undefined) return; // 이미 이동 중
    if (!isComplete(draft)) {
      // ⑩ 첫 미입력 항목으로 스크롤 + 제목 강조 + 포커스 (팝업 없음)
      const k = firstMissing(draft);
      setMissing(k);
      const el = k ? document.getElementById(`field-${k}`) : null;
      el?.querySelector<HTMLElement>("input, [role=radio]")?.focus({ preventScroll: true });
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    saveDraft(draft);
    // 다음 화면을 내려받는 동안 1초가 넘으면 버튼에 진행 표시
    slowTimer.current = window.setTimeout(() => {
      setSlow(true);
    }, 1000);
    void navigate(paths.resultWithQuery(encodeQuery(draft)), { state: { fromS1: true } });
  };

  const contactEmail = settings?.contactEmail ?? null;
  return (
    <div className="min-h-dvh sm:grid sm:grid-cols-5 sm:items-start lg:grid-cols-12">
      <Seo
        title="부모님 여행은 편안하게, 자녀의 마음은 안심하게"
        description="걷는 시간과 계단까지 따진 목포 하루 코스, 여행 날 소식은 사진으로"
      />
      <HomeIntro contactEmail={contactEmail} className="sm:col-span-2 lg:col-span-5" />
      {/* 오른쪽(휴대폰은 아래) 칸: 질문 카드 + 아래 고정 '코스 만들기' */}
      <div className="flex min-h-dvh flex-col sm:col-span-3 lg:col-span-7">
        {/* data-surface: 화면 바탕을 모래빛으로 (tokens.css body:has) — 흰 질문 카드를 띄운다 */}
        <main
          data-surface="subtle"
          className="flex-1 px-4 pt-6 pb-10 sm:px-8 sm:pt-12 lg:px-14 lg:pt-16"
        >
          <div className="mx-auto max-w-xl lg:max-w-2xl">
            <RecentTrips today={today} className="mb-6" />
            <form
              id="trip-form"
              aria-labelledby="trip-form-title"
              noValidate
              onSubmit={submit}
              className="flex scroll-mt-4 flex-col gap-4"
            >
              <h2 id="trip-form-title" className="px-1 text-xl font-extrabold tracking-tight">
                여행하실 분의 조건을 골라 주세요
              </h2>
              <TripFields draft={draft} set={set} missing={missingNow} today={today} />
              <p className="sr-only" aria-live="polite">
                {missingNow ? `아직 고르지 않은 항목이 있어요: ${FIELD_TITLES[missingNow]}` : ""}
              </p>
            </form>

            <AboutPanel contactEmail={contactEmail} />

            {/* ⑫ 통계 안내 · 법적 고지 한 줄 (팝업·배너 없음) */}
            <LegalLinks
              locationOn={settings?.locationCollectionEnabled ?? false}
              prefix="서비스 개선을 위해 개인을 알 수 없는 이용 통계(쿠키)를 수집해요"
            />
          </div>
        </main>
        <StickyActionBar>
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2 lg:max-w-2xl">
            {remaining.length > 0 && (
              <p
                id="remaining"
                className="text-muted-foreground text-center text-sm font-semibold text-balance"
              >
                남은 항목: {/* 줄은 항목 사이에서만 바뀐다 ('이동 / 수단'처럼 끊기지 않게) */}
                {remaining.map((r, i) => (
                  <span key={r} className="whitespace-nowrap">
                    {r}
                    {i < remaining.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}
            {/* ⑩ disabled 대신 aria-disabled: 눌렀을 때 첫 미입력 항목으로 안내하려고. 띠는 폼 밖이라 form 속성으로 잇는다 */}
            <Button
              type="submit"
              form="trip-form"
              size="cta"
              className="w-full aria-disabled:opacity-60"
              aria-disabled={!isComplete(draft)}
              aria-describedby={remaining.length > 0 ? "remaining" : undefined}
              aria-busy={slow}
            >
              {slow ? (
                <>
                  <LoadingIcon className="animate-spin motion-reduce:animate-none" />
                  코스를 만들고 있어요
                </>
              ) : (
                "부모님 맞춤 여행 코스 추천받기"
              )}
            </Button>
          </div>
        </StickyActionBar>
      </div>
    </div>
  );
}
