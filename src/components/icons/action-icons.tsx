// 자주 쓰는 동작 8종 — 두툼한 둥근 선(2.0) (설치 때 기본 세트)
import { createIcon } from "./icon";

export const CloseIcon = createIcon(
  "CloseIcon",
  <>
    <path d="M6.5 6.5l11 11" />
    <path d="M17.5 6.5l-11 11" />
  </>,
);

export const CheckIcon = createIcon("CheckIcon", <path d="M5 12.5l4.5 4.5L19 7.5" />);

export const ChevronDownIcon = createIcon("ChevronDownIcon", <path d="M6.5 9.5l5.5 5.5 5.5-5.5" />);

export const ChevronRightIcon = createIcon(
  "ChevronRightIcon",
  <path d="M9.5 6.5l5.5 5.5-5.5 5.5" />,
);

export const AddIcon = createIcon(
  "AddIcon",
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

export const DeleteIcon = createIcon(
  "DeleteIcon",
  <>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V4.5h5V7" />
    <path d="M6.5 7l1 12.5h9l1-12.5" />
  </>,
);

export const EditIcon = createIcon(
  "EditIcon",
  <>
    <path d="M15 5l4 4L9 19H5v-4z" />
    <path d="M13 7l4 4" />
  </>,
);

export const SearchIcon = createIcon(
  "SearchIcon",
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5L20 20" />
  </>,
);
