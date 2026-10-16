// 자동 코스(바다 · 역사·문화 · 자연·경치 · 목포 대표)별 설명: S2 '이런 코스는 어떠세요?' 카드 제목 아래 두 줄로 나온다
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  COURSE_TEXT_KEYS,
  COURSE_TEXT_MAX,
  useCourseTexts,
  useSaveCourseTexts,
  type CourseTextKey,
  type CourseTexts,
} from "@/features/curated";
import { REPRESENTATIVE, THEME_COURSES } from "@/shared/engine/rules";

const TITLE: Record<CourseTextKey, string> = {
  ...(Object.fromEntries(THEME_COURSES.map((c) => [c.key, c.title])) as Record<
    Exclude<CourseTextKey, "best">,
    string
  >),
  best: REPRESENTATIVE.title,
};

function Form({ initial }: { initial: CourseTexts }) {
  const ids = useId();
  const [texts, setTexts] = useState(initial);
  const save = useSaveCourseTexts();
  const dirty = COURSE_TEXT_KEYS.some((k) => texts[k] !== initial[k]);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(texts, {
          onSuccess: () => toast.success("코스 설명을 저장했어요 · 사용자 화면에 바로 나와요"),
          onError: () =>
            toast.error("저장하지 못했어요. 인터넷 연결이나 운영진 권한을 확인해 주세요"),
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {COURSE_TEXT_KEYS.map((k) => (
          <div key={k} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${ids}-${k}`} className="font-semibold">
                {TITLE[k]}
              </Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {texts[k].length}/{COURSE_TEXT_MAX}
              </span>
            </div>
            <Textarea
              id={`${ids}-${k}`}
              rows={2}
              maxLength={COURSE_TEXT_MAX}
              placeholder="예: 계단 없이 바다를 가까이 보는 코스예요. 케이블카로 목포 전경을 한눈에 봐요."
              value={texts[k]}
              onChange={(e) => {
                setTexts({ ...texts, [k]: e.target.value });
              }}
            />
          </div>
        ))}
      </div>
      <Button type="submit" size="lg" className="self-end" disabled={!dirty || save.isPending}>
        {save.isPending ? "저장하는 중…" : "설명 저장하기"}
      </Button>
    </form>
  );
}

export function CourseTextsCard() {
  const q = useCourseTexts();
  return (
    <Card>
      <CardHeader>
        <CardTitle>코스별 설명</CardTitle>
        <CardDescription>
          사용자 화면 &apos;이런 코스는 어떠세요?&apos;의 코스 이름 아래에 두 줄로 나와요. 비워 두면
          설명 없이 나와요
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : q.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-2">
            <p className="text-destructive text-sm font-semibold">설명을 불러오지 못했어요</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void q.refetch();
              }}
            >
              다시 불러오기
            </Button>
          </div>
        ) : (
          <Form key={q.dataUpdatedAt} initial={q.data} />
        )}
      </CardContent>
    </Card>
  );
}
