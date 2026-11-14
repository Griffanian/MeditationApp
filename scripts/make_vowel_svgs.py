"""Generate the Newman five-vowel diagrams (overview + one highlight per vowel) as standalone SVGs."""
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

W, H = 600, 760
CX, CY, S = 300, 330, 1.5  # centre and scale (panel geometry from the chat diagram, scaled)
HEB = "font-family:'SBL Hebrew','Times New Roman',serif"
SANS = "font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"


def p(x, y):
    return f"{CX + x * S:.1f},{CY + y * S:.1f}"


# Colours after Cordovero, Pardes Rimonim gate 10 (the gate of colours):
# Keter pure white; Chesed white tending to blue (silver); Gevurah red;
# Tiferet "yarok like egg yolk", which he calls exactly white and red combined; Malkhut, the Shekhinah, clothed in tekhelet
VOWELS = [
    dict(key="oh", n=1, col="#FFFFFF", ink="#12131F",
         poly=[(0, -150), (28, -90), (0, -104), (-28, -90)], g=(0, -62), glyph="אֹ",
         badge=(40, -135), lab=(0, -168), lab_anchor="middle", lab_lines=["Above · Ein Sof · Keter"],
         title="OH  ·  Ḥolam", move="Head up, then back to centre",
         focus="Receive from the Infinite, through the Crown"),
    dict(key="ah", n=2, col="#B9C8DA", ink="#12131F",
         poly=[(150, 0), (90, -28), (104, 0), (90, 28)], g=(60, 0), glyph="אַ",
         badge=(125, -45), lab=(150, 48), lab_anchor="end", lab_lines=["South · Mikha'el", "Chesed"],
         title="AH  ·  Pataḥ", move="Head to the right, then back",
         focus="Warmth and expansion · Chesed, the right pillar"),
    dict(key="eh", n=3, col="#D63B3B", ink="#FFFFFF",
         poly=[(-150, 0), (-90, -28), (-104, 0), (-90, 28)], g=(-60, 0), glyph="אֶ",
         badge=(-125, -45), lab=(-150, 48), lab_anchor="start", lab_lines=["North · Gavri'el", "Gevurah"],
         title="EH  ·  Segol", move="Head to the left, then back",
         focus="Coolness and containment · Gevurah, the left pillar"),
    dict(key="ee", n=4, col="#2E4593", ink="#FFFFFF",
         poly=[(0, 150), (28, 90), (0, 104), (-28, 90)], g=(0, 68), glyph="אִ",
         badge=(40, 135), lab=(0, 178), lab_anchor="middle", lab_lines=["Below · Shekhinah · Malkhut"],
         title="EE  ·  Ḥiriq", move="Head down, then back",
         focus="Settle into the body · the Shekhinah"),
    dict(key="oo", n=5, col="#F2A23C", ink="#3A2205",
         poly=None, g=(0, 0), glyph="וּ",
         badge=(26, -24), lab=(0, 36), lab_anchor="middle", lab_lines=["East · Uri'el · Tiferet"],
         title="OO  ·  Shuruq", move="Head forward, then back",
         focus="Gather at the centre · Tiferet, the Temple"),
]


def disc(cx, cy, r, v, extra=""):
    """A filled circle; a split vowel is drawn half and half (right half first colour, left half second)."""
    if not v.get("split"):
        return f'<circle cx="{cx}" cy="{cy}" r="{r:.0f}" fill="{v["col"]}"{extra}/>'
    right, left = v["split"]
    top, bot = f"{cx:.1f},{cy - r:.1f}", f"{cx:.1f},{cy + r:.1f}"
    return (f'<path d="M{top} A{r:.1f},{r:.1f} 0 0 1 {bot} Z" fill="{right}"/>'
            f'<path d="M{top} A{r:.1f},{r:.1f} 0 0 0 {bot} Z" fill="{left}"/>')


