// 여행 화면용 아이콘 — 두툼한 둥근 선(2.0), 여행 수첩에 사인펜으로 그린 듯 둥글고 또렷하게
import { createIcon } from "./icon";

export const PhoneIcon = createIcon(
  "PhoneIcon",
  <path d="M7 4h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 2-2z" />,
);

export const CameraIcon = createIcon(
  "CameraIcon",
  <>
    <path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </>,
);

export const ImageIcon = createIcon(
  "ImageIcon",
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M20.5 16l-5-5-8 8.5" />
  </>,
);

export const MapPinIcon = createIcon(
  "MapPinIcon",
  <>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
);

export const ShareIcon = createIcon(
  "ShareIcon",
  <>
    <path d="M12 15V4" />
    <path d="M8 7.5L12 4l4 3.5" />
    <path d="M5.5 12v6a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-6" />
  </>,
);

export const PrintIcon = createIcon(
  "PrintIcon",
  <>
    <path d="M7 9V4h10v5" />
    <rect x="4" y="9" width="16" height="7.5" rx="2.5" />
    <path d="M7.5 14h9v6h-9z" />
  </>,
);

export const StarIcon = createIcon(
  "StarIcon",
  <path d="M12 4l2.4 5 5.3.6-4 3.7 1.1 5.3L12 16l-4.8 2.6 1.1-5.3-4-3.7 5.3-.6z" />,
);

export const ClockIcon = createIcon(
  "ClockIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </>,
);

export const CopyIcon = createIcon(
  "CopyIcon",
  <>
    <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
    <path d="M15.5 5.5a2 2 0 0 0-2-1.5h-7a2.5 2.5 0 0 0-2.5 2.5v7a2 2 0 0 0 1.5 2" />
  </>,
);

export const DragHandleIcon = createIcon(
  "DragHandleIcon",
  <>
    <path d="M9 6h.01" />
    <path d="M15 6h.01" />
    <path d="M9 12h.01" />
    <path d="M15 12h.01" />
    <path d="M9 18h.01" />
    <path d="M15 18h.01" />
  </>,
);

export const UploadIcon = createIcon(
  "UploadIcon",
  <>
    <path d="M12 15.5V4.5" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" />
  </>,
);

export const DownloadIcon = createIcon(
  "DownloadIcon",
  <>
    <path d="M12 4.5v11" />
    <path d="M7.5 11L12 15.5 16.5 11" />
    <path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" />
  </>,
);

export const HospitalIcon = createIcon(
  "HospitalIcon",
  <>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </>,
);

export const WalkIcon = createIcon(
  "WalkIcon",
  <>
    <circle cx="13" cy="4.5" r="1.5" />
    <path d="M9 21l2.5-6.5L14 17v4" />
    <path d="M7.5 12l2-4.5 3.5-.5 2 3.5 2.5 1" />
    <path d="M11.5 14.5L13 7" />
  </>,
);

export const ArrowLeftIcon = createIcon(
  "ArrowLeftIcon",
  <>
    <path d="M19 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </>,
);

export const LogoutIcon = createIcon(
  "LogoutIcon",
  <>
    <path d="M14 5H6.5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2H14" />
    <path d="M10 12h10" />
    <path d="M16.5 8.5L20 12l-3.5 3.5" />
  </>,
);

export const MinusIcon = createIcon("MinusIcon", <path d="M5 12h14" />);

export const CalendarIcon = createIcon(
  "CalendarIcon",
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
  </>,
);

export const MapIcon = createIcon(
  "MapIcon",
  <>
    <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
    <path d="M9 4.5v13" />
    <path d="M15 6.5v13" />
  </>,
);
