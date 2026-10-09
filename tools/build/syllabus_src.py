# 依官方大綱整理 data/syllabus.json(轉成 JSON 的來源;改這個檔再執行 python3 tools/build/syllabus_src.py)
# ABRSM:Piano Practical Grades Qualification Specification 2025 & 2026(頁碼),2027 & 2028 版要求相同(已逐字比對)
# Trinity:Piano Syllabus — Qualification specifications for graded exams from 2023(Online edition, February 2026),Technical work 頁碼
import json, os
MAJ, MIN = "major", "minor"
HM, NHM = ["harmonic", "melodic"], ["natural", "harmonic", "melodic"]
L, S, LS = ["legato"], ["staccato"], ["legato", "staccato"]

def it(id, cat, type, keys, **kw):
    d = {"id": id, "cat": cat, "type": type, "keys": keys}
    d.update(kw); return d

# ── ABRSM(考官點題)──
def A_scale(id, keys, q, hands, octv, art=L, forms=None, examinerForms=False, **kw):
    d = it(id, "scale", "scale", keys, quality=q, hands=hands, octaves=octv, articulation=art, motion="similar", tempo="scale", **kw)
    if q == MIN: d["forms"] = forms or HM; d["examinerForms"] = examinerForms
    return d
def A_contrary(id, keys, q, octv, art=L, forms=None, **kw):
    d = it(id, "contrary", "scale", keys, quality=q, hands="HT", articulation=art, motion="contrary", tempo="scale", **kw)
    if octv == "5th": d["range"] = "5th"
    else: d["octaves"] = octv
    if q == MIN: d["forms"] = forms or ["harmonic"]; d["examinerForms"] = False
    return d
def A_arp(id, keys, q, hands, octv, art=L, inversion=0, **kw):
    d = it(id, "arpeggio", "arpeggio", keys, quality=q, hands=hands, articulation=art, inversion=inversion, tempo="arpeggio", **kw)
    if octv == "5th": d["range"] = "5th"
    else: d["octaves"] = octv
    return d
def A_chrom(id, lh, rh, hands, octv, motion="similar", art=L, tempo="scale", apartTenth=False):
    d = it(id, "chromatic", "chromatic", [lh], lhStart=lh, rhStart=rh, hands=hands, octaves=octv, motion=motion, articulation=art, tempo=tempo)
    if apartTenth: d["apartTenth"] = True
    return d

def q_(b): return {"unit": "q", "bpm": b}
def h_(b): return {"unit": "h", "bpm": b}

