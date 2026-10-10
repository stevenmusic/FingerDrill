# 用官方 PDF 的文字(pdftotext -layout)跟 data/syllabus.json 逐級比對:每一級每一類列出的調、八度數、手、奏法要一致。
# 用法:python3 tools/build/crosscheck.py <ABRSM 2025&2026 PDF 轉的 txt> <Trinity PDF 轉的 txt>
# (PDF 有版權,不放進 repo;取得方式見 README「檢定資料」)
import json, re, sys, os
root = os.path.join(os.path.dirname(__file__), "..", "..")
SY = json.load(open(os.path.join(root, "data", "syllabus.json")))
abrsm_txt, trinity_txt = sys.argv[1], sys.argv[2]
bad = 0
def fail(m):
    global bad; bad += 1; print("✗ " + m)
def norm_key(k):
    k = k.strip().replace("+", "#").replace(" -", "b").replace("♯", "#").replace("♭", "b")
    return k.replace(" ", "")

# ── ABRSM:每一級的 SCALES AND ARPEGGIOS 區塊 ──
t = open(abrsm_txt).read()
blocks = re.findall(r"SCALES AND ARPEGGIOS: from memory(.*?)SIGHT-READING", t, re.S)
assert len(blocks) == 9, len(blocks)
SECT = [("SCALES A THIRD APART", "apart"), ("SCALES A SIXTH APART", "apart"), ("STACCATO SCALES", "scale"), ("SCALES (SIMILAR MOTION)", "scale"), ("SCALES", "scale"),
        ("CHROMATIC CONTRARY-MOTION SCALE", "chromatic"), ("CHROMATIC SCALES (SIMILAR MOTION)", "chromatic"), ("CHROMATIC SCALE (SIMILAR MOTION)", "chromatic"),
        ("CHROMATIC SCALE A MAJOR SIXTH APART", "chromatic"), ("CHROMATIC SCALE", "chromatic"),
        ("CONTRARY-MOTION SCALES", "contrary"), ("CONTRARY-MOTION SCALE", "contrary"), ("LEGATO SCALE IN THIRDS", "double"), ("STACCATO SCALE IN THIRDS", "double"),
        ("STACCATO SCALE IN SIXTHS", "double"), ("WHOLE-TONE SCALES (SIMILAR MOTION)", "wholetone"), ("ARPEGGIOS", "arpeggio"),
        ("DOMINANT SEVENTHS", "seventh"), ("DIMINISHED SEVENTHS", "seventh"), ("DIMINISHED SEVENTH", "seventh")]
KEYRE = re.compile(r"\b([A-G])( [-+])?(?=[ ,]| major| minor| harmonic|$)")
for gi, blk in enumerate(blocks):
    g = next(x for x in SY["systems"]["abrsm"]["grades"] if x["grade"] == gi)
    lines = [l.strip() for l in blk.split("\n") if l.strip()]
    # 每一類收集:大調鍵、小調鍵、起音
    got = {}
    cur = None
    for l in lines:
        hdr = next((c for h, c in SECT if l.startswith(h)), None)
        if hdr: cur = hdr; got.setdefault(cur, {"maj": set(), "min": set(), "start": set(), "oct": set()}); continue
        if cur is None: continue
        d = got[cur]
        for m in re.finditer(r"(\d) oct\.", l): d["oct"].add(int(m.group(1)))
        if "a 5th" in l: d["oct"].add("5th")
        if l.startswith("starting on") or l.startswith("in the keys of"):
            body = (l.split("starting on", 1)[1] if l.startswith("starting on") else l.split("in the keys of", 1)[1]).split("   ")[0]
            for k in re.findall(r"\b([A-G](?: ?[-+])?)(?= \(|\s|,|$)", body):
                d["start" if l.startswith("starting on") else "maj"].add(norm_key(k))
            continue
        m = re.match(r"^((?:[A-G](?: ?[-+])?(?:, )?)+)\s+(majors?|minors?|harmonic minors?)", l)
        if m:
            ks = {norm_key(k) for k in m.group(1).split(",") if k.strip()}
            d["maj" if m.group(2).startswith("major") else "min"] |= ks
        elif re.match(r"^[A-G]( ?[-+])? (major|minor|harmonic minor)\b", l):
            k = norm_key(re.match(r"^([A-G](?: ?[-+])?)", l).group(1))
            d["maj" if " major" in l else "min"].add(k)
    # JSON 那邊
    want = {}
    for it in g["items"]:
        d = want.setdefault(it["cat"], {"maj": set(), "min": set(), "start": set(), "oct": set()})
        d["oct"].add(it.get("range") or it.get("octaves"))
        if it["type"] in ("chromatic",): d["start"] |= {it["lhStart"], it["rhStart"]}
        elif it["type"] in ("dim7", "wholetone"): d["start"] |= set(it["keys"])
        elif it["type"] == "dom7": d["maj"] |= set(it["keys"])
        else: d["maj" if it["quality"] == "major" else "min"] |= set(it["keys"])
    for cat in sorted(set(got) | set(want)):
        a, b = got.get(cat), want.get(cat)
        if not a or not b: fail(f"ABRSM {gi} 級 {cat}:PDF {'有' if a else '沒有'}、JSON {'有' if b else '沒有'}"); continue
        for f in ("maj", "min", "start", "oct"):
            if a[f] != b[f]: fail(f"ABRSM {gi} 級 {cat} {f}:PDF {sorted(map(str, a[f]))} ≠ JSON {sorted(map(str, b[f]))}")

