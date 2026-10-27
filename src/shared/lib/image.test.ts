// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hasExif, stripExif } from "./image";

const seg = (marker: number, body: number[]) => [
  0xff,
  marker,
  (body.length + 2) >> 8,
  (body.length + 2) & 0xff,
  ...body,
];
const APP0 = seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 0x48, 0, 0x48, 0, 0]);
// iOS 사파리가 캔버스 JPEG 에 넣는 꼴: APP1 'Exif\0\0' + TIFF 머리
const EXIF = seg(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 0]);
const DQT = seg(0xdb, [0, ...Array<number>(64).fill(1)]);
const SOS = seg(0xda, [1, 1, 0, 0, 0x3f, 0]);
const DATA = [0x12, 0xff, 0x00, 0x34, 0xff, 0xd9];
const jpeg = (...parts: number[][]) =>
  new Blob([new Uint8Array([0xff, 0xd8, ...parts.flat()])], { type: "image/jpeg" });
const bytes = async (b: Blob) => [...new Uint8Array(await b.arrayBuffer())];

describe("stripExif — 캔버스 JPEG 에 남은 EXIF(APP1) 떼기", () => {
  it("APP1 만 빼고 나머지 머리 구간과 압축 데이터는 그대로", async () => {
    const src = jpeg(APP0, EXIF, DQT, SOS, DATA);
    expect(await hasExif(src)).toBe(true);
    const out = await stripExif(src);
    expect(await hasExif(out)).toBe(false);
    expect(await bytes(out)).toEqual([0xff, 0xd8, ...APP0, ...DQT, ...SOS, ...DATA]);
    expect(out.type).toBe("image/jpeg");
  });

  it("EXIF 가 없으면 같은 Blob 을 돌려준다", async () => {
    const src = jpeg(APP0, DQT, SOS, DATA);
    expect(await stripExif(src)).toBe(src);
  });

  it("JPEG 가 아니면 손대지 않는다", async () => {
    const src = new Blob([new Uint8Array([1, 2, 3, 4])]);
    expect(await stripExif(src)).toBe(src);
  });
});
