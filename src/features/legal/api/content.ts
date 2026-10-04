// 정적 문서 (F-27): public/content/*.md 파일 하나만 고치면 문구가 바뀐다.
export async function fetchContent(file: string): Promise<string> {
  const r = await fetch(file, { cache: "no-cache" });
  if (!r.ok) throw new Error(`문서를 읽지 못했어요 (${String(r.status)})`);
  return r.text();
}
