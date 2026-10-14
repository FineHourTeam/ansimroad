// 코스별 설명: config/courseTexts 문서 하나에 자동 코스 키(sea · history · nature · best)별 두 줄 설명을 둔다.
// 누구나 읽고, 운영진만 고친다 (firestore.rules § config). 문서가 없으면 빈 설명 = 화면에서 숨긴다.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const COURSE_TEXT_KEYS = ["sea", "history", "nature", "best"] as const;
export type CourseTextKey = (typeof COURSE_TEXT_KEYS)[number];
export type CourseTexts = Record<CourseTextKey, string>;
/** 결과 카드에서 두 줄 안에 들어가는 길이 */
export const COURSE_TEXT_MAX = 80;

const ref = () => doc(db, "config", "courseTexts");

export async function getCourseTexts(): Promise<CourseTexts> {
  const d = (await getDoc(ref())).data() ?? {};
  return Object.fromEntries(
    COURSE_TEXT_KEYS.map((k) => [k, typeof d[k] === "string" ? d[k] : ""]),
  ) as CourseTexts;
}

export async function saveCourseTexts(t: CourseTexts): Promise<void> {
  const clean = Object.fromEntries(
    COURSE_TEXT_KEYS.map((k) => [k, t[k].trim().slice(0, COURSE_TEXT_MAX)]),
  );
  await setDoc(ref(), { ...clean, updatedAt: new Date().toISOString() });
}
