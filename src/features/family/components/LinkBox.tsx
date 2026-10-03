// 링크 주소를 자르지 않고 보여 주고, 누르면 복사한다 (S3 · S5 보내기 카드)
import { CopyIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { copyLink, displayUrl } from "../lib/links";

export function LinkBox({
  url,
  label,
  sub,
  doneText,
}: {
  url: string;
  label: string;
  sub?: string;
  doneText: string;
}) {
  const shown = displayUrl(url);
  return (
    <Button
      variant="outline"
      className="h-auto min-h-16 w-full flex-col gap-1 px-4 py-3 whitespace-normal"
      aria-label={`${label}: ${shown}`}
      onClick={() => void copyLink(url, doneText)}
    >
      <span className="text-base font-bold break-all">{shown}</span>
      {sub && <span className="text-muted-foreground text-sm">{sub}</span>}
      <span className="text-primary flex items-center gap-1 text-sm font-semibold">
        <CopyIcon size="sm" />
        누르면 복사
      </span>
    </Button>
  );
}