abrsm = [
 {"grade": 0, "page": 20, "tempo": {"scale": q_(54), "arpeggio": q_(52)}, "items": [
   A_scale("maj", ["C"], MAJ, "HS", 1), A_scale("min", ["D"], MIN, "HS", 1, forms=NHM),
   A_contrary("cm", ["C"], MAJ, "5th"),
   A_arp("arp-maj", ["C"], MAJ, "HS", "5th"), A_arp("arp-min", ["D"], MIN, "HS", "5th")]},
 {"grade": 1, "page": 23, "tempo": {"scale": q_(60), "arpeggio": q_(58)}, "items": [
   A_scale("maj-ht", ["C"], MAJ, "HT", 1),
   A_scale("maj", ["G", "F"], MAJ, "HS", 2), A_scale("min", ["A", "D"], MIN, "HS", 2, forms=NHM),
   A_contrary("cm", ["C"], MAJ, 1),
   A_arp("arp-maj", ["G"], MAJ, "HS", 1), A_arp("arp-min", ["A"], MIN, "HS", 1)]},
 {"grade": 2, "page": 26, "tempo": {"scale": q_(66), "arpeggio": q_(63)}, "items": [
   A_scale("maj-ht", ["G", "F"], MAJ, "HT", 2), A_scale("min-ht", ["A", "D"], MIN, "HT", 2, forms=NHM),
   A_scale("maj-hs", ["D", "A"], MAJ, "HS", 2), A_scale("min-hs", ["E", "G"], MIN, "HS", 2, forms=NHM),
   A_contrary("cm", ["C"], MAJ, 2),
   A_chrom("chr", "D", "D", "HS", 1),
   A_arp("arp-maj", ["D", "A"], MAJ, "HS", 2), A_arp("arp-min", ["E", "G"], MIN, "HS", 2)]},
 {"grade": 3, "page": 29, "tempo": {"scale": q_(80), "arpeggio": q_(72)}, "items": [
   A_scale("maj-ht", ["D", "A"], MAJ, "HT", 2), A_scale("min-ht", ["E", "G"], MIN, "HT", 2),
   A_scale("maj-hs", ["Bb", "Eb"], MAJ, "HS", 2), A_scale("min-hs", ["B", "C"], MIN, "HS", 2),
   A_contrary("cm", ["E"], MAJ, 2),
   A_chrom("chr-cm", "D", "D", "HT", 1, motion="contrary"),
   A_arp("arp-maj-ht", ["D", "A"], MAJ, "HT", 2), A_arp("arp-min-ht", ["E", "G"], MIN, "HT", 2),
   A_arp("arp-maj-hs", ["Bb", "Eb"], MAJ, "HS", 2), A_arp("arp-min-hs", ["B", "C"], MIN, "HS", 2)]},
 {"grade": 4, "page": 32, "tempo": {"scale": q_(100), "arpeggio": q_(80)}, "items": [
   A_scale("maj-ht", ["Bb", "Eb"], MAJ, "HT", 2), A_scale("min-ht", ["B", "C"], MIN, "HT", 2),
   A_scale("maj-hs", ["B", "F#", "Ab"], MAJ, "HS", 2), A_scale("min-hs", ["F#", "F"], MIN, "HS", 2),
   A_contrary("cm-maj", ["Eb"], MAJ, 2), A_contrary("cm-min", ["C"], MIN, 2),
   A_chrom("chr", "F#", "F#", "HT", 2),
   A_arp("arp-maj-ht", ["Bb", "Eb"], MAJ, "HT", 2), A_arp("arp-min-ht", ["B", "C"], MIN, "HT", 2),
   A_arp("arp-maj-hs", ["B", "F#", "Ab"], MAJ, "HS", 2), A_arp("arp-min-hs", ["F#", "F"], MIN, "HS", 2)]},
 {"grade": 5, "page": 35, "tempo": {"scale": h_(60), "arpeggio": h_(44)}, "items": [
   A_scale("maj", ["A", "E", "B", "F#", "Db"], MAJ, "HT", 2), A_scale("min", ["F#", "C#", "G#", "Eb", "Bb"], MIN, "HT", 2),
   A_scale("stacc-maj", ["Ab"], MAJ, "HS", 2, art=S), A_scale("stacc-min", ["F"], MIN, "HS", 2, art=S),
   A_contrary("cm-maj", ["Db"], MAJ, 2), A_contrary("cm-min", ["C#"], MIN, 2),
   A_chrom("chr-cm", "F#", "A#", "HT", 2, motion="contrary"),
   A_arp("arp-maj", ["A", "E", "B", "F#", "Ab", "Db"], MAJ, "HT", 2), A_arp("arp-min", ["F#", "C#", "G#", "Eb", "F", "Bb"], MIN, "HT", 2),
   it("dim7", "seventh", "dim7", ["B"], hands="HS", octaves=2, articulation=L, tempo="arpeggio")]},
 {"grade": 6, "page": 38, "tempo": {"scale": h_(72), "arpeggio": h_(50)}, "items": [
   A_scale("maj", ["D", "F", "Ab", "B"], MAJ, "HT", 4, art=LS), A_scale("min", ["D", "F", "G#", "B"], MIN, "HT", 4, art=LS, examinerForms=True),
   A_contrary("cm-maj", ["D", "F", "Ab", "B"], MAJ, 2), A_contrary("cm-min", ["D", "F", "G#", "B"], MIN, 2),
   A_chrom("chr-g#", "G#", "G#", "HT", 4, art=LS), A_chrom("chr-b", "B", "B", "HT", 4, art=LS),
   A_arp("arp-maj", ["D", "F", "Ab", "B"], MAJ, "HT", 4), A_arp("arp-min", ["D", "F", "G#", "B"], MIN, "HT", 4),
   it("dom7", "seventh", "dom7", ["D", "F", "Ab", "B"], quality=MAJ, hands="HT", octaves=4, articulation=L, tempo="arpeggio"),
   it("dim7", "seventh", "dim7", ["G#", "B"], hands="HT", octaves=4, articulation=L, tempo="arpeggio")]},
 {"grade": 7, "page": 41, "tempo": {"scale": h_(80), "arpeggio": h_(56), "apart": h_(60), "thirdsLegato": h_(46), "doubleStaccato": h_(54)}, "items": [
   A_scale("maj", ["Db", "E", "G", "Bb"], MAJ, "HT", 4, art=LS), A_scale("min", ["C#", "E", "G", "Bb"], MIN, "HT", 4, art=LS, examinerForms=True),
   dict(A_scale("apart-maj", ["Db", "E", "G", "Bb"], MAJ, "HT", 4, art=LS), cat="apart", apart=3, tempo="apart"),
   dict(A_scale("apart-min", ["C#", "E", "G", "Bb"], MIN, "HT", 4, art=LS, forms=["harmonic"]), cat="apart", apart=3, tempo="apart"),
   A_contrary("cm-maj", ["Db", "E", "G", "Bb"], MAJ, 2, art=LS), A_contrary("cm-min", ["C#", "E", "G", "Bb"], MIN, 2, art=LS),
   it("thirds-legato", "double", "thirds", ["G"], quality=MAJ, hands="HS", octaves=2, articulation=L, tempo="thirdsLegato"),
   it("thirds-staccato", "double", "thirds", ["G"], quality=MAJ, hands="HS", octaves=2, articulation=S, tempo="doubleStaccato"),
   A_chrom("chr-cm", "C#", "E", "HT", 2, motion="contrary", art=LS),
   A_arp("arp-maj", ["Db", "E", "G", "Bb"], MAJ, "HT", 4, inversion=1), A_arp("arp-min", ["C#", "E", "G", "Bb"], MIN, "HT", 4, inversion=1),
   it("dom7", "seventh", "dom7", ["Db", "E", "G", "Bb"], quality=MAJ, hands="HT", octaves=4, articulation=L, tempo="arpeggio"),
   it("dim7", "seventh", "dim7", ["Bb", "E"], hands="HT", octaves=4, articulation=L, tempo="arpeggio")]},
 {"grade": 8, "page": 44, "tempo": {"scale": h_(88), "arpeggio": h_(66), "apart": h_(60), "thirdsLegato": h_(52), "doubleStaccato": h_(54)}, "items": [
   A_scale("maj", ["C", "Eb", "F#", "A"], MAJ, "HT", 4, art=LS), A_scale("min", ["C", "Eb", "F#", "A"], MIN, "HT", 4, art=LS, examinerForms=True),
   dict(A_scale("apart-maj", ["C", "Eb", "F#", "A"], MAJ, "HT", 4, art=LS), cat="apart", apart=6, tempo="apart"),
   dict(A_scale("apart-min", ["C", "Eb", "F#", "A"], MIN, "HT", 4, art=LS, forms=["harmonic"]), cat="apart", apart=6, tempo="apart"),
   A_contrary("cm-maj", ["C", "Eb", "F#", "A"], MAJ, 2, art=LS), A_contrary("cm-min", ["C", "Eb", "F#", "A"], MIN, 2, art=LS),
   it("thirds-legato", "double", "thirds", ["Eb"], quality=MAJ, hands="HS", octaves=2, articulation=L, tempo="thirdsLegato"),
   it("sixths-staccato", "double", "sixths", ["C"], quality=MAJ, hands="HS", octaves=2, articulation=S, tempo="doubleStaccato"),
   A_chrom("chr-6th", "Eb", "C", "HT", 4, art=LS, tempo="apart"),
   it("wholetone", "wholetone", "wholetone", ["Eb", "C"], hands="HT", octaves=4, articulation=LS, tempo="scale"),
   A_arp("arp-maj", ["C", "Eb", "F#", "A"], MAJ, "HT", 4, inversion=2), A_arp("arp-min", ["C", "Eb", "F#", "A"], MIN, "HT", 4, inversion=2),
   it("dom7", "seventh", "dom7", ["C", "Eb", "F#", "A"], quality=MAJ, hands="HT", octaves=4, articulation=L, tempo="arpeggio"),
   it("dim7", "seventh", "dim7", ["Eb", "C"], hands="HT", octaves=4, articulation=L, tempo="arpeggio")]},
]
for g in abrsm:
    g["label"] = "初級(Initial)" if g["grade"] == 0 else f"{g['grade']} 級"
    g["verified"] = False   # 你核對過才改 True(官方 PDF 逐項抄寫,official = True 表示來源是官方大綱)
    g["official"] = True
    pg = g.pop('page')
    g["source"] = f"ABRSM Piano Practical Grades 2025 & 2026 第 {pg} 頁(2027 & 2028 版相同)"
    g["sourceEn"] = f"ABRSM Piano Practical Grades 2025 & 2026, p. {pg} (same in 2027 & 2028)"
    g.update({k: g.pop(k) for k in ["tempo", "items"]})

