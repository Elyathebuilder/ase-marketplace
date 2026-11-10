"""
Builds the Bazari logo files from geometry, so every curve and gap is exact.

    pip install fonttools
    python3 tools/brand/build_logo.py path/to/noto-serif-latin-800-normal.woff

The lowercase "azari" is Noto Serif ExtraBold (SIL Open Font License), converted to
outlines, so no font is needed to show the logo. The "B" is drawn here: same stem and
serif weights as Noto Serif, but with two equal, square-ish counters so each can hold
the red rosette with an even margin all round.

All numbers are font units (cap height 714, y pointing up).
"""
import math
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
INK = "#17171a"    # --color-ink
RED = "#b3122a"    # --color-red-600, the brand red
PAPER = "#faf8f4"  # --color-paper
RED_ON_DARK = "#c8202f"  # --color-red-500, the same red one step lighter so it holds on near-black

CAP = 714
STEM_L, STEM_R = 117, 297       # stem, same 180 width as Noto Serif ExtraBold "B"
T = 66                          # horizontal strokes: top, waist and bottom
C = (CAP - 3 * T) / 2           # height of each counter (258): both bowls hold the same rosette
R_IN = C / 2                    # counters are a square with a semicircle on the right
CX = STEM_R + R_IN              # rosette / bowl centre x (426)
LOW_CY = T + R_IN               # 195
UP_CY = CAP - T - R_IN          # 519
UP_W, LOW_W = 128, 148          # right side of each bowl; the lower bowl is a little fuller, as in a classical B
PAD = 26                        # gap between rosette and letter, equal at top, bottom, left and right
R_ROSE = R_IN - PAD             # 103
SERIF_L = 24
B_ADVANCE = CX + R_IN + LOW_W + 46


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def waist():
    """Where the two outer bowl ellipses meet on the right."""
    ry = R_IN + T
    ra, rb = R_IN + UP_W, R_IN + LOW_W
    lo, hi = LOW_CY, UP_CY
    for _ in range(80):
        y = (lo + hi) / 2
        xa = ra * math.sqrt(max(0, 1 - ((y - UP_CY) / ry) ** 2))
        xb = rb * math.sqrt(max(0, 1 - ((y - LOW_CY) / ry) ** 2))
        if xa > xb:
            hi = y
        else:
            lo = y
    return CX + xa, y


def b_path(fy):
    """The letter B with its two counters (even-odd). fy maps font y to SVG y."""
    ry = R_IN + T
    wx, wy = waist()
    br = 54  # bracket radius where the serifs meet the stem
    st = T - 6  # serif thickness at the left
    d = [
        f"M{f(SERIF_L)} {f(fy(0))}",
        f"V{f(fy(st))}H{f(STEM_L - br + 7)}Q{f(STEM_L)} {f(fy(st))} {f(STEM_L)} {f(fy(st + br))}",
        f"V{f(fy(CAP - st - br))}Q{f(STEM_L)} {f(fy(CAP - st))} {f(STEM_L - br + 7)} {f(fy(CAP - st))}",
        f"H{f(SERIF_L)}V{f(fy(CAP))}H{f(CX)}",
        f"A{f(R_IN + UP_W)} {f(ry)} 0 0 1 {f(wx)} {f(fy(wy))}",
        f"A{f(R_IN + LOW_W)} {f(ry)} 0 0 1 {f(CX)} {f(fy(0))}Z",
    ]
    for cy in (UP_CY, LOW_CY):
        top, bot = cy + R_IN, cy - R_IN
        d.append(f"M{f(STEM_R)} {f(fy(bot))}H{f(CX)}A{f(R_IN)} {f(R_IN)} 0 0 0 {f(CX)} {f(fy(top))}H{f(STEM_R)}Z")
    return "".join(d)


def star(cx, cy, r, step=2):
    """
    Eight-pointed star with its outer points on radius r, one pointing straight up.
    step=2 is two overlapping squares; step=3 is the sharper star of eight crossing lines.
    """
    inner = r * math.cos(step * math.pi / 8) / math.cos(math.pi / 8)
    pts = []
    for i in range(16):
        a = i * math.pi / 8 - math.pi / 2
        rr = r if i % 2 == 0 else inner
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"


def circle(cx, cy, r):
    return f"M{f(cx - r)} {f(cy)}a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0Z"


def rosette(cx, cy, detail):
    """
    The ornament inside each bowl, drawn as one even-odd shape (holes show the background).
    full:  star outline holding a sharp eight-pointed sun with an open centre (large sizes, print)
    mid:   solid star with an open centre (website header)
    small: solid star (favicon, 16–32 px)
    """
    r = R_ROSE
    if detail == "small":
        return star(cx, cy, r)
    if detail == "mid":
        return star(cx, cy, r) + circle(cx, cy, r * 0.30)
    band = 15  # width of the outline, measured square to its edges
    return (
        star(cx, cy, r)
        + star(cx, cy, r - band * math.sqrt(2))
        + star(cx, cy, r * 0.62, 3)
        + circle(cx, cy, r * 0.16)
    )


def glyph_paths(font_path, text, x0, tracking):
    font = TTFont(font_path)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    x = x0
    out = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=f)
        gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, CAP)))
        out.append(pen.getCommands())
        x += gs[name].width + tracking
    return out, x - tracking


def svg(view, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{body}</svg>\n"
    )


