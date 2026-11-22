#!/usr/bin/env python3
"""JWJProjects UI/UX 撞臉檢查（只用標準函式庫；grid 子指令需 Pillow）。

用法：
  python3 uiux_audit.py contrast "#1E2328" "#EEF0EC" ["#fg" "#bg" ...]
  python3 uiux_audit.py fingerprint <repo_dir>
  python3 uiux_audit.py compare <repo_dir> <repo_dir> [...]     # 不通過時 exit 1
  python3 uiux_audit.py grid out.jpg <img> <img> [...]           # 截圖拼貼，供人眼比對

指紋只讀 repo 根目錄與一層子目錄的 *.css / *.html，不執行任何專案程式碼。
"""
import colorsys, json, math, re, sys
from itertools import combinations
from pathlib import Path

# ---------- 色彩 ----------
HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")


def parse_hex(h):
    h = h.lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return r, g, b, a


def rel_lum(r, g, b):
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(fg, bg):
    l1 = rel_lum(*parse_hex(fg)[:3])
    l2 = rel_lum(*parse_hex(bg)[:3])
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def cmd_contrast(args):
    if len(args) < 2 or len(args) % 2:
        sys.exit("需要成對的 前景 背景 色碼")
    bad = 0
    for fg, bg in zip(args[::2], args[1::2]):
        c = contrast(fg, bg)
        lv = "AAA" if c >= 7 else "AA" if c >= 4.5 else "AA-large/UI" if c >= 3 else "FAIL"
        bad += lv == "FAIL"
        print(f"{fg} on {bg}: {c:5.2f}:1  {lv}")
    sys.exit(1 if bad else 0)


# ---------- 讀檔 ----------
def collect(repo):
    repo = Path(repo)
    files = [p for pat in ("*.css", "*.html") for p in repo.glob(pat)]
    files += [p for pat in ("*/*.css", "*/*.html") for p in repo.glob(pat)
              if not any(part in {"node_modules", ".git", "tests", "test"} for part in p.parts)]
    css = "\n".join(p.read_text("utf-8", "ignore") for p in files if p.suffix == ".css")
    html = "\n".join(p.read_text("utf-8", "ignore") for p in files if p.suffix == ".html")
    css += "\n" + "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S))
    return css, html


RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")


