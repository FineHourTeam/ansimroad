import { describe, expect, it } from "vitest";
import { imageFileName } from "./imageExport";

describe("imageFileName", () => {
  it("날짜 · 코스 이름으로 이름을 짓고 띄어쓰기는 '-' 로", () => {
    expect(imageFileName("2026-10-11", "바다 코스")).toBe("안심로드-2026-10-11-바다-코스.png");
  });

  it("파일 이름에 못 쓰는 글자는 지우고 '-' 가 겹치지 않게", () => {
    expect(imageFileName("2026-10-11", ' 엄마/아빠: "생신" 여행? ')).toBe(
      "안심로드-2026-10-11-엄마-아빠-생신-여행.png",
    );
  });

  it("이름이 비면 '코스'", () => {
    expect(imageFileName("2026-10-11", " / ")).toBe("안심로드-2026-10-11-코스.png");
  });
});