# ── Trinity(A / B 組,每項固定手、力度、奏法)──
def T(type, key, hands, dyn, art, octv, bpm, unit="q", cat=None, **kw):
    d = {"type": type, "key": key, "hands": hands, "dynamic": dyn, "articulation": art, "tempo": {"unit": unit, "bpm": bpm}}
    if octv == "5th": d["range"] = "5th"
    else: d["octaves"] = octv
    d.update(kw)
    d["cat"] = cat or {"scale": "scale", "arpeggio": "arpeggio", "chromatic": "chromatic", "dom7": "seventh", "dim7": "seventh", "broken": "broken", "thirds": "double"}[type]
    return d
def sc(key, q, hands, dyn, art, octv, bpm, forms=None, form=None, motion="similar"):
    d = T("scale", key, hands, dyn, art, octv, bpm, quality=q, motion=motion, cat="contrary" if motion == "contrary" else "scale")
    if q == MIN:
        if form: d["forms"] = [form]
        else: d["forms"] = forms or HM
    return d
def ar(key, q, hands, dyn, art, octv, bpm): return T("arpeggio", key, hands, dyn, art, octv, bpm, quality=q, inversion=0)
def ch(lh, rh, dyn, art, octv, bpm, motion="similar", apartTenth=False):
    d = T("chromatic", lh, "HT", dyn, art, octv, bpm, lhStart=lh, rhStart=rh, motion=motion)
    if apartTenth: d["apartTenth"] = True
    return d