def rules(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for sel, body in RULE.findall(css):
        yield sel.strip(), body


def decl(body, prop):
    m = re.findall(r"(?:^|;)\s*" + prop + r"\s*:\s*([^;]+)", body)
    return m[-1].strip() if m else None


def resolve_vars(css):
    return dict(re.findall(r"(--[\w-]+)\s*:\s*([^;}]+)", css))


def color_of(value, vars_):
    if not value:
        return None
    m = re.search(r"var\((--[\w-]+)", value)
    if m and m.group(1) in vars_:
        value = vars_[m.group(1)]
    m = HEX.search(value)
    return "#" + m.group(1) if m else None


def hls(hexc):
    r, g, b, _ = parse_hex(hexc)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, l, s


# ---------- 指紋 ----------
MOTIFS = {
    "dark_header_mint_logo": "深色頂欄／側欄＋綠色系方塊 logo",
    "mono_caps_eyebrow": "等寬加字距 eyebrow 小標",
    "h1_colored_span": "巨型 H1 局部上色",
    "kpi_row_4": "首屏 4 格 KPI 卡",
    "teal_green_brand": "墨綠／青／薄荷為品牌主色",
    "big_radius_cards": "14px 以上大圓角卡片",
    "status_dot": "綠點狀態燈",
}


def fingerprint(repo):
    css, html = collect(repo)
    vars_ = resolve_vars(css)
    R = list(rules(css))

    # 色相分布（飽和色）
    hues = [0.0] * 12
    sat_colors = []
    for m in HEX.finditer(css):
        h, l, s = hls("#" + m.group(1))
        if s > 0.25 and 0.12 < l < 0.9:
            hues[int(h // 30) % 12] += 1
            sat_colors.append((h, l, s))
    tot = sum(hues) or 1
    hue_hist = [round(x / tot, 3) for x in hues]

    # 字體
    fams = set()
    for fam in re.findall(r"font(?:-family)?\s*:\s*([^;}]+)", css):
        f = fam.lower()
        if "var(" in f:
            continue
        if any(k in f for k in ("kai", "楷")):
            fams.add("kai")
        if any(k in f for k in ("serif tc", "serif cjk", "mingliu", "source han serif", "georgia")) or re.search(r"(^|,)\s*serif\b", f):
            fams.add("serif")
        if "mono" in f or "consolas" in f:
            fams.add("mono")
        if "sans" in f or "system-ui" in f or "jhenghei" in f or "pingfang" in f or "inter" in f:
            fams.add("sans")
    for v in vars_.values():
        lv = v.lower()
        if "mono" in lv or "consolas" in lv:
            fams.add("mono")
        if "serif tc" in lv or "mingliu" in lv or "serif cjk" in lv:
            fams.add("serif")
        if "kai" in lv:
            fams.add("kai")
        if "sans" in lv or "system-ui" in lv or "jhenghei" in lv:
            fams.add("sans")

    # 圓角
    radii = []
    for r in re.findall(r"border-radius\s*:\s*([0-9.]+)px", css):
        radii.append(float(r))
    radii.sort()
    radius_med = radii[len(radii) // 2] if radii else 0.0

    # 字級
    fs_base = None
    for sel, body in R:
        if re.search(r"(^|,)\s*(body|:root|html)\s*$", sel):
            v = decl(body, "font-size") or decl(body, "font")
            if v:
                m = re.search(r"([0-9.]+)px", v)
                if m:
                    fs_base = float(m.group(1))

    motifs = {k: False for k in MOTIFS}
    for sel, body in R:
        s = sel.lower()
        bg = color_of(decl(body, "background") or decl(body, "background-color"), vars_)
        if re.search(r"(^|[\s.,#])(top|header|brandbar|topbar|masthead|sidebar|side|nav)\b", s) and bg:
            if rel_lum(*parse_hex(bg)[:3]) < 0.06:
                motifs["_dark_header"] = True
        if re.search(r"logo|brand-mark|brandicon|symbol|brand-icon", s) and bg:
            h, l, sat = hls(bg)
            if 60 <= h <= 175 and l > 0.6:
                motifs["_green_logo"] = True
        font = (decl(body, "font") or "") + (decl(body, "font-family") or "")
        ls = decl(body, "letter-spacing") or ""
        m = re.search(r"([0-9.]+)em", ls)
        if ("mono" in font.lower() or "var(--mono)" in font) and m and float(m.group(1)) >= 0.08:
            motifs["mono_caps_eyebrow"] = True
        if re.search(r"h1\s+span", s) and decl(body, "color"):
            motifs["h1_colored_span"] = True
        gtc = decl(body, "grid-template-columns") or ""
        if "repeat(4" in gtc.replace(" ", "") and re.search(r"kpi|metric|stat|summary|cards", s):
            motifs["kpi_row_4"] = True
        if re.search(r"border-radius\s*:\s*(50%|100%|999px)", body):
            w = re.search(r"(?:^|;)\s*width\s*:\s*([0-9.]+)px", body)
            if w and float(w.group(1)) <= 10 and bg:
                h, l, sat = hls(bg)
                if 70 <= h <= 175:
                    motifs["status_dot"] = True
    if re.search(r"id=[\"']kpis[\"']|class=[\"'][^\"']*\b(kpis|metrics)\b", html):
        motifs["kpi_row_4"] = True
    motifs["dark_header_mint_logo"] = bool(motifs.pop("_dark_header", False) and motifs.pop("_green_logo", False))
    motifs.pop("_dark_header", None); motifs.pop("_green_logo", None)
    green_share = sum(hue_hist[i] for i in (2, 3, 4, 5))  # 60°–180°
    motifs["teal_green_brand"] = green_share >= 0.45
    motifs["big_radius_cards"] = sum(1 for r in radii if r >= 14) >= 3

    return {
        "repo": Path(repo).name,
        "hue_hist_30deg": hue_hist,
        "dominant_hue_bins": [i * 30 for i, v in sorted(enumerate(hue_hist), key=lambda x: -x[1])[:2] if v > 0.15],
        "font_families": sorted(fams),
        "radius_median_px": radius_med,
        "font_size_base_px": fs_base,
        "legacy_motifs": [k for k, v in motifs.items() if v],
    }


def cosine(a, b):
    na = math.sqrt(sum(x * x for x in a)); nb = math.sqrt(sum(x * x for x in b))
    return sum(x * y for x, y in zip(a, b)) / (na * nb) if na and nb else 0.0


def jacc(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a | b else 0.0


def rbucket(r):
    return 0 if r <= 1 else 1 if r <= 4 else 2 if r <= 9 else 3


def similarity(f1, f2):
    parts = {
        "hue": cosine(f1["hue_hist_30deg"], f2["hue_hist_30deg"]),
        "motif": jacc(f1["legacy_motifs"], f2["legacy_motifs"]),
        "font": jacc(f1["font_families"], f2["font_families"]),
        "radius": 1.0 if rbucket(f1["radius_median_px"]) == rbucket(f2["radius_median_px"]) else 0.0,
    }
    score = 0.35 * parts["hue"] + 0.35 * parts["motif"] + 0.15 * parts["font"] + 0.15 * parts["radius"]
    return score, parts


PAIR_LIMIT = 0.55      # 任兩案相似度上限
MOTIF_LIMIT = 1        # 每案最多保留的共同指紋數


def cmd_compare(repos):
    fps = [fingerprint(r) for r in repos]
    fail = False
    print("## 各案指紋")
    for f in fps:
        n = len(f["legacy_motifs"])
        flag = "FAIL" if n > MOTIF_LIMIT else "ok"
        fail |= n > MOTIF_LIMIT
        print(f"- {f['repo']}: 主色相 {f['dominant_hue_bins']}°  字族 {f['font_families']}  "
              f"圓角中位 {f['radius_median_px']}px  基準字 {f['font_size_base_px']}px")
        print(f"    共同指紋 {n} 項 [{flag}]: " + ("、".join(MOTIFS[m] for m in f["legacy_motifs"]) or "無"))
    print(f"\n## 兩兩相似度（上限 {PAIR_LIMIT}）")
    for a, b in combinations(fps, 2):
        s, p = similarity(a, b)
        flag = "FAIL" if s > PAIR_LIMIT else "ok"
        fail |= s > PAIR_LIMIT
        print(f"- {a['repo']} × {b['repo']}: {s:.2f} [{flag}]  "
              f"(色相 {p['hue']:.2f} / 指紋 {p['motif']:.2f} / 字族 {p['font']:.2f} / 圓角 {p['radius']:.0f})")
    print("\n結果：" + ("不通過" if fail else "通過"))
    sys.exit(1 if fail else 0)


def cmd_grid(args):
    try:
        from PIL import Image
    except ImportError:
        sys.exit("grid 需要 Pillow：pip install pillow")
    out, imgs = args[0], args[1:]
    tiles = []
    for p in imgs:
        im = Image.open(p).convert("RGB")
        im = im.resize((800, int(800 * im.height / im.width)))
        tiles.append(im.crop((0, 0, 800, min(600, im.height))))
    cols = 2
    rows = math.ceil(len(tiles) / cols)
    sheet = Image.new("RGB", (800 * cols, 600 * rows), "white")
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 800, (i // cols) * 600))
    sheet.save(out, quality=82)
    print(out)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "contrast":
        cmd_contrast(args)
    elif cmd == "fingerprint":
        print(json.dumps(fingerprint(args[0]), ensure_ascii=False, indent=2))
    elif cmd == "compare":
        cmd_compare(args)
    elif cmd == "grid":
        cmd_grid(args)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
