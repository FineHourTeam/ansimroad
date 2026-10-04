// 안심로드 심볼 (청록 핀 · 모래빛 해 · 흰 물결 길). 원본 public/brand/*.svg — web-assets/logo-source/build.py 가 만든다.
import { cn } from "@/lib/utils";

/**
 * tone="color"(기본): 밝은 바탕용 — 다크 모드에서는 흰 핀으로 저절로 바뀐다.
 * tone="white": 청록 바탕 · 사진 위. alt="" 는 옆에 '안심로드' 글자가 있을 때(장식).
 */
export function BrandMark({
  size = 32,
  tone = "color",
  alt = "안심로드",
  className,
}: {
  size?: number;
  tone?: "color" | "white";
  alt?: string;
  className?: string;
}) {
  const img = (src: string, swap?: string) => (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      className={cn("shrink-0", swap, className)}
    />
  );
  if (tone === "white") return img("/brand/mark-white.svg");
  return (
    <>
      {img("/brand/mark.svg", "dark:hidden")}
      {img("/brand/mark-white.svg", "hidden dark:inline-block")}
    </>
  );
}