def main(font_path):
    fy = lambda y: CAP - y  # noqa: E731
    letters, right = glyph_paths(font_path, "azari", B_ADVANCE - 10, 14)
    width = right + 10
    b = b_path(fy)
    roses = {d: rosette(CX, fy(UP_CY), d) + rosette(CX, fy(LOW_CY), d) for d in ("full", "mid", "small")}
    word = "".join(letters)
    pad = 24
    view = f"{-pad + SERIF_L} {-pad - 60} {f(width - SERIF_L + 2 * pad)} {f(CAP + 2 * pad + 70)}"

    out = ROOT / "public" / "brand"
    out.mkdir(parents=True, exist_ok=True)

    def logo(name, letter_fill, rose_fill, detail, bg=None):
        body = ""
        if bg:
            body += f'<rect x="-1000" y="-1000" width="5000" height="3000" fill="{bg}"/>'
        body += f'<path fill="{letter_fill}" fill-rule="evenodd" d="{b}"/>'
        body += f'<path fill="{rose_fill}" fill-rule="evenodd" d="{roses[detail]}"/>'
        body += f'<path fill="{letter_fill}" d="{word}"/>'
        (out / name).write_text(svg(view, body, "Bazari"))

    logo("bazari-logo.svg", INK, RED, "full")
    logo("bazari-logo-mono.svg", INK, INK, "full")
    logo("bazari-logo-white.svg", "#fff", "#fff", "full")
    logo("bazari-logo-reverse.svg", "#fff", RED_ON_DARK, "full")

    # The B on its own, for icons. The mark sits on paper so it also works in dark browser tabs.
    def mark(path, detail, size=1000, radius=0.22, with_bg=True, scale=0.74):
        bw = B_ADVANCE - 46 - SERIF_L
        s = size * scale / CAP
        tx = (size - bw * s) / 2 - SERIF_L * s
        ty = (size - CAP * s) / 2
        body = ""
        if with_bg:
            body += f'<rect width="{size}" height="{size}" rx="{f(size * radius)}" fill="{PAPER}"/>'
        body += f'<g transform="translate({f(tx)} {f(ty)}) scale({s:.5f})">'
        body += f'<path fill="{INK}" fill-rule="evenodd" d="{b}"/>'
        body += f'<path fill="{RED}" fill-rule="evenodd" d="{roses[detail]}"/></g>'
        path.write_text(svg(f"0 0 {size} {size}", body, "Bazari"))

    mark(out / "bazari-mark.svg", "full", with_bg=False, scale=0.86)
    mark(out / "bazari-app-icon.svg", "full", radius=0.0, scale=0.62)
    mark(ROOT / "src" / "app" / "icon.svg", "small", scale=0.8, radius=0.2)

    # Tight box around the ink, for the website header (no built-in margin).
    top = CAP - 774  # top of the i dot
    tight = f"{SERIF_L} {top} {f(right - SERIF_L)} {f(CAP + 10 - top)}"
    ts = ROOT / "src" / "components" / "brand" / "paths.ts"
    ts.parent.mkdir(parents=True, exist_ok=True)
    ts.write_text(
        "/* Generated by tools/brand/build_logo.py. Do not edit by hand. */\n"
        f'export const VIEWBOX = "{tight}";\n'
        f'export const B_PATH = "{b}";\n'
        f'export const LETTERS_PATH = "{word}";\n'
        "/** Rosette detail by size: full above ~100 px cap height, mid for 40–100 px, small below. */\n"
        "export const ROSETTES = {\n"
        f'  full: "{roses["full"]}",\n'
        f'  mid: "{roses["mid"]}",\n'
        f'  small: "{roses["small"]}",\n'
        "} as const;\n"
    )

    # Raster copies for places that need PNG (Apple touch icon, link previews, social profiles).
    try:
        import cairosvg
    except ImportError:
        print("cairosvg not installed: PNG files not updated")
    else:
        png = lambda src, dst, w, h=None: cairosvg.svg2png(  # noqa: E731
            bytestring=src.encode(), write_to=str(dst), output_width=w, output_height=h
        )
        mark(out / "_apple.svg", "mid", radius=0.0, scale=0.66)
        png((out / "_apple.svg").read_text(), ROOT / "src" / "app" / "apple-icon.png", 180)
        (out / "_apple.svg").unlink()
        png((out / "bazari-app-icon.svg").read_text(), out / "bazari-profile-1024.png", 1024)
        # Link preview: logo centred on paper, 1200 x 630.
        lw = 760
        lh = lw * (CAP + 10 - top) / (right - SERIF_L)
        og = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="{PAPER}"/>'
            f'<svg x="{f((1200 - lw) / 2)}" y="{f((630 - lh) / 2)}" width="{lw}" height="{f(lh)}" viewBox="{tight}">'
            f'<path fill="{INK}" fill-rule="evenodd" d="{b}"/><path fill="{RED}" fill-rule="evenodd" d="{roses["full"]}"/>'
            f'<path fill="{INK}" d="{word}"/></svg>'
            f'<rect x="0" y="618" width="1200" height="12" fill="{RED}"/></svg>'
        )
        png(og, out / "bazari-og.png", 1200, 630)

    print("viewBox", tight, "B advance", B_ADVANCE, "waist", waist())


if __name__ == "__main__":
    main(sys.argv[1])