def vowel_svg(v, faded):
    op = ' opacity="0.18"' if faded else ""
    parts = [f"<g{op}>"]
    stroke = f' stroke="{v["stroke"]}" stroke-width="1"' if v.get("stroke") else ""
    if v["poly"]:
        parts.append(f'<polygon points="{" ".join(p(x, y) for x, y in v["poly"])}" fill="{v["col"]}"{stroke}/>')
        gx, gy = p(*v["g"]).split(",")
        parts.append(f'<text x="{gx}" y="{gy}" text-anchor="middle" dominant-baseline="central" fill="#EDEBE6" style="{HEB};font-size:56px">{v["glyph"]}</text>')
    else:
        parts.append(disc(CX, CY, 20 * S, v))
        parts.append(f'<text x="{CX}" y="{CY + 2}" text-anchor="middle" dominant-baseline="central" fill="{v["ink"]}" style="{HEB};font-size:38px">{v["glyph"]}</text>')
    bx, by = p(*v["badge"]).split(",")
    parts.append(disc(float(bx), float(by), 15, v, stroke))
    parts.append(f'<text x="{bx}" y="{float(by) + 1:.1f}" text-anchor="middle" dominant-baseline="central" fill="{v["ink"]}" style="{SANS};font-size:16px;font-weight:600">{v["n"]}</text>')
    lx, ly = p(*v["lab"]).split(",")
    for i, line in enumerate(v["lab_lines"]):
        parts.append(f'<text x="{lx}" y="{float(ly) + i * 18:.1f}" text-anchor="{v["lab_anchor"]}" fill="#A6A4B4" style="{SANS};font-size:14px">{line}</text>')
    parts.append("</g>")
    return "\n".join(parts)


def page(active=None):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
           f'<rect x="0" y="0" width="{W}" height="{H}" rx="24" fill="#12131F"/>',
           f'<text x="{CX}" y="34" text-anchor="middle" fill="#8A88A0" style="{SANS};font-size:14px;letter-spacing:1px">FACING EAST  ·  YOUR RIGHT IS SOUTH</text>']
    # faded ones first so the active vowel draws on top
    for v in VOWELS:
        if active and v["key"] != active:
            out.append(vowel_svg(v, True))
    for v in VOWELS:
        if not active or v["key"] == active:
            out.append(vowel_svg(v, False))
    if active:
        v = next(v for v in VOWELS if v["key"] == active)
        out.append(f'<text x="{CX}" y="664" text-anchor="middle" fill="{v.get("stroke", v["col"])}" style="{SANS};font-size:26px;font-weight:600">{v["n"]}  ·  {v["title"]}</text>')
        out.append(f'<text x="{CX}" y="698" text-anchor="middle" fill="#EDEBE6" style="{SANS};font-size:17px">{v["move"]}</text>')
        out.append(f'<text x="{CX}" y="726" text-anchor="middle" fill="#A6A4B4" style="{SANS};font-size:15px">{v["focus"]}</text>')
    else:
        out.append(f'<text x="{CX}" y="676" text-anchor="middle" fill="#EDEBE6" style="{SANS};font-size:20px;font-weight:600">OH → AH → EH → EE → OO</text>')
        out.append(f'<text x="{CX}" y="708" text-anchor="middle" fill="#A6A4B4" style="{SANS};font-size:15px">One vowel per easy outbreath · return to centre after each</text>')
        out.append(f'<text x="{CX}" y="736" text-anchor="middle" fill="#6E6C82" style="{SANS};font-size:13px">Colours after the Ramak, Pardes Rimonim, gate 10</text>')
    out.append("</svg>")
    return "\n".join(out)


(OUT / "overview.svg").write_text(page(), encoding="utf-8")
for v in VOWELS:
    (OUT / f"{v['key']}.svg").write_text(page(v["key"]), encoding="utf-8")
print("wrote", sorted(f.name for f in OUT.iterdir()))