# ── Trinity:每一級 A / B 組的項目名稱 ──
t = open(trinity_txt).read()
pages = t.split("\f")
def trin_items(grade_label, set_name):
    # 找到「Piano | Grade N」那頁起,Set A / Set B 到下一個 Set 或 Exercises
    txt = "\n".join(pages)
    start = txt.index(f"Piano | {grade_label}")
    seg = txt[start:]
    a = seg.index(f"Set {set_name}")
    seg = seg[a:]
    end = min([i for i in [seg.find("Or\n", 10), seg.find("Exercises (music may be used)"), seg.find("Set B", 10) if set_name == "A" else -1] if i > 0])
    return seg[:end]
ITEMRE = re.compile(r"^(?:\s*)((?:Broken triad in )?[A-G][b#]? (?:major|minor|harmonic minor|melodic minor)(?: scale in 3rds| contrary motion)?|Chromatic scale in (?:similar|contrary) motion[^|]*?(?:starting on [A-G][b#]?)?|Diminished 7th starting on [A-G][b#]?|Dominant 7th in the key of [A-G][b#]?)", re.M)
for g in SY["systems"]["trinity"]["grades"]:
    label = "Initial" if g["grade"] == 0 else f"Grade {g['grade']}"
    for s in ("A", "B"):
        seg = trin_items(label, s)
        bc = seg.find("Broken chords")
        found = [(m.start(), re.sub(r"\s+", " ", m.group(1)).strip()) for m in ITEMRE.finditer(seg)]
        names = [("Broken " + n if bc >= 0 and pos > bc and not n.startswith("Broken") else n) for pos, n in found]
        def keyof(n):
            if "starting on" in n or "key of" in n:
                k = re.findall(r"\b([A-G][b#]?)(?= |$)", n); return k[-1] if k else None
            m = re.match(r"(?:Broken (?:triad in )?)?([A-G][b#]?)", n); return m.group(1) if m else None
        keys_pdf = [keyof(n) for n in names]
        keys_json = [it["key"] if it["type"] != "chromatic" else it["lhStart"] for it in g["sets"][s]]
        # 半音階左手 C、右手 E 的寫法跨行,文字抓不到起音:只比數量與其他項目
        if len(names) != len(keys_json): fail(f"Trinity {label} {s} 組:PDF {len(names)} 項 {names} ≠ JSON {len(keys_json)} 項")
        else:
            for n, kp, it in zip(names, keys_pdf, g["sets"][s]):
                kj = it["key"] if it["type"] != "chromatic" else it["lhStart"]
                typ_ok = ("Chromatic" in n) == (it["type"] == "chromatic") and ("Diminished" in n) == (it["type"] == "dim7") and ("Dominant" in n) == (it["type"] == "dom7") \
                    and ("3rds" in n) == (it["type"] == "thirds") and ("Broken" in n) == (it["type"] == "broken") and ("contrary" in n) == (it.get("motion") == "contrary")
                if not typ_ok: fail(f"Trinity {label} {s} 組 「{n}」類型對不上 JSON {it['type']}/{it.get('motion')}")
                if "Chromatic" not in n and kp != kj: fail(f"Trinity {label} {s} 組 「{n}」調 {kp} ≠ JSON {kj}")
                if it.get("forms") and len(it["forms"]) == 1:
                    form = it["forms"][0]
                    if form not in n: fail(f"Trinity {label} {s} 組 「{n}」小調形式 JSON 指定 {form}")
print(("✗ %d 項不一致" % bad) if bad else "✓ ABRSM 9 級、Trinity 9 級 × A/B 組:調、類型、八度數與官方大綱文字一致")
sys.exit(1 if bad else 0)
