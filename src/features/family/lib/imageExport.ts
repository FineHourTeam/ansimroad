// 화면 노드 → PNG (여행 일정 한눈에 보기 · 추억 페이지) 만들기 · 저장 · 공유.
// DOM → PNG 라이브러리(modern-screenshot)는 누를 때만 불러온다 (첫 화면 번들에 넣지 않는다).
import { isMobileDevice } from "@/shared/lib/share";

/** 이미지 가로 (px) — 화면 폭에서 이 폭 이상이 되게 키운다 (최소 2배) */
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

/** 다른 출처라 그대로는 못 담는 장소 사진(관광공사 사진 서버가 CORS 를 막는다) → 우리 서버 함수(/api/img)가 받아 준다 */
const PROXY_HOSTS = ["tong.visitkorea.or.kr"];

const BLANK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

async function viaProxy(url: string): Promise<string | false> {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  if (!PROXY_HOSTS.includes(host)) return false; // 나머지는 라이브러리가 그대로 받는다
  try {
    const res = await fetch(`/api/img?u=${encodeURIComponent(url)}`);
    if (!res.ok) return false;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        resolve(typeof r.result === "string" ? r.result : "");
      };
      r.onerror = () => {
        reject(r.error ?? new Error("사진을 읽지 못했어요"));
      };
      r.readAsDataURL(blob);
    });
  } catch {
    return false;
  }
}

/**
 * 노드를 PNG 로 (width = 그릴 폭, 기본은 추억 페이지 카드 폭). 이미지 · 인쇄는 늘 밝은 색이어야 해서 복제하는 순간에만 다크 모드를 끈다.
 * ponytail: <html> 의 dark 를 잠깐 떼므로 다크 모드에서 한 프레임 깜빡일 수 있다 — tokens.css 에 밝은 색 범위(.light)가 생기면 카드에 그 클래스를 단다.
 */
export async function renderCardPng(
  node: HTMLElement,
  { width = CARD_WIDTH }: { width?: number } = {},
): Promise<Blob> {
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
      width,
      scale: Math.max(2, IMAGE_WIDTH / width),
      fetchFn: viaProxy,
      // 그래도 못 받은 사진은 깨진 그림 · 대체 글자 대신 빈칸으로
      fetch: { placeholderImage: BLANK },
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

/** 파일 공유가 되는 휴대폰인지 (안 되면 저장으로 대신한다. PC 는 공유 창에 카카오톡이 없어 저장으로) */
export function canShareFile(file: File): boolean {
  return isMobileDevice() && "canShare" in navigator && navigator.canShare({ files: [file] });
}