CD = "cresc-dim"
trinity = [
 {"grade": 0, "page": 29, "sets": {
   "A": [sc("C", MAJ, "LH", "mf", "legato", 1, 60), sc("A", MIN, "RH", "mf", "legato", 1, 60, forms=NHM),
         T("broken", "C", "RH", "mf", "legato", "5th", 60, quality=MAJ), T("broken", "A", "LH", "mf", "legato", "5th", 60, quality=MIN)],
   "B": [sc("C", MAJ, "RH", "mf", "legato", 1, 60), sc("A", MIN, "LH", "mf", "legato", 1, 60, forms=NHM),
         T("broken", "C", "LH", "mf", "legato", "5th", 60, quality=MAJ), T("broken", "A", "RH", "mf", "legato", "5th", 60, quality=MIN)]}},
 {"grade": 1, "page": 31, "sets": {
   "A": [sc("F", MAJ, "RH", "mf", "legato", 1, 70), sc("E", MIN, "LH", "mf", "legato", 1, 70, forms=NHM),
         ch("D", "D", "mf", "legato", 1, 70, motion="contrary"),
         T("broken", "G", "LH", "mf", "legato", 1, 50, unit="q.", quality=MAJ), T("broken", "D", "RH", "mf", "legato", 1, 50, unit="q.", quality=MIN)],
   "B": [sc("G", MAJ, "LH", "mf", "legato", 1, 70), sc("D", MIN, "RH", "mf", "legato", 1, 70, forms=NHM),
         sc("C", MAJ, "HT", "mf", "legato", 1, 70, motion="contrary"),
         T("broken", "F", "RH", "mf", "legato", 1, 50, unit="q.", quality=MAJ), T("broken", "E", "LH", "mf", "legato", 1, 50, unit="q.", quality=MIN)]}},
 {"grade": 2, "page": 33, "sets": {
   "A": [sc("Bb", MAJ, "HT", "f", "legato", 2, 80), sc("B", MIN, "HT", "p", "legato", 2, 80), sc("C", MAJ, "HT", "f", "legato", 2, 80, motion="contrary"),
         ar("D", MAJ, "LH", "mf", "legato", 2, 60), ar("G", MIN, "RH", "mf", "legato", 2, 60)],
   "B": [sc("D", MAJ, "HT", "f", "legato", 2, 80), sc("G", MIN, "HT", "p", "legato", 2, 80), ch("Bb", "Bb", "f", "legato", 2, 80),
         ar("Bb", MAJ, "LH", "mf", "legato", 2, 60), ar("B", MIN, "RH", "mf", "legato", 2, 60)]}},
 {"grade": 3, "page": 35, "sets": {
   "A": [sc("Eb", MAJ, "HT", "f", "legato", 2, 90), sc("C", MIN, "HT", "p", "legato", 2, 90), ch("F#", "F#", "f", "legato", 2, 90),
         ar("A", MAJ, "RH", "mf", "legato", 2, 70), ar("F#", MIN, "LH", "mf", "legato", 2, 70)],
   "B": [sc("A", MAJ, "HT", "f", "legato", 2, 90), sc("F#", MIN, "HT", "p", "legato", 2, 90), sc("Eb", MAJ, "HT", "f", "legato", 2, 90, motion="contrary"),
         ar("Eb", MAJ, "LH", "mf", "legato", 2, 70), ar("C", MIN, "RH", "mf", "legato", 2, 70)]}},
 {"grade": 4, "page": 37, "sets": {
   "A": [sc("E", MAJ, "HT", "f", "legato", 2, 100), sc("F", MIN, "HT", "p", "staccato", 2, 100), ch("B", "B", "p", "legato", 2, 100),
         ch("Ab", "Ab", "p", "legato", 1, 100, motion="contrary"),
         ar("Ab", MAJ, "RH", "p", "legato", 2, 80), ar("F", MIN, "LH", "f", "legato", 2, 80)],
   "B": [sc("Ab", MAJ, "HT", "f", "staccato", 2, 100), sc("C#", MIN, "HT", "p", "legato", 2, 100), sc("E", MAJ, "HT", "f", "staccato", 2, 100, motion="contrary"),
         ch("B", "B", "p", "legato", 2, 100),
         ar("E", MAJ, "LH", "p", "legato", 2, 80), ar("C#", MIN, "RH", "f", "legato", 2, 80)]}},
 {"grade": 5, "page": "39–40", "sets": {
   "A": [sc("Db", MAJ, "HT", "f", "staccato", 2, 110), sc("G#", MIN, "HT", "p", "legato", 2, 110), sc("G", MIN, "HT", "p", "staccato", 2, 110, form="harmonic", motion="contrary"),
         ch("C", "E", "f", "legato", 2, 110, motion="contrary"),
         ar("B", MAJ, "HT", "p", "staccato", 2, 90), ar("Bb", MIN, "HT", "f", "legato", 2, 90), T("dim7", "B", "HT", "f", "staccato", 2, 90)],
   "B": [sc("B", MAJ, "HT", "f", "legato", 2, 110), sc("Bb", MIN, "HT", "p", "staccato", 2, 110), ch("Db", "Db", "f", "staccato", 2, 110),
         ch("C", "E", "p", "legato", 2, 110, motion="contrary"),
         ar("Db", MAJ, "HT", "p", "legato", 2, 90), ar("G#", MIN, "HT", "f", "staccato", 2, 90), T("dim7", "B", "HT", "f", "legato", 2, 90)]}},
 {"grade": 6, "page": "41–42", "sets": {
   "A": [sc("Bb", MAJ, "HT", "mf", "legato", 4, 120), sc("Bb", MIN, "HT", "f", "staccato", 4, 120, form="harmonic"), sc("D", MIN, "HT", "p", "legato", 4, 120, form="melodic"),
         ch("D", "D", "p", "staccato", 4, 120), ch("Eb", "Eb", "f", "legato", 2, 120, motion="contrary"),
         T("thirds", "C", "RH", "mf", "legato", 1, 60, quality=MAJ),
         ar("D", MAJ, "HT", "f", "staccato", 4, 100), ar("Bb", MIN, "HT", "p", "legato", 4, 100),
         T("dim7", "D", "HT", "mf", "legato", 4, 100), T("dom7", "Bb", "HT", "f", "staccato", 4, 100, quality=MAJ)],
   "B": [sc("D", MAJ, "HT", "f", "staccato", 4, 120), sc("Bb", MIN, "HT", "p", "legato", 4, 120, form="harmonic"), sc("Bb", MIN, "HT", "mf", "staccato", 4, 120, form="melodic"),
         ch("D", "D", "f", "legato", 4, 120), ch("Eb", "Eb", "p", "legato", 2, 120, motion="contrary"),
         T("thirds", "C", "LH", "mf", "legato", 1, 60, quality=MAJ),
         ar("Bb", MAJ, "HT", "p", "staccato", 4, 100), ar("D", MIN, "HT", "mf", "legato", 4, 100),
         T("dim7", "Bb", "HT", "f", "legato", 4, 100), T("dom7", "D", "HT", "p", "staccato", 4, 100, quality=MAJ)]}},
 {"grade": 7, "page": "43–44", "sets": {
   "A": [sc("E", MAJ, "HT", "f", "legato", 4, 130), sc("E", MIN, "HT", CD, "staccato", 4, 130, form="harmonic"), sc("G#", MIN, "HT", "p", "legato", 4, 130, form="melodic"),
         ch("C", "Eb", "mf", "staccato", 4, 130, apartTenth=True),
         T("thirds", "E", "LH", "mf", "legato", 2, 70, quality=MAJ),
         ar("Ab", MAJ, "HT", CD, "staccato", 4, 110), ar("E", MIN, "HT", "p", "legato", 4, 110),
         T("dim7", "Ab", "HT", "f", "staccato", 4, 110), T("dom7", "E", "HT", CD, "legato", 4, 110, quality=MAJ),
         sc("E", MAJ, "HT", "p", "legato", 2, 110, motion="contrary")],
   "B": [sc("Ab", MAJ, "HT", "f", "legato", 4, 130), sc("G#", MIN, "HT", "p", "staccato", 4, 130, form="harmonic"), sc("E", MIN, "HT", CD, "staccato", 4, 130, form="melodic"),
         ch("C", "Eb", "mf", "legato", 4, 130, apartTenth=True),
         T("thirds", "E", "RH", "mf", "legato", 2, 70, quality=MAJ),
         ar("E", MAJ, "HT", CD, "staccato", 4, 110), ar("G#", MIN, "HT", "mf", "legato", 4, 110),
         T("dim7", "E", "HT", "p", "staccato", 4, 110), T("dom7", "Ab", "HT", "mf", "legato", 4, 110, quality=MAJ),
         sc("E", MAJ, "HT", "f", "legato", 2, 110, motion="contrary")]}},
 {"grade": 8, "page": "45–46", "sets": {
   "A": [sc("F#", MAJ, "HT", CD, "staccato", 4, 140), sc("B", MIN, "HT", "p", "legato", 4, 140, form="harmonic"), sc("Eb", MIN, "HT", "f", "staccato", 4, 140, form="melodic"),
         ch("F#", "F#", "mf", "legato", 4, 140),
         T("thirds", "B", "RH", "mf", "legato", 2, 80, quality=MAJ), T("thirds", "C", "LH", "mf", "legato", 2, 80, quality=MIN, forms=["harmonic"]),
         ar("B", MAJ, "HT", "p", "staccato", 4, 120), ar("Eb", MIN, "HT", CD, "legato", 4, 120),
         T("dim7", "F#", "HT", "f", "staccato", 4, 120), T("dom7", "B", "HT", CD, "legato", 4, 120, quality=MAJ),
         sc("Eb", MAJ, "HT", "p", "legato", 2, 120, motion="contrary")],
   "B": [sc("Eb", MAJ, "HT", "f", "staccato", 4, 140), sc("F#", MIN, "HT", CD, "legato", 4, 140, form="harmonic"), sc("B", MIN, "HT", "p", "legato", 4, 140, form="melodic"),
         ch("Eb", "Eb", "mf", "staccato", 4, 140),
         T("thirds", "B", "LH", "mf", "legato", 2, 80, quality=MAJ), T("thirds", "C", "RH", "mf", "legato", 2, 80, quality=MIN, forms=["harmonic"]),
         ar("F#", MAJ, "HT", "p", "legato", 4, 120), ar("B", MIN, "HT", CD, "staccato", 4, 120),
         T("dim7", "Eb", "HT", "f", "legato", 4, 120), T("dom7", "F#", "HT", CD, "legato", 4, 120, quality=MAJ),
         sc("F#", MIN, "HT", "mf", "legato", 2, 120, form="harmonic", motion="contrary")]}},
]
for g in trinity:
    g["label"] = "初級(Initial)" if g["grade"] == 0 else f"{g['grade']} 級"
    g["verified"] = False   # 你核對過才改 True(官方 PDF 逐項抄寫,official = True 表示來源是官方大綱)
    g["official"] = True
    pg = g.pop('page')
    g["source"] = f"Trinity Piano Syllabus from 2023(2026 年 2 月線上版)Technical work 第 {pg} 頁"
    g["sourceEn"] = f"Trinity Piano Syllabus from 2023 (online edition, Feb 2026), Technical work p. {pg}"
    for k, items in g["sets"].items():
        for i, d in enumerate(items): d["id"] = f"{k}{i + 1}"
    g["sets"] = g.pop("sets")

