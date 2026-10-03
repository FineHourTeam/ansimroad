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
import type { PlaceRecord } from "@/shared/data/placeRecords";

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
      <TableHeader>
        <TableRow>
          <TableHead>장소명</TableHead>
          {/* 휴대폰 폭에서는 확인 · 코스 생성 칸이 먼저 보이게 ID · 유형을 숨긴다 */}
          <TableHead className="hidden sm:table-cell">ID</TableHead>
          <TableHead className="hidden sm:table-cell">유형</TableHead>
          <TableHead>권역</TableHead>
          <TableHead>확인</TableHead>
          <TableHead>코스 생성</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const reason = skipped.get(r.ID);
          return (
            <TableRow key={r.ID}>
              <TableCell>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    onOpen(r);
                  }}
                >
                  {r.장소명 || "(이름 없음)"}
                </Button>
              </TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">{r.ID}</TableCell>
              <TableCell className="hidden sm:table-cell">{r.유형}</TableCell>
              <TableCell>{r.권역}</TableCell>
              <TableCell>
                {r.확인상태 === "현장" || r.확인상태 === "전화" ? (
                  <VerifyBadge status={r.확인상태} />
                ) : (
                  <Badge variant="secondary">{r.확인상태 || "미확인"}</Badge>
                )}
              </TableCell>
              <TableCell className="whitespace-normal">
                {reason ? (
                  <span className="text-destructive font-semibold">빠짐 · {reason}</span>
                ) : (
                  <span className="text-success">반영</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
