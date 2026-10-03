// '지금' 시각 (시연 시계 ?now= 포함). 지금 줄 · 지금쯤 문구가 시간에 따라 움직이도록 30초마다 다시 읽는다.
import { useEffect, useState } from "react";
import { now } from "@/shared/lib/clock";

export function useNow(intervalMs = 30_000): Date {
  const [current, setCurrent] = useState(() => now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setCurrent(now());
    }, intervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return current;
}
