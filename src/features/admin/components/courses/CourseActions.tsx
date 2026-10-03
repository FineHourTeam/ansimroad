// 코스 아래 줄 (화면 아래에 붙어 있어 긴 코스도 스크롤 없이 저장): 공개 스위치 · 저장 · 사용자 화면에서 보기 · 삭제(확인창)
import { useState } from "react";
import { Link } from "react-router";
import { paths } from "@/app/paths";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CuratedCourse } from "@/shared/domain/types";
import { now } from "@/shared/lib/clock";
import { addDays, toLocalYmd } from "@/shared/lib/date";
import { encodeQuery } from "@/shared/lib/tripInput";

export function CourseActions({
  draft,
  dirty,
  saved,
  saving,
  deleting,
  uploading,
  onPublish,
  onSave,
  onDelete,
}: {
  draft: CuratedCourse;
  dirty: boolean;
  /** 저장된 같은 코스 (없으면 아직 저장 전) */
  saved: CuratedCourse | undefined;
  saving: boolean;
  deleting: boolean;
  /** 사진을 올리는 중이면 삭제를 막는다 (올린 사진이 지운 코스에 남지 않게) */
  uploading: boolean;
  onPublish: (published: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  // 사용자 화면(S2-1)은 공개한 코스만 보여 준다 — 저장된 공개 코스일 때만 연다
  const previewQuery = encodeQuery({
    party: 2,
    age: 70,
    mobility: "none",
    walk: 30,
    date: addDays(toLocalYmd(now()), 7),
    transport: "car",
  });

  return (
    <div className="bg-card text-card-foreground sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-lg border p-4 shadow-md">
      <div className="mr-auto flex items-center gap-2">
        <Switch id="course-published" checked={draft.published} onCheckedChange={onPublish} />
        <Label htmlFor="course-published" className="font-semibold">
          사용자 화면에 공개
        </Label>
        <Badge variant={draft.published ? "default" : "outline"} aria-hidden="true">
          {draft.published ? "공개" : "비공개"}
        </Badge>
      </div>
      {dirty && <p className="text-muted-foreground text-sm">저장하지 않은 내용이 있어요</p>}
      {saved?.published && (
        <Button variant="outline" size="lg" asChild>
          <Link
            to={paths.resultDetailOf(`c-${saved.id}`, previewQuery)}
            target="_blank"
            rel="noopener noreferrer"
          >
            사용자 화면에서 보기
          </Link>
        </Button>
      )}
      {saved && (
        <Button
          variant="destructive"
          size="lg"
          disabled={saving || deleting || uploading}
          onClick={() => {
            setConfirm(true);
          }}
        >
          {deleting ? "삭제하는 중이에요" : "삭제하기"}
        </Button>
      )}
      {/* 저장과 삭제가 겹치면 늦게 끝난 저장이 지운 코스를 되살린다 — 하나씩만 */}
      <Button size="lg" disabled={saving || deleting} onClick={onSave}>
        {saving ? "저장하는 중이에요" : "저장하기"}
      </Button>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 코스를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {draft.title.trim() || "이름 없는 코스"} · 삭제하면 사용자 화면에서도 사라지고 되돌릴
              수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              삭제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
