// 카카오톡으로 보내기(F-15): 브라우저 공유 시트(Web Share API)를 쓴다.
// 미지원 환경에서는 복사로 대신한다 (§0.4).

/**
 * 휴대폰 · 태블릿인지. PC 크롬도 공유 창은 열지만 목록에 카카오톡이 없어서(모담 2026-10-29)
 * PC 는 공유 창 대신 저장 · 복사로 안내한다. iPad 사파리는 PC(Macintosh)로 보이므로 터치 지점 수로 가린다.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

/** 휴대폰 공유 창으로 보낼 수 있는지 (PC 는 공유 창이 있어도 아니라고 본다) */
export function canWebShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function" && isMobileDevice()
  );
}

/** url 을 빼면 글 안의 주소만 간다 (카카오톡이 글 속 첫 주소로 미리보기 카드를 만든다) */
export async function shareLink(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<"shared" | "cancelled" | "failed"> {
  try {
    await navigator.share(data);
    return "shared";
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError" ? "cancelled" : "failed";
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    // http(보안 연결 아님)에서는 navigator.clipboard 가 실제로 없다 — 타입과 달리 확인이 필요하다
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 아래 방식으로 재시도 */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    // 클립보드 API 가 없는 환경(http · 오래된 브라우저)의 예비 방식
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
