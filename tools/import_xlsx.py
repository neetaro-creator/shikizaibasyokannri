"""点検表(xlsx)から資器材 CSV の下書きを作る。

使い方: python3 tools/import_xlsx.py <xlsxのあるディレクトリ> <出力ディレクトリ>

帳票は「品名列+数量列」の列帯が横に並ぶ。列帯ごとに上から読み、
数量のない見出しで場所を更新し、品名+数量を在庫行にする。
判断に自信がない行は review.csv に出す。
"""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl
from openpyxl.utils import column_index_from_string

CONFIG = json.loads((Path(__file__).parent / "import_config.json").read_text(encoding="utf-8"))
HEADING = re.compile(CONFIG["heading_pattern"])
SUBLEVEL = re.compile(CONFIG["sublevel_pattern"])
INSPECTION = re.compile(CONFIG["inspection_pattern"])
NOT_ITEMS = [unicodedata.normalize("NFKC", n) for n in CONFIG["not_items"]]
HEADER_ROW = re.compile(r"積載場所")


def clean(s):
    s = unicodedata.normalize("NFKC", str(s))
    s = s.split("※")[0]
    return re.sub(r"\s+", " ", s).strip()


def loc_clean(s):
    return re.sub(r"\s+", "", clean(s))


def key(s):
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", s)).lower()


def col_range(spec):
    a, b = spec.split(":")
    return list(range(column_index_from_string(a), column_index_from_string(b) + 1))


def parse_qty(cells):
    """数量セル群 → (qty, note, inspection)。"""
    nums, notes, insp = [], [], []
    for c in cells:
        t = re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(c)))
        if not t:
            continue
        if INSPECTION.search(t):
            insp.append(t)
            continue
        m = re.fullmatch(r"計?(\d+)(本|個|枚|組|双|台|缶|巻)?", t)
        if m:
            nums.append(int(m.group(1)))
        else:
            notes.append(t)
    qty = str(sum(nums)) if nums else ""
    note = " ".join(notes)
    if insp and not nums and not notes:
        note = f"あり(点検:{'・'.join(insp)})"
    return qty, note, insp


def vertical_runs(ws, cols, rows):
    """縦書きラベル(1〜2文字のセルが縦に3つ以上並ぶ)を検出し、行→ラベルを返す。"""
    labels = {}  # (row) -> list[(col, label)]
    for c in cols:
        run = []
        def flush():
            if len(run) >= 3:
                text = "".join(clean(v) for _, v in run).replace("❘", "ー").replace("|", "ー").replace("・", "")
                first, last = run[0][0], run[-1][0]
                for r in range(first, last + 1):
                    labels.setdefault(r, []).append((c, text))
            run.clear()
        for r in rows:
            v = ws.cell(r, c).value
            t = clean(v) if v is not None else ""
            if t and len(t) <= 2 and not SUBLEVEL.match(t):
                if run and r - run[-1][0] > 2:
                    flush()
                run.append((r, t))
            elif t:
                flush()
        flush()
    return labels


class Builder:
    def __init__(self):
        self.vehicles, self.locations, self.items, self.stock, self.review = [], {}, {}, {}, []

    def location(self, vid, name):
        k = (vid, name)
        if k not in self.locations:
            n = sum(1 for v, _ in self.locations if v == vid) + 1
            self.locations[k] = f"{vid}-l{n:02d}"
        return self.locations[k]

    def item(self, name):
        k = key(name)
        if k not in self.items:
            self.items[k] = (f"i{len(self.items) + 1:04d}", name)
        return self.items[k][0]

    def add(self, vid, loc, name, qty, note):
        lid, iid = self.location(vid, loc), self.item(name)
        if (iid, lid) in self.stock:
            q0, n0 = self.stock[(iid, lid)]
            qty = str(int(q0 or 0) + int(qty or 0)) if (q0 or qty) else ""
            note = " ".join(x for x in (n0, note) if x)
        self.stock[(iid, lid)] = (qty, note)