doc = [
 "考試系統的音階/琶音要求:依官方大綱逐項抄寫(official = true,來源與頁碼在每一級的 source);verified 等使用者核對後才改成 true。",
 "ABRSM(mode = examiner):考官從清單點題。hands HS = 分手(考官指定左手或右手)、HT = 雙手同時;examinerForms = 小調形式由考官指定(6–8 級),否則考生自選 forms 之一;articulation 有兩種 = 考官選。",
 "Trinity(mode = sets):考生準備 A 組或 B 組,整組都要彈;每一項固定手(RH/LH/HT)、力度(dynamic)、奏法(articulation)、最低速度(tempo)。",
 "type:scale(motion similar/contrary;apart 3 = 相隔三度(十度)、6 = 相隔六度)、arpeggio(inversion 0/1/2;range 5th = 五度範圍)、chromatic(lhStart/rhStart;apartTenth = 右手高十度)、dom7(解決到主音)、dim7、wholetone、broken(分解和弦)、thirds/sixths(雙音音階)",
 "tempo:unit q = 四分音符、h = 二分音符、q. = 附點四分;全部是平均的八分音符(q 一拍 2 個、h 一拍 4 個、q. 一拍 3 個三連音)。ABRSM 速度是「參考速度」,Trinity 是「最低速度」。",
 "鍵名用英文字母 + # / b(F#、Bb)。"
]
out = {"_doc": doc, "systems": {
 "abrsm": {"name": "ABRSM", "fullName": "英國皇家音樂學院 ABRSM", "mode": "examiner",
           "syllabus": "Piano Practical Grades 2025 & 2026(2027 & 2028 要求相同)",
           "url": "https://www.abrsm.org/en-gb/piano", "tempoNote": "參考速度", "grades": abrsm},
 "trinity": {"name": "Trinity", "fullName": "聖三一學院 Trinity College London", "mode": "sets",
             "syllabus": "Piano Syllabus from 2023(Technical work pathway)",
             "url": "https://www.trinitycollege.com/qualifications/music/grade-exams/piano", "tempoNote": "最低速度", "grades": trinity}}}

