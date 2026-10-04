// 링크 토큰: 영문 대소문자·숫자 62종에서 암호학적 난수로 뽑는다 (F-14, N-04: 8자 이상·추측 불가).
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function randomToken(length = 10): string {
  const out: string[] = [];
  const buf = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (const b of buf) {
      // 248 이상은 버려서 모듈로 편향을 없앤다 (62 × 4 = 248)
      if (b < 248 && out.length < length) out.push(ALPHABET.charAt(b % 62));
    }
  }
  return out.join("");
}
