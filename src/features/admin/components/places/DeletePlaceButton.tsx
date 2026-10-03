// 장소 삭제 (확인창 [닫기] [삭제하기]). 지우면 코스 생성에서 바로 빠진다
import { toast } from "sonner";
import { DeleteIcon } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeletePlace } from "@/features/places";
import type { PlaceRecord } from "@/shared/data/placeRecords";

export function DeletePlaceButton({
  record,
  onDeleted,
}: {
  record: PlaceRecord;
  onDeleted: () => void;
}) {
  const del = useDeletePlace();
  const name = record.장소명 || "(이름 없음)";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg" disabled={del.isPending}>
          <DeleteIcon size="sm" />
          {del.isPending ? "삭제하는 중…" : "삭제하기"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>이 장소를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} (ID {record.ID}) · 삭제하면 코스 생성에서 바로 빠지고 되돌릴 수 없어요. 필요하면
            먼저 CSV로 내보내 두세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>닫기</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              del.mutate(record.ID, {
                onSuccess: () => {
                  toast.success(`'${name}' 삭제했어요`);
                  onDeleted();
                },
                onError: () => {
                  toast.error("삭제하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요");
                },
              });
            }}
          >
            삭제하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
