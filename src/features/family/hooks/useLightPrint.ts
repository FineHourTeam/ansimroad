// 종이는 늘 밝은 색: 다크 모드여도 인쇄하는 동안만 밝은 색으로 (인쇄용 일정표 · 추억 페이지)
import { useEffect } from "react";

export function useLightPrint() {
  useEffect(() => {
    const root = document.documentElement;
    let dark = false;
    const before = () => {
      dark = root.classList.contains("dark");
      root.classList.remove("dark");
    };
    const after = () => {
      if (dark) root.classList.add("dark");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
}
