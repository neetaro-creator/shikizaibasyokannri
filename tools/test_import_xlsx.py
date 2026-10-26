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