# 輸出:每個項目一行
def dump(o):
    L = ['{', ' "_doc": [' + ',\n  '.join(json.dumps(x, ensure_ascii=False) for x in o["_doc"]) + '],', ' "systems": {']
    sy = []
    for sk, sv in o["systems"].items():
        head = {k: v for k, v in sv.items() if k != "grades"}
        s = ['  ' + json.dumps(sk) + ': {', '   ' + json.dumps(head, ensure_ascii=False)[1:-1] + ',', '   "grades": [']
        gl = []
        for g in sv["grades"]:
            gh = {k: v for k, v in g.items() if k not in ("items", "sets")}
            gg = ['    {' + json.dumps(gh, ensure_ascii=False)[1:-1] + ',']
            if "items" in g:
                gg.append('     "items": [\n' + ',\n'.join('      ' + json.dumps(i, ensure_ascii=False) for i in g["items"]) + '\n     ] }')
            else:
                parts = []
                for k, items in g["sets"].items():
                    parts.append(f'      "{k}": [\n' + ',\n'.join('       ' + json.dumps(i, ensure_ascii=False) for i in items) + '\n      ]')
                gg.append('     "sets": {\n' + ',\n'.join(parts) + '\n     } }')
            gl.append('\n'.join(gg))
        s.append(',\n'.join(gl)); s.append('   ]'); s.append('  }')
        sy.append('\n'.join(s))
    L.append(',\n'.join(sy)); L.append(' }'); L.append('}')
    t = '\n'.join(L) + '\n'
    assert json.loads(t) == o
    return t
p = os.path.join(os.path.dirname(__file__), "..", "..", "data", "syllabus.json")
open(p, "w").write(dump(out))
print("ok", sum(len(g["items"]) for g in abrsm), "ABRSM items;", sum(len(v) for g in trinity for v in g["sets"].values()), "Trinity items")
