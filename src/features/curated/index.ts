// 운영진 추천 코스 공개 API
export {
  curatedKeys,
  usePublishedCurated,
  useAllCurated,
  useSaveCurated,
  useDeleteCurated,
  useUploadCuratedPhoto,
  newCuratedId,
  useCourseTexts,
  useSaveCourseTexts,
} from "./hooks/useCurated";
export {
  COURSE_TEXT_KEYS,
  COURSE_TEXT_MAX,
  type CourseTextKey,
  type CourseTexts,
} from "./api/courseTexts";
