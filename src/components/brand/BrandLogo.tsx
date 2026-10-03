// 안심로드 로고 (심볼 + 글자 '안심로드'). 글자는 Pretendard ExtraBold 를 윤곽선으로 굳힌 SVG 라 <img> 로도 같은 모양이다.
import { cn } from "@/lib/utils";

const RATIO = 194.65 / 64; // public/brand/logo.svg viewBox 가로 ÷ 세로

/**
 * height 는 px (기본 32 — 가로는 비율대로).
 * tone="color"(기본): 밝은 바탕용 — 다크 모드에서는 흰 로고로 저절로 바뀐다. tone="white": 청록 바탕 · 사진 위.
 */
export function BrandLogo({
  height = 32,
  tone = "color",
  className,
}: {
  height?: number;
  tone?: "color" | "white";
  className?: string;
}) {
  const img = (src: string, swap?: string) => (
    <img
      src={src}
      alt="안심로드"
      width={Math.round(height * RATIO)}
      height={height}
      decoding="async"
      className={cn("shrink-0", swap, className)}
    />
  );
  if (tone === "white") return img("/brand/logo-white.svg");
  return (
    <>
      {img("/brand/logo.svg", "dark:hidden")}
      {img("/brand/logo-white.svg", "hidden dark:inline-block")}
    </>
  );
}
