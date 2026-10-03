// 코스 생성에서 빠진 장소 (시트와 같은 규칙에 걸린 행) — 이유와 함께, 눌러서 바로 고친다
import { WarningIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlaceRecord } from "@/shared/data/placeRecords";
import type { RowIssue } from "@/shared/domain/types";

export function SkippedReport({
  skipped,
  records,
  onOpen,
}: {
  skipped: RowIssue[];
  records: PlaceRecord[];
  onOpen: (r: PlaceRecord) => void;
}) {
  if (skipped.length === 0) return null;
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <WarningIcon size="sm" />
          코스 생성에서 빠진 장소 {skipped.length}곳
        </CardTitle>
        <CardDescription>
          시트와 같은 규칙에 걸려 코스에 나오지 않아요. 눌러서 고치고 저장하면 바로 들어가요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1">
          {skipped.map((s) => {
            const rec = records.find((r) => r.ID === s.id);
            return (
              <li key={`${s.id}-${String(s.row)}`} className="flex flex-wrap items-center gap-x-2">
                {rec ? (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      onOpen(rec);
                    }}
                  >
                    {rec.장소명 || "(이름 없음)"} · {s.id}
                  </Button>
                ) : (
                  <span className="font-semibold">{s.id || "(ID 없음)"}</span>
                )}
                <span className="text-muted-foreground text-sm">{s.reason}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
