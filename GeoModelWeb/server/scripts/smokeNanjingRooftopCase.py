#!/usr/bin/env python3
"""Smoke test the Nanjing rooftop PV case data without live model calls."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import geopandas as gpd


REPO_ROOT = Path(__file__).resolve().parents[2]
CASE_PROJECT = REPO_ROOT / "server" / "case-seeds" / "nanjing-rooftop-pv" / "project"
INPUT_SHP = CASE_PROJECT / "data" / "xuanwu" / "xuanwu.shp"
INPUT_ZIP = CASE_PROJECT / "data" / "xuanwu_rooftop.zip"
RESULT_SHP = CASE_PROJECT / "data" / "result" / "roof_results_with_power_generation.shp"
RESULT_ZIP = CASE_PROJECT / "data" / "SolarCalculation-roofSloar.zip"


def main() -> int:
    if not INPUT_SHP.exists():
        raise FileNotFoundError(INPUT_SHP)
    if not INPUT_ZIP.exists():
        raise FileNotFoundError(INPUT_ZIP)
    if not RESULT_SHP.exists():
        raise FileNotFoundError(RESULT_SHP)
    if not RESULT_ZIP.exists():
        raise FileNotFoundError(RESULT_ZIP)

    rooftops = gpd.read_file(INPUT_SHP)
    result = gpd.read_file(RESULT_SHP)

    if len(rooftops) != 19128:
        raise AssertionError(f"Expected 19128 rooftop features, got {len(rooftops)}")
    if len(result) != 19128:
        raise AssertionError(f"Expected 19128 result features, got {len(result)}")

    for field in ["area"]:
        if field not in rooftops.columns:
            raise AssertionError(f"Input rooftop data is missing field: {field}")

    for field in ["area", "mean_radia", "installed_", "power_gene"]:
        if field not in result.columns:
            raise AssertionError(f"Reference result data is missing field: {field}")

    summary = {
        "input_features": int(len(rooftops)),
        "result_features": int(len(result)),
        "total_power_generation_kwh": float(result["power_gene"].sum()),
        "total_rooftop_area_m2": float(result["area"].sum()),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Nanjing rooftop PV smoke test failed: {exc}", file=sys.stderr)
        raise
