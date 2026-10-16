// 카카오톡으로 보내기(F-15): 브라우저 공유 시트(Web Share API)를 쓴다.
// 미지원 환경에서는 링크 복사만 보여 준다 (§0.4).

export function canWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
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
