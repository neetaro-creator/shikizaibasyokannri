import csv
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    d = tmp_path_factory.mktemp("data")
    subprocess.run(
        [sys.executable, str(ROOT / "tools/import_xlsx.py"), str(ROOT / "tools/fixtures"), str(d)],
        check=True,
    )
    def read(name):
        with open(d / name, encoding="utf-8") as f:
            return list(csv.DictReader(f))
    t = {n: read(f"{n}.csv") for n in ["vehicles", "locations", "items", "stock", "review"]}
    t["loc"] = {r["location_id"]: r for r in t["locations"]}
    t["item"] = {r["item_id"]: r for r in t["items"]}
    return t


def rows(t, vehicle, name):
    return [
        (t["loc"][s["location_id"]]["name"], s["qty"], s["qty_note"])
        for s in t["stock"]
        if t["item"][s["item_id"]]["name"] == name and t["loc"][s["location_id"]]["vehicle_id"] == vehicle
    ]


def test_tank1_carabiner(out):
    assert ("車両左側後部シャッター 下段", "5", "") in rows(out, "tank1", "カラビナ")


def test_tank1_nonnumeric_qty(out):
    assert ("車両左側中央シャッター", "", "一対") not in rows(out, "tank1", "車輪止め")
    assert any(q == "" and n == "一対" for _, q, n in rows(out, "tank1", "車輪止め"))


def test_pump1_hose_bag(out):
    assert any(q == "2" for _, q, _ in rows(out, "pump1", "65mmホースバッグ"))


def test_ambulance_backboard(out):
    assert any(q == "1" for _, q, _ in rows(out, "ambulance1", "バックボード(ベースプレート付)"))


def test_inspection_rows(out):
    r = rows(out, "tank1", "サーチライト")
    assert r and all(q == "" and "点検" in n for _, q, n in r)
    assert any(x["reason"] == "inspection" and "サーチライト" in x["raw"] for x in out["review"])
    assert not rows(out, "tank1", "e-モニタ液晶画面")


def test_vertical_label_container(out):
    # 救急1 の縦書き「特定行為バッグ」が場所名に入る
    assert any("特定行為バック" in loc for loc, _, _ in rows(out, "ambulance1", "シリンジ"))


def test_refs_consistent(out):
    assert {v["vehicle_id"] for v in out["vehicles"]} == {"tank1", "pump1", "command1", "ambulance1"}
    for s in out["stock"]:
        assert s["item_id"] in out["item"]
        assert s["location_id"] in out["loc"]


def test_sheet2_only_names_go_to_review(out):
    raws = [x["raw"] for x in out["review"] if x["reason"] == "sheet2_only"]
    assert "発煙筒" in raws
    assert "バックボード(ベースプレート付)" not in raws  # 主シートにもある品は出さない


def test_kanji_names_get_hiragana_reading(out):
    by_name = {r["name"]: r["aliases"].split(";") for r in out["items"]}
    assert "おの" in by_name["斧"]
    assert "べんけい" in by_name["弁慶"]
    assert by_name["カラビナ"] == [""]  # 漢字を含まない品には付けない


def test_tank1_r8_10_26_new_locations(out):
    assert ("後席前方", "4", "") in rows(out, "tank1", "夜行チョッキ(T機、P機含む)")
    assert ("前席中央", "2", "") in rows(out, "tank1", "ハンドメガホン")
    assert ("キャビン後部", "4", "") in rows(out, "tank1", "空気呼吸器")
    assert ("後部座席上部(後)", "", "一式") in rows(out, "tank1", "マルチガス検知器 (本体、ホース8m、1m)")
    assert ("後部座席上部(前) カメラBOX", "1", "") in rows(out, "tank1", "デジタル一眼レフカメラ(レンズ含む)")


def test_tank1_roof_split_kept(out):
    assert ("車両上部 左側", "1", "") in rows(out, "tank1", "三連はしご")
    assert ("車両上部", "2", "") in rows(out, "tank1", "吸管")


def test_tank1_no_vertical_label_fragments(out):
    names = {r["name"] for r in out["locations"] if r["vehicle_id"] == "tank1"}
    assert all(len(n) > 2 for n in names), names
    tank_items = {out["item"][s["item_id"]]["name"] for s in out["stock"] if out["loc"][s["location_id"]]["vehicle_id"] == "tank1"}
    assert not [n for n in tank_items if len(n) <= 1 and n not in ("斧",)]


def test_existing_ids_are_kept(tmp_path):
    existing = ROOT / "data"
    subprocess.run([sys.executable, str(ROOT / "tools/import_xlsx.py"), str(ROOT / "tools/fixtures"), str(tmp_path),
                    "--existing", str(existing)], check=True)
    def by(path, key, val):
        with open(path, encoding="utf-8") as f:
            return {r[key]: r[val] for r in csv.DictReader(f)}
    old_items, new_items = by(existing / "items.csv", "name", "item_id"), by(tmp_path / "items.csv", "name", "item_id")
    assert new_items["カラビナ"] == old_items["カラビナ"]
    assert new_items["三連はしご"] == old_items["三連はしご"]
    with open(tmp_path / "locations.csv", encoding="utf-8") as f:
        locs = {(r["vehicle_id"], r["name"]): r["location_id"] for r in csv.DictReader(f)}
    assert locs[("tank1", "車両上部 左側")] == "tank1-l29"
    assert locs[("pump1", "車両右側前シャッター内")] == "pump1-l05"
    new_ids = [v for k, v in locs.items() if k[1] in ("後席前方", "前席中央")]
    assert all(int(i.split("-l")[1]) > 29 for i in new_ids if i.startswith("tank1"))


def test_renamed_location_keeps_its_id(tmp_path):
    subprocess.run([sys.executable, str(ROOT / "tools/import_xlsx.py"), str(ROOT / "tools/fixtures"), str(tmp_path),
                    "--existing", str(ROOT / "data")], check=True)
    with open(tmp_path / "locations.csv", encoding="utf-8") as f:
        locs = {(r["vehicle_id"], r["name"]): r["location_id"] for r in csv.DictReader(f)}
    assert locs[("tank1", "後部座席上部(前) カメラBOX")] == "tank1-l08"