def read_vehicle(b, v, src):
    wb = openpyxl.load_workbook(src / v["file"], data_only=True)
    ws = wb[v["sheet"]]
    vid = v["id"]
    b.vehicles.append(v)
    for band in v["bands"]:
        tcols, qcols = col_range(band["text"]), col_range(band["qty"])
        rows = [r for a, z in band["rows"] for r in range(a, z + 1)]
        vlabels = vertical_runs(ws, tcols, rows)
        vcells = {(r, c) for r, lst in vlabels.items() for c, _ in lst}
        major = loc_clean(band["start"]) if band.get("start") else ""
        if major:
            b.review.append([vid, v["sheet"], f"{band['text']}@{rows[0]}", major, "start_inferred"])
        sub, sub_col, container = "", None, ""
        for r in rows:
            texts = [(c, ws.cell(r, c).value) for c in tcols]
            texts = [(c, clean(t)) for c, t in texts if t is not None and (r, c) not in vcells and clean(t)]
            qcells = [ws.cell(r, c).value for c in qcols if ws.cell(r, c).value is not None]
            runs = tuple(t for _, t in sorted(vlabels.get(r, [])))
            if runs:
                container = " ".join(runs)
            if not texts:
                continue
            if HEADER_ROW.search(texts[0][1]):
                continue
            qty, note, insp = parse_qty(qcells)
            has_qty = bool(qty or note or insp)
            if not has_qty and len(texts) == 1:
                c, t = texts[0]
                if SUBLEVEL.match(loc_clean(t)):
                    sub, sub_col = loc_clean(t), c
                    continue
                if HEADING.search(loc_clean(t)):
                    if c == tcols[0] or not major:
                        major, sub, sub_col = loc_clean(t), "", None
                    else:
                        sub, sub_col = loc_clean(t), c
                    container = ""
                    continue
            *prefixes, (icol, name) = texts
            if len(prefixes) >= 2:
                major, sub, sub_col = loc_clean(prefixes[0][1]), loc_clean(prefixes[1][1]), prefixes[1][0]
                container = ""
            elif len(prefixes) == 1:
                pc, pt = prefixes[0]
                if pc == tcols[0] and not SUBLEVEL.match(pt):
                    major, sub, sub_col = loc_clean(pt), "", None
                    container = ""
                else:
                    sub, sub_col = loc_clean(pt), pc
            elif sub_col is not None and icol <= sub_col:
                sub, sub_col = "", None
            if any(key(name).startswith(key(n)) for n in NOT_ITEMS):
                b.review.append([vid, v["sheet"], f"R{r}", name, "not_item"])
                continue
            loc = " ".join(x for x in (major, sub, container) if x)
            if not loc:
                b.review.append([vid, v["sheet"], f"R{r}", name, "noloc"])
                loc = "場所不明"
            if not has_qty:
                note = "数量記載なし"
                b.review.append([vid, v["sheet"], f"R{r}", name, "noqty"])
            if insp:
                b.review.append([vid, v["sheet"], f"R{r}", f"{name} [{' '.join(insp)}]", "inspection"])
            b.add(vid, loc, name, qty, note)
    for e in v.get("extra", []):
        b.add(vid, loc_clean(e["location"]), clean(e["name"]), e["qty"], "")


def pick(rules, text, default):
    for name, pat in rules:
        if re.search(pat, text):
            return name
    return default


def write(b, out):
    out.mkdir(parents=True, exist_ok=True)
    def w(name, header, rows):
        with open(out / name, "w", encoding="utf-8", newline="") as f:
            cw = csv.writer(f)
            cw.writerow(header)
            cw.writerows(rows)
    w("vehicles.csv", ["vehicle_id", "name", "type", "model"],
      [[v["id"], v["name"], v["type"], ""] for v in b.vehicles])
    w("locations.csv", ["location_id", "vehicle_id", "name", "group", "hotspot", "photo"],
      [[lid, vid, name, pick(CONFIG["location_groups"], name, CONFIG["default_group"]), "", ""]
       for (vid, name), lid in b.locations.items()])
    w("items.csv", ["item_id", "name", "aliases", "category", "photo", "model"],
      [[iid, name, "", pick(CONFIG["categories"], name, CONFIG["default_category"]), "", ""]
       for iid, name in b.items.values()])
    w("stock.csv", ["item_id", "location_id", "qty", "qty_note"],
      [[iid, lid, q, n] for (iid, lid), (q, n) in b.stock.items()])
    w("review.csv", ["vehicle_id", "sheet", "cell", "raw", "reason"], b.review)


def main(src, out):
    b = Builder()
    for v in CONFIG["vehicles"]:
        read_vehicle(b, v, Path(src))
    write(b, Path(out))
    print(f"vehicles={len(b.vehicles)} locations={len(b.locations)} items={len(b.items)} "
          f"stock={len(b.stock)} review={len(b.review)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
