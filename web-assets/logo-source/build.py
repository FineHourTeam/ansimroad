# 로고 SVG 원본 생성 — 심볼(핀 · 해 · 물결 길)과 글자 로고('안심로드' Pretendard 800 윤곽선)를 한 번에 만든다.
# 글자는 path로 굳힌다: <img>로 띄운 SVG는 페이지의 웹폰트를 못 쓰기 때문이다.
# 실행: python web-assets/logo-source/build.py  (fontTools + brotli 필요) → 이어서 node web-assets/generate.mjs
# 출력: public/brand/{mark,mark-white,logo,logo-white}.svg · public/favicon.svg · web-assets/logo-source/logo.svg(앱 아이콘)
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[2]
TEAL, SAND, WHITE = "#0F766E", "#F7C548", "#FFFFFF"  # tokens.css --primary · --highlight
PIN = "M32 61C27 56 8 43 8 27a24 24 0 0 1 48 0c0 16-19 29-24 34z"
WAVE = "M-5 35c5 4.5 10 4.5 15 0s10-4.5 15 0 10 4.5 15 0 10-4.5 15 0 10 4.5 15 0"
WORD, WEIGHT, TRACK = "안심로드", 800, -0.03  # 자간 -3%
WORD_H, WORD_X, WORD_CY = 33.0, 69, 31  # 글자 높이 · 시작 x · 세로 중심 (심볼 64 기준, 핀 머리 중심에 맞춤)


def mark(pin, sun, wave, uid):
    # 핀 안에 해가 지고, 물결 길이 해 아랫부분을 가린다. 물결은 핀 모양으로 잘라 바다 수평선처럼
    return (
        f'<defs><clipPath id="{uid}"><path d="{PIN}"/></clipPath></defs>'
        f'<path d="{PIN}" fill="{pin}" stroke="{pin}" stroke-width="4" stroke-linejoin="round"/>'
        f'<circle cx="32" cy="25" r="10.5" fill="{sun}"/>'
        f'<g clip-path="url(#{uid})" fill="none" stroke-linecap="round">'
        f'<path d="{WAVE}" stroke="{pin}" stroke-width="10"/><path d="{WAVE}" stroke="{wave}" stroke-width="6"/></g>'
    )


def wordmark():
    font = instantiateVariableFont(TTFont(ROOT / "public/fonts/PretendardVariable.woff2"), {"wght": WEIGHT})
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    pen, bounds, x = SVGPathPen(glyphs), BoundsPen(glyphs), 0.0
    for i, ch in enumerate(WORD):
        g = cmap[ord(ch)]
        glyphs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        glyphs[g].draw(TransformPen(bounds, (1, 0, 0, -1, x, 0)))
        x += hmtx[g][0] + (TRACK * font["head"].unitsPerEm if i < len(WORD) - 1 else 0)
    x0, y0, x1, y1 = bounds.bounds
    s = WORD_H / (y1 - y0)
    tf = f"translate({WORD_X - x0 * s:.3f} {WORD_CY - (y0 + y1) / 2 * s:.3f}) scale({s:.6f})"
    return pen.getCommands(), tf, round(WORD_X + (x1 - x0) * s + 2, 2)


def svg(vb, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{body}</svg>\n'


d, tf, width = wordmark()
word = lambda color: f'<path fill="{color}" transform="{tf}" d="{d}"/>'
color, white = mark(TEAL, SAND, WHITE, "m"), mark(WHITE, SAND, TEAL, "m")
out = {
    "public/brand/mark.svg": svg("0 0 64 64", color),
    "public/brand/mark-white.svg": svg("0 0 64 64", white),
    "public/brand/logo.svg": svg(f"0 0 {width} 64", color + word(TEAL)),
    "public/brand/logo-white.svg": svg(f"0 0 {width} 64", white + word(WHITE)),
    "public/favicon.svg": svg("0 0 64 64", color),
    # 앱 아이콘: 청록 둥근 사각형 위 흰 핀 (70%, 광학 중심)
    "web-assets/logo-source/logo.svg": svg(
        "0 0 64 64",
        f'<rect width="64" height="64" rx="14" fill="{TEAL}"/>'
        f'<g transform="translate(9.6 9.2) scale(0.7)">{mark(WHITE, SAND, TEAL, "a")}</g>',
    ),
}
for path, text in out.items():
    (ROOT / path).write_text(text, encoding="utf8")
print("로고 SVG 생성:", ", ".join(out))
