// 일정표 이미지 (휴대폰 화면용 카드 → 가로 1080px PNG) 만들기 · 저장 · 공유.
// DOM → PNG 라이브러리(modern-screenshot)는 누를 때만 불러온다 (첫 화면 번들에 넣지 않는다).

/** 이미지 가로 (px) — 카드는 화면에서 CARD_WIDTH 로 그리고 배율로 키운다 */
export const IMAGE_WIDTH = 1080;
export const CARD_WIDTH = 360;

/** '안심로드-2026-10-11-바다-코스.png' — 파일 이름에 못 쓰는 글자 · 띄어쓰기는 '-' 로 */
export function imageFileName(date: string, title: string): string {
  const safe = (s: string) =>
    s
      // eslint-disable-next-line no-control-regex -- 파일 이름에 못 쓰는 제어 문자까지 지운다
      .replace(/[\\/:*?"<>|\u0000-\u001f\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  return `안심로드-${safe(date)}-${safe(title) || "코스"}.png`;
}

/**
 * 카드 노드를 PNG 로. 이미지 · 인쇄는 늘 밝은 색이어야 해서 복제하는 순간에만 다크 모드를 끈다.
 * ponytail: <html> 의 dark 를 잠깐 떼므로 다크 모드에서 한 프레임 깜빡일 수 있다 — tokens.css 에 밝은 색 범위(.light)가 생기면 카드에 그 클래스를 단다.
 */
export async function renderCardPng(node: HTMLElement): Promise<Blob> {
  const { domToBlob } = await import("modern-screenshot");
  const root = document.documentElement;
  const dark = root.classList.contains("dark");
  const restore = () => {
    if (dark) root.classList.add("dark");
  };
  root.classList.remove("dark");
  try {
    return await domToBlob(node, {
      type: "image/png",
      width: CARD_WIDTH,
      scale: IMAGE_WIDTH / CARD_WIDTH,
      onCloneNode: restore,
    });
  } finally {
    restore();
  }
}

export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 30_000);
}

/** 파일 공유가 되는 기기인지 (안 되면 저장으로 대신한다) */
export function canShareFile(file: File): boolean {
  return "canShare" in navigator && navigator.canShare({ files: [file] });
}
