// 장소 목록 표: 주요 칸 + 확인 상태 + 코스 반영 여부 (빠졌으면 이유)
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerifyBadge } from "@/shared/components/common";
import { cn } from "@/lib/utils";
import type { PlaceRecord } from "@/shared/data/placeRecords";

const HEAD = "text-muted-foreground h-11 px-4 text-sm font-semibold";

export function PlaceTable({
  rows,
  skipped,
  onOpen,
}: {
  rows: PlaceRecord[];
  skipped: ReadonlyMap<string, string>;
  onOpen: (r: PlaceRecord) => void;
}) {
  return (
    <Table aria-label="장소 목록">
      <TableHeader className="bg-background-subtle/70">
        <TableRow className="hover:bg-transparent">
          <TableHead className={HEAD}>장소명</TableHead>
          {/* 휴대폰 폭에서는 확인 · 코스 생성 칸이 먼저 보이게 ID · 유형을 숨긴다 */}
          <TableHead className={cn(HEAD, "hidden sm:table-cell")}>ID</TableHead>
          <TableHead className={cn(HEAD, "hidden sm:table-cell")}>유형</TableHead>
          <TableHead className={HEAD}>권역</TableHead>
          <TableHead className={HEAD}>확인</TableHead>
          <TableHead className={HEAD}>코스 생성</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const reason = skipped.get(r.ID);
          return (
            <TableRow key={r.ID} className="hover:bg-accent/40">
              <TableCell className="px-4 py-3">
                <Button
                  variant="link"
                  className="h-auto px-0 text-sm font-bold"
                  onClick={() => {
                    onOpen(r);
                  }}
                >
                  {r.장소명 || "(이름 없음)"}
                </Button>
                {/* 마지막 칸은 좁아 빠진 이유는 이름 아래에 둔다 */}
                {reason && (
                  <p className="text-muted-foreground max-w-56 text-xs whitespace-normal">
                    {reason}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground hidden px-4 tabular-nums sm:table-cell">
                {r.ID}
              </TableCell>
              <TableCell className="hidden px-4 sm:table-cell">{r.유형}</TableCell>
              <TableCell className="px-4">{r.권역}</TableCell>
              <TableCell className="px-4">
                {r.확인상태 === "현장" || r.확인상태 === "전화" ? (
                  <VerifyBadge status={r.확인상태} />
                ) : (
                  <Badge variant="secondary">{r.확인상태 || "미확인"}</Badge>
                )}
              </TableCell>
              <TableCell className="px-4">
                {reason ? (
                  <span className="text-destructive flex items-center gap-2 font-semibold">
                    <span
                      aria-hidden="true"
                      className="bg-destructive size-2 shrink-0 rounded-full"
                    />
                    빠짐
                  </span>
                ) : (
                  <span className="text-success flex items-center gap-2 font-semibold">
                    <span aria-hidden="true" className="bg-success size-2 shrink-0 rounded-full" />
                    반영
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
