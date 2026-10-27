# 로고 SVG 원본 생성 — 심볼(모담 최종안 '목포 하루' 2026-10-27: 지도 핀 안에 해 · 유달산 두 봉우리 · 목포 바다)과
# 글자 로고('안심로드' Pretendard 800 윤곽선)를 한 번에 만든다. 글자는 path로 굳힌다: <img>로 띄운 SVG는 페이지의 웹폰트를 못 쓰기 때문이다.
# 심볼 원본: 모담 전달 ansimroad_logo_color.svg (512 상자). 흰색판은 컬러판에서 만든다 (청록 바탕 흰색 반전 — 안쪽 그림은 바탕색이 비친다).
# 실행: python web-assets/logo-source/build.py  (fontTools + brotli 필요) → 이어서 node web-assets/generate.mjs
# 출력: public/brand/{mark,mark-white,logo,logo-white}.svg · public/favicon.svg · web-assets/logo-source/logo.svg(앱 아이콘)
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[2]
# 모담 로고 색 (시안 명시값): 청록 · 산 · 바다 · 노을 · 크림. 글자는 시안의 먹색
TEAL, HILL, SEA, SUN, CREAM, INK, WHITE = "#2E7A72", "#3F8E4A", "#1F5F99", "#F0B44C", "#F6F2EA", "#1F2421", "#FFFFFF"
PIN = "M243.9 469.2 L120.3 327.2 A180 180 0 1 1 391.7 327.2 L268.1 469.2 A16 16 0 0 1 243.9 469.2 Z"
HILLS = "M96 250 L118 234 Q170 142 222 206 Q258 246 294 206 Q340 156 394 228 L440 248 L440 420 L96 420 Z"
WAVE = "M60 280 C96 273 136 273 176 280 S256 287 296 280 S376 273 416 280 S496 287 536 280"
WORD, WEIGHT, TRACK = "안심로드", 800, -0.03  # 자간 -3%
WORD_H, WORD_X, WORD_CY = 33.0, 69, 31  # 글자 높이 · 시작 x · 세로 중심 (심볼 64 기준, 핀 머리 중심에 맞춤)


def mark(pin, disc, hill, sea, sun, line, uid):
    # 512 상자 그림을 64 상자로 줄여 넣는다 (핀 x 76~436 · y 29~469). line = 능선 · 물결의 밝은 선, disc = 핀 안 바탕
    return (
        f'<defs><clipPath id="{uid}"><circle cx="256" cy="209" r="130"/></clipPath></defs>'
        f'<g transform="scale(0.125)">'
        f'<path d="{PIN}" fill="{pin}"/>'
        f'<circle cx="256" cy="209" r="124" fill="{disc}"/>'
        f'<g clip-path="url(#{uid})">'
        f'<circle cx="258" cy="178" r="56" fill="{sun}"/>'
        f'<path d="{HILLS}" fill="{line}" stroke="{line}" stroke-width="32" stroke-linejoin="round"/>'
        f'<path d="{HILLS}" fill="{hill}"/>'
        f'<path d="{WAVE}" transform="translate(0 -11)" fill="none" stroke="{line}" stroke-width="22"/>'
        f'<path d="{WAVE} L536 420 L60 420 Z" fill="{sea}"/>'
        f"</g>"
        f'<circle cx="256" cy="209" r="130" fill="none" stroke="{pin}" stroke-width="12"/>'
        f"</g>"
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
# 컬러판: 시안 그대로. 흰색판(청록 바탕): 핀 · 해 · 능선 · 물결은 흰색, 바탕 · 산 · 바다는 바탕색이 비친다
color = mark(TEAL, CREAM, HILL, SEA, SUN, CREAM, "m")
white = lambda bg, uid="m": mark(WHITE, bg, bg, bg, WHITE, WHITE, uid)
out = {
    "public/brand/mark.svg": svg("0 0 64 64", color),
    "public/brand/mark-white.svg": svg("0 0 64 64", white("#0F766E")),  # tokens.css --primary (청록 히어로 · 사진 위)
    "public/brand/logo.svg": svg(f"0 0 {width} 64", color + word(INK)),
    "public/brand/logo-white.svg": svg(f"0 0 {width} 64", white("#0F766E") + word(WHITE)),
    "public/favicon.svg": svg("0 0 64 64", color),
    # 앱 아이콘: 크림 둥근 사각형 위 컬러 핀 (80%, 가운데)
    "web-assets/logo-source/logo.svg": svg(
        "0 0 64 64",
        f'<rect width="64" height="64" rx="14" fill="{CREAM}"/>'
        f'<g transform="translate(6.4 7.1) scale(0.8)">{mark(TEAL, CREAM, HILL, SEA, SUN, CREAM, "a")}</g>',
    ),
}
for path, text in out.items():
    (ROOT / path).write_text(text, encoding="utf8")
print("로고 SVG 생성:", ", ".join(out), f"(글자 로고 폭 {width})")
