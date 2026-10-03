// 토스트 상태 5종 — 두툼한 둥근 선(2.0) · 원 지름 18 (설치 때 기본 세트)
import { createIcon } from "./icon";

export const SuccessIcon = createIcon(
  "SuccessIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.75 2.75L16 10" />
  </>,
);

export const InfoIcon = createIcon(
  "InfoIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>,
);

export const WarningIcon = createIcon(
  "WarningIcon",
  <>
    <path d="M12 4.5l8.5 15h-17z" />
    <path d="M12 10.5v4" />
    <path d="M12 17h.01" />
  </>,
);

export const ErrorIcon = createIcon(
  "ErrorIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5l5 5" />
    <path d="M14.5 9.5l-5 5" />
  </>,
);

/** 원호 — animate-spin 과 함께 쓴다 */
export const LoadingIcon = createIcon("LoadingIcon", <path d="M12 3a9 9 0 1 1-9 9" />);
