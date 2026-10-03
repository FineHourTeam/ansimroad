// 운영진 추천 코스 만들기 (/admin): 지도에서 장소를 고르며 코스를 짠다.
// 공개한 코스는 S2 '모담팀 추천 코스'에 나오고, 그대로 확정 → 어르신 · 자녀 화면 · 리포트 흐름을 탄다.
import { useEffect, useState } from "react";
import { useBlocker } from "react-router";
import { toast } from "sonner";
import { AdminShell } from "./AdminShell";
import { CourseEditor } from "./courses/CourseEditor";
import { CourseList } from "./courses/CourseList";
import { emptyCourse, saveProblem } from "./courses/draft";
import { newCuratedId, useAllCurated, useDeleteCurated, useSaveCurated } from "@/features/curated";
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
import type { CuratedCourse } from "@/shared/domain/types";

/** rev = 고친 횟수, savedRev = 마지막으로 저장한 때의 rev. 둘이 다르면 저장하지 않은 내용이 있다 */
interface Editing {
  draft: CuratedCourse;
  rev: number;
  savedRev: number;
}

const fresh = (draft: CuratedCourse): Editing => ({ draft, rev: 0, savedRev: 0 });

export function AdminCoursesPage() {
  const [ed, setEd] = useState<Editing>(() => fresh(emptyCourse(newCuratedId())));
  const [pending, setPending] = useState<CuratedCourse | null>(null);
  /** 올리는 중인 사진 묶음 수 — 끝나야 코스에 들어가므로 저장 안 한 내용으로 본다 */
  const [uploads, setUploads] = useState(0);
  const list = useAllCurated();
  const save = useSaveCurated();
  const del = useDeleteCurated();
  const { draft } = ed;
  const dirty = ed.rev !== ed.savedRev;
  const unsaved = dirty || uploads > 0;
  const saved = list.data?.find((c) => c.id === draft.id);
  // 다른 운영진 탭으로 가거나 창을 닫을 때도 고친 내용을 지킨다
  const blocker = useBlocker(unsaved);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [unsaved]);

  // 바뀐 게 없으면(이미 닫은 코스에 늦게 도착한 사진 등) 그대로 둬서 '저장 안 함'이 생기지 않게 한다
  const edit = (fn: (c: CuratedCourse) => CuratedCourse) => {
    setEd((s) => {
      const next = fn(s.draft);
      return next === s.draft ? s : { ...s, draft: next, rev: s.rev + 1 };
    });
  };
  const open = (c: CuratedCourse) => {
    if (unsaved) setPending(c);
    else setEd(fresh(c));
  };

  const onSave = () => {
    const before = draft;
    const next = { ...before, title: before.title.trim(), updatedAt: new Date().toISOString() };
    const problem = saveProblem(next);
    if (problem) {
      toast.error(problem);
      return;
    }
    const rev = ed.rev;
    save.mutate(next, {
      onSuccess: () => {
        // 저장하는 사이 더 고친 내용(올리던 사진 · 이름 등)은 남기고, 저장한 시점까지만 '저장됨'으로 본다
        setEd((s) => {
          if (s.draft.id !== next.id) return s;
          const title = s.draft.title === before.title ? next.title : s.draft.title;
          return {
            draft: s.rev === rev ? next : { ...s.draft, title, updatedAt: next.updatedAt },
            rev: s.rev,
            savedRev: rev,
          };
        });
        toast.success(
          next.published ? "저장했어요 · 사용자 화면에 공개 중" : "저장했어요 (비공개)",
        );
      },
      onError: () => {
        toast.error("저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요");
      },
    });
  };

  const onDelete = () => {
    const id = draft.id;
    del.mutate(id, {
      onSuccess: () => {
        setEd((s) => (s.draft.id === id ? fresh(emptyCourse(newCuratedId())) : s));
        toast.success("코스를 삭제했어요");
      },
      onError: () => {
        toast.error("삭제하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요");
      },
    });
  };

  const leaving = blocker.state === "blocked";
  const closeGuard = () => {
    setPending(null);
    if (blocker.state === "blocked") blocker.reset();
  };

  return (
    <AdminShell title="추천 코스 만들기" confirmLeave={unsaved}>
      <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
        <CourseList
          currentId={draft.id}
          onOpen={open}
          onNew={() => {
            open(emptyCourse(newCuratedId()));
          }}
        />
        <CourseEditor
          key={draft.id}
          draft={draft}
          dirty={dirty}
          saved={saved}
          saving={save.isPending}
          deleting={del.isPending}
          uploading={uploads > 0}
          onEdit={edit}
          onBusy={(d) => {
            setUploads((n) => n + d);
          }}
          onSave={onSave}
          onDelete={onDelete}
        />
      </div>
      <AlertDialog
        open={pending !== null || leaving}
        onOpenChange={(o) => {
          if (!o) closeGuard();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>저장하지 않은 내용이 있어요</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? "지금 고친 내용을 버리고 다른 코스를 열까요?"
                : "지금 고친 내용을 버리고 나갈까요?"}
              {uploads > 0 && " 올리는 중인 사진은 코스에 들어가지 않아요."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pending) setEd(fresh(pending));
                setPending(null);
                if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              {pending ? "버리고 열기" : "버리고 나가기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
