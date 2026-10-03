// S1 메인 · 조건 입력 (F-01 · F-02 · F-03 · N-12 · F-27).
// 위쪽 소개 블록(①~③)이 메인 역할을 하고, 같은 화면에서 조건 6가지(④~⑨)를 골라 코스를 만든다.
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { paths } from "@/app/paths";
import { LoadingIcon } from "@/components/icons";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/features/places";
import { LegalLinks } from "@/shared/components/common";
import type { TripInputDraft } from "@/shared/domain/types";
import { now } from "@/shared/lib/clock";
import { toLocalYmd } from "@/shared/lib/date";
import {
  decodeQuery,
  encodeQuery,
  firstMissing,
  isComplete,
  loadDraft,
  saveDraft,
} from "@/shared/lib/tripInput";
import { AboutPanel } from "./AboutPanel";
import { HomeIntro } from "./HomeIntro";
import { FIELD_TITLES, type FieldKey } from "../lib/fields";
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
    <div className="bg-background min-h-dvh sm:grid sm:grid-cols-5 sm:items-start lg:grid-cols-12">
      <Seo
        title="자녀가 계획하고, 부모님은 사진만 찍는 목포 여행"
        description="조건 6가지만 고르면 모담팀이 직접 확인한 목포 장소로 부모님 여행 코스 3개를 만들어요."
      />
      <HomeIntro contactEmail={contactEmail} className="sm:col-span-2 lg:col-span-5" />
      <main className="px-4 pt-6 pb-10 sm:col-span-3 sm:px-8 sm:pt-12 lg:col-span-7 lg:px-14 lg:pt-16">
        <div className="mx-auto max-w-xl lg:max-w-2xl">
          <form
            id="trip-form"
            aria-label="여행 조건 입력"
            noValidate
            onSubmit={submit}
            className="flex scroll-mt-4 flex-col gap-7"
          >
            <TripFields draft={draft} set={set} missing={missingNow} today={today} />
            {/* ⑩ disabled 대신 aria-disabled: 눌렀을 때 첫 미입력 항목으로 안내하려고 */}
            <Button
              type="submit"
              size="cta"
              className="mt-1 w-full aria-disabled:opacity-60"
              aria-disabled={!isComplete(draft)}
              aria-busy={slow}
            >
              {slow ? (
                <>
                  <LoadingIcon className="animate-spin motion-reduce:animate-none" />
                  코스를 만들고 있어요
                </>
              ) : (
                "코스 3개 만들기"
              )}
            </Button>
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
    </div>
  );
}
