// 정적 페이지 2개 (F-27): 개인정보 처리방침 · 위치정보 이용약관.
// 문법은 제목 ##, 목록 -, 인용 >, 문단만 쓴다 (# 제목은 상단 바에 표시).
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useLegalDoc } from "../hooks/useLegalDoc";
import { paths } from "@/app/paths";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Loading, PageBody, StateMessage, TopBar } from "@/shared/components/common";

const DOCS = {
  privacy: { title: "개인정보 처리방침", file: "/content/privacy.md" },
  "location-terms": { title: "위치정보 이용약관", file: "/content/location-terms.md" },
} as const;

function renderMarkdown(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length === 0) return;
    const items = list;
    out.push(
      <ul key={`ul-${String(out.length)}`} className="my-3 list-disc space-y-1 pl-5">
        {items.map((li, i) => (
          <li key={i}>{li}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flush();
    if (line === "" || line.startsWith("# ")) continue;
    const key = String(out.length);
    if (line.startsWith("## "))
      out.push(
        <h2 key={key} className="mt-8 mb-2 text-lg font-bold">
          {line.slice(3)}
        </h2>,
      );
    else if (line.startsWith("> "))
      out.push(
        <p
          key={key}
          className="bg-background-subtle text-muted-foreground my-3 rounded-lg p-3 text-sm"
        >
          {line.slice(2)}
        </p>,
      );
    else
      out.push(
        <p key={key} className="my-2 leading-relaxed">
          {line}
        </p>,
      );
  }
  flush();
  return out;
}

export function LegalPage({ doc }: { doc: keyof typeof DOCS }) {
  const meta = DOCS[doc];
  const navigate = useNavigate();
  const q = useLegalDoc(meta.file);
  return (
    <>
      <Seo title={meta.title} />
      <TopBar
        title={meta.title}
        back={() => {
          if (window.history.length > 1) void navigate(-1);
          else void navigate(paths.home);
        }}
      />
      <PageBody>
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <StateMessage title="문서를 불러오지 못했어요">
            <p className="text-muted-foreground">잠시 후 다시 열어 주세요.</p>
            <Button size="xl" onClick={() => void q.refetch()}>
              다시 불러오기
            </Button>
          </StateMessage>
        ) : (
          <article data-testid="legal-doc">{renderMarkdown(q.data)}</article>
        )}
      </PageBody>
    </>
  );
}
