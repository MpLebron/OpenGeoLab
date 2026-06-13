#!/usr/bin/env python3
"""Smoke test the UrbanM2M Suzhou expansion case data without live model calls."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import rasterio


REPO_ROOT = Path(__file__).resolve().parents[2]
CASE_PROJECT = REPO_ROOT / "server" / "case-seeds" / "urban-m2m-suzhou-expansion" / "project"
LAND_2010 = CASE_PROJECT / "data" / "Suzhou-Masked" / "year" / "land_2010.tif"
LAND_2013 = CASE_PROJECT / "data" / "Suzhou-Masked" / "year" / "land_2013.tif"
SIM_2013 = CASE_PROJECT / "data" / "Result" / "sim_2013.tif"
PROB_2013 = CASE_PROJECT / "data" / "Result" / "prob_2013.tif"


def read_raster(path: Path):
    if not path.exists():
        raise FileNotFoundError(path)

    with rasterio.open(path) as src:
        data = src.read(1, masked=True)
        meta = {
            "width": src.width,
            "height": src.height,
            "crs": str(src.crs),
            "res": tuple(float(v) for v in src.res),
            "nodata": None if src.nodata is None else float(src.nodata),
        }
    return data, meta


def main() -> int:
    land_2010, meta_2010 = read_raster(LAND_2010)
    land_2013, meta_2013 = read_raster(LAND_2013)
    sim_2013, meta_sim = read_raster(SIM_2013)
    prob_2013, meta_prob = read_raster(PROB_2013)

    for name, meta in {
        "land_2010": meta_2010,
        "land_2013": meta_2013,
        "sim_2013": meta_sim,
        "prob_2013": meta_prob,
    }.items():
        if meta["width"] != 5583 or meta["height"] != 5739:
            raise AssertionError(f"{name} has unexpected shape: {meta['width']} x {meta['height']}")
        if meta["crs"] != "EPSG:3857":
            raise AssertionError(f"{name} has unexpected CRS: {meta['crs']}")
        if meta["res"] != (30.0, 30.0):
            raise AssertionError(f"{name} has unexpected resolution: {meta['res']}")

    valid_mask = (~land_2013.mask) & (~sim_2013.mask)
    truth = land_2013.data[valid_mask]
    simulated = sim_2013.data[valid_mask]

    correct = int(((truth == 1) & (simulated == 1)).sum())
    missed = int(((truth == 1) & (simulated == 0)).sum())
    false_alarm = int(((truth == 0) & (simulated == 1)).sum())

    precision = correct / (correct + false_alarm)
    recall = correct / (correct + missed)
    f1 = 2 * precision * recall / (precision + recall)

    if not np.isclose(precision, 0.9979081280761451, rtol=0, atol=1e-6):
        raise AssertionError(f"Unexpected precision: {precision}")
    if not np.isclose(recall, 0.9416840197735117, rtol=0, atol=1e-6):
        raise AssertionError(f"Unexpected recall: {recall}")
    if not np.isclose(f1, 0.9689811731329472, rtol=0, atol=1e-6):
        raise AssertionError(f"Unexpected F1 score: {f1}")

    summary = {
        "land_2010_urban_pixels": int((land_2010.compressed() == 1).sum()),
        "land_2013_urban_pixels": int((land_2013.compressed() == 1).sum()),
        "sim_2013_urban_pixels": int((sim_2013.compressed() == 1).sum()),
        "prob_2013_valid_pixels": int(prob_2013.compressed().size),
        "precision": precision,
        "recall": recall,
        "f1": f1,
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"UrbanM2M smoke test failed: {exc}", file=sys.stderr)
        raise
