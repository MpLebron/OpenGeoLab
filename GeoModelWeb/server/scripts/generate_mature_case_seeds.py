#!/usr/bin/env python3
"""Generate complex OpenGeoLab case seeds with bundled offline data.

The generated notebooks are intentionally longer than the compact teaching
seeds. They mirror mature public geospatial notebook workflows while keeping
all data local so OpenGeoLab can run them without external downloads.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import geopandas as gpd
import nbformat as nbf
import numpy as np
import pandas as pd
import rasterio
import xarray as xr
from PIL import Image, ImageDraw
from rasterio.transform import from_origin
from shapely.geometry import Point, Polygon


ROOT = Path(__file__).resolve().parents[1] / "case-seeds"


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def notebook(cells: list[tuple[str, str]]) -> nbf.NotebookNode:
    nb = nbf.v4.new_notebook()
    nb["metadata"] = {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {
            "name": "python",
            "pygments_lexer": "ipython3",
        },
    }
    nb["cells"] = [
        nbf.v4.new_markdown_cell(source) if kind == "markdown" else nbf.v4.new_code_cell(source)
        for kind, source in cells
    ]
    return nb


def write_notebook(path: Path, cells: list[tuple[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    nbf.write(notebook(cells), path)


def write_cover(path: Path, title: str, palette: tuple[str, str, str]) -> None:
    a, b, c = palette
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 400">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="{a}"/>
      <stop offset="0.55" stop-color="{b}"/>
      <stop offset="1" stop-color="{c}"/>
    </linearGradient>
  </defs>
  <rect width="720" height="400" fill="url(#g)"/>
  <path d="M0 300 C110 250 200 340 320 275 C430 220 510 275 720 205 L720 400 L0 400 Z" fill="rgba(255,255,255,0.22)"/>
  <path d="M0 330 C160 290 260 360 410 305 C520 265 590 300 720 260 L720 400 L0 400 Z" fill="rgba(255,255,255,0.25)"/>
  <circle cx="600" cy="92" r="58" fill="rgba(255,255,255,0.22)"/>
  <text x="48" y="86" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700" fill="#fff">{title}</text>
  <text x="48" y="128" font-family="Inter,Arial,sans-serif" font-size="18" fill="rgba(255,255,255,0.86)">Complex OpenGeoLab notebook case</text>
</svg>
"""
    write_text(path, svg)


def manifest(
    slug: str,
    title: str,
    summary: str,
    description: str,
    domain: str,
    runtime: str,
    tags: list[str],
    steps: list[str],
    expected: list[str],
    references: list[str],
) -> dict:
    return {
        "source": "opengeolab-mature-workflow-case",
        "sourceId": slug,
        "title": title,
        "summary": summary,
        "description": description,
        "domain": domain,
        "tags": tags,
        "authors": ["OpenGeoLab Mature Case Curation"],
        "authorLine": "OpenGeoLab Mature Case Curation",
        "timeLabel": "2026/06/17",
        "runtimeImageId": runtime,
        "coreNotebook": "main.ipynb",
        "coverFileName": "cover.svg",
        "datasets": [
            {
                "name": "Bundled offline analysis dataset",
                "path": "data/",
                "type": "Local files",
                "description": "Project-local inputs generated for a reproducible mature workflow.",
            }
        ],
        "steps": steps,
        "expectedResults": expected,
        "references": references,
    }


def readme(title: str, description: str, steps: list[str], references: list[str]) -> str:
    step_lines = "\n".join(f"{idx + 1}. {step}" for idx, step in enumerate(steps))
    ref_lines = "\n".join(f"- {ref}" for ref in references)
    return f"""# {title}

{description}

## Data
- `data/` - Bundled local inputs. The notebook does not download external data.
- `outputs/` - Created when the notebook is executed.

## Workflow
{step_lines}

## Reference Workflows
{ref_lines}

## Source Notes
This case is a local, reproducible OpenGeoLab adaptation of mature public geospatial workflows. It does not copy third-party notebooks or require remote data at runtime.
"""


def reset_case(slug: str) -> Path:
    case_dir = ROOT / slug
    if case_dir.exists():
        for path in sorted(case_dir.rglob("*"), reverse=True):
            if path.is_file() or path.is_symlink():
                path.unlink()
            elif path.is_dir():
                path.rmdir()
    (case_dir / "project" / "data").mkdir(parents=True, exist_ok=True)
    (case_dir / "project" / "outputs").mkdir(parents=True, exist_ok=True)
    return case_dir


def polygon_grid(nx: int, ny: int, x0: float, y0: float, dx: float, dy: float) -> list[Polygon]:
    polygons = []
    for j in range(ny):
        for i in range(nx):
            x = x0 + i * dx
            y = y0 + j * dy
            polygons.append(Polygon([(x, y), (x + dx, y), (x + dx, y + dy), (x, y + dy)]))
    return polygons


def create_climate_case() -> None:
    slug = "climate-extreme-risk-atlas"
    title = "Climate Extreme Risk Atlas"
    case_dir = reset_case(slug)
    data_dir = case_dir / "project" / "data"
    rng = np.random.default_rng(42)

    time = pd.date_range("2018-01-01", "2022-12-31", freq="D")
    lat = np.linspace(31.1, 32.25, 12)
    lon = np.linspace(118.35, 119.85, 16)
    yy, xx = np.meshgrid(lat, lon, indexing="ij")
    urban = np.exp(-(((xx - 119.1) / 0.34) ** 2 + ((yy - 31.72) / 0.26) ** 2))
    urban = np.clip(urban + 0.12 * rng.random(urban.shape), 0, 1)
    elevation = 45 + 150 * np.exp(-(((xx - 118.55) / 0.18) ** 2 + ((yy - 32.05) / 0.22) ** 2)) + 20 * rng.random(urban.shape)
    population = (800 + 7800 * urban + 1200 * rng.random(urban.shape)).astype(float)

    doy = time.dayofyear.values
    seasonal = 24 + 12 * np.sin(2 * np.pi * (doy - 120) / 365.25)
    trend = np.linspace(0, 1.25, len(time))
    tasmax = (
        seasonal[:, None, None]
        + trend[:, None, None]
        + 2.4 * urban[None, :, :]
        - 0.005 * elevation[None, :, :]
        + rng.normal(0, 2.1, (len(time), len(lat), len(lon)))
    )
    monsoon = 0.65 + 0.95 * np.maximum(0, np.sin(2 * np.pi * (doy - 145) / 365.25))
    precip = rng.gamma(1.2, 5.5, (len(time), len(lat), len(lon))) * monsoon[:, None, None]
    extreme_days = rng.random((len(time), 1, 1)) < 0.035
    storm_pattern = 28 * np.exp(-(((xx - 119.25) / 0.42) ** 2 + ((yy - 31.55) / 0.3) ** 2))
    precip += extreme_days * storm_pattern[None, :, :]

    ds = xr.Dataset(
        data_vars={
            "tasmax": (("time", "lat", "lon"), tasmax.astype("float32")),
            "precip": (("time", "lat", "lon"), precip.astype("float32")),
            "urban_fraction": (("lat", "lon"), urban.astype("float32")),
            "elevation": (("lat", "lon"), elevation.astype("float32")),
            "population": (("lat", "lon"), population.astype("float32")),
        },
        coords={"time": time, "lat": lat, "lon": lon},
        attrs={"description": "Synthetic but realistic city climate panel for offline extreme-risk analysis."},
    )
    ds.to_netcdf(data_dir / "city_climate_daily.nc")

    steps = [
        "Load a multi-year gridded climate panel and inspect variables, dimensions, and missingness.",
        "Map urban fraction, elevation, and annual heat exposure to understand the analysis domain.",
        "Compute seasonal climatology and daily percentile thresholds for heatwave detection.",
        "Estimate annual heatwave days and extreme precipitation days for every grid cell.",
        "Compare urban and rural time series to quantify the urban heat island signal.",
        "Fit per-cell linear trends for heat and precipitation extremes.",
        "Run an EOF/PCA decomposition to summarize dominant space-time risk patterns.",
        "Build a population-weighted compound risk index and rank hotspot cells.",
        "Write maps, tables, and a machine-readable risk atlas under outputs/.",
    ]
    refs = [
        "Project Pythia Cookbook Gallery: https://cookbooks.projectpythia.org/",
        "CMIP6 Cookbook: https://projectpythia.org/cmip6-cookbook/",
        "Xarray documentation: https://docs.xarray.dev/",
    ]
    write_json(
        case_dir / "case.json",
        manifest(
            slug,
            title,
            "A Pangeo-style climate notebook for heatwave, rainfall, trend, EOF, and compound-risk mapping.",
            "This case follows mature xarray/Pangeo climate-analysis patterns with bundled NetCDF data, percentile extremes, trend maps, EOF decomposition, and risk-ranking outputs.",
            "Climate Risk Analytics",
            "opengms-pangeo-earth",
            ["Xarray", "Pangeo", "Climate Extremes", "Risk Atlas", "PCA"],
            steps,
            [
                "Executed notebook with heatwave, rainfall, trend, EOF, and compound-risk outputs.",
                "CSV hotspot ranking plus PNG maps saved to outputs/.",
                "No external data downloads during runtime.",
            ],
            refs,
        ),
    )
    write_text(case_dir / "project" / "README.md", readme(title, "A multi-stage climate-risk analysis workflow using local NetCDF data.", steps, refs))
    write_cover(case_dir / "cover.svg", title, ("#0e7490", "#2563eb", "#f97316"))
    write_notebook(
        case_dir / "project" / "main.ipynb",
        [
            ("markdown", f"# {title}\n\nThis mature case mirrors Pangeo-style climate notebooks with an offline city climate cube. It moves from climate data QA to extreme indices, trend diagnostics, EOF decomposition, and population-weighted risk ranking."),
            ("code", """from pathlib import Path
import os, warnings
os.environ.setdefault("PROJ_LIB", "/opt/conda/share/proj")
os.environ.setdefault("PROJ_DATA", "/opt/conda/share/proj")
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import xarray as xr
import matplotlib.pyplot as plt
from IPython.display import display, Markdown
PROJECT = Path.cwd()
DATA = PROJECT / "data"
OUTPUTS = PROJECT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
print(f"Project: {PROJECT}")
print(f"Data files: {[p.name for p in sorted(DATA.iterdir())]}")"""),
            ("code", """ds = xr.open_dataset(DATA / "city_climate_daily.nc")
summary = pd.DataFrame({
    "variable": list(ds.data_vars),
    "dims": [str(ds[v].dims) for v in ds.data_vars],
    "min": [float(ds[v].min()) for v in ds.data_vars],
    "max": [float(ds[v].max()) for v in ds.data_vars],
})
display(ds)
display(summary.round(2))"""),
            ("code", """fig, axes = plt.subplots(1, 3, figsize=(15, 4), constrained_layout=True)
ds["urban_fraction"].plot(ax=axes[0], cmap="magma", add_colorbar=True)
axes[0].set_title("Urban fraction")
ds["elevation"].plot(ax=axes[1], cmap="terrain", add_colorbar=True)
axes[1].set_title("Elevation")
ds["tasmax"].mean("time").plot(ax=axes[2], cmap="inferno", add_colorbar=True)
axes[2].set_title("Mean daily maximum temperature")
fig.savefig(OUTPUTS / "climate_domain_overview.png", dpi=160)
plt.show()
print("Saved outputs/climate_domain_overview.png")"""),
            ("code", """monthly = ds[["tasmax", "precip"]].groupby("time.month").mean()
clim_table = pd.DataFrame({
    "month": monthly.month.values,
    "tasmax_c": monthly["tasmax"].mean(["lat", "lon"]).values,
    "precip_mm_day": monthly["precip"].mean(["lat", "lon"]).values,
})
fig, ax1 = plt.subplots(figsize=(10, 4))
ax1.plot(clim_table["month"], clim_table["tasmax_c"], color="#dc2626", marker="o", label="Tasmax")
ax1.set_ylabel("Tasmax (C)")
ax2 = ax1.twinx()
ax2.bar(clim_table["month"], clim_table["precip_mm_day"], alpha=0.35, color="#2563eb", label="Precip")
ax2.set_ylabel("Precipitation (mm/day)")
ax1.set_title("Seasonal climatology")
fig.savefig(OUTPUTS / "seasonal_climatology.png", dpi=160)
plt.show()
display(clim_table.round(2))"""),
            ("code", """baseline = ds.sel(time=slice("2018-01-01", "2020-12-31"))
heat_threshold = baseline["tasmax"].quantile(0.9, dim="time")
heatwave = ds["tasmax"] > heat_threshold
annual_heat = heatwave.groupby("time.year").sum("time")
fig, axes = plt.subplots(1, 2, figsize=(12, 4), constrained_layout=True)
heat_threshold.plot(ax=axes[0], cmap="inferno")
axes[0].set_title("90th percentile tasmax threshold")
annual_heat.sel(year=2022).plot(ax=axes[1], cmap="Reds")
axes[1].set_title("Heatwave days in 2022")
fig.savefig(OUTPUTS / "heatwave_threshold_and_days.png", dpi=160)
plt.show()
display(annual_heat.mean(["lat", "lon"]).to_dataframe(name="city_mean_heatwave_days").round(2))"""),
            ("code", """rain_threshold = baseline["precip"].quantile(0.95, dim="time")
extreme_rain = ds["precip"] > rain_threshold
annual_rain = extreme_rain.groupby("time.year").sum("time")
fig, axes = plt.subplots(1, 2, figsize=(12, 4), constrained_layout=True)
rain_threshold.plot(ax=axes[0], cmap="Blues")
axes[0].set_title("95th percentile rain threshold")
annual_rain.sel(year=2022).plot(ax=axes[1], cmap="PuBuGn")
axes[1].set_title("Extreme rain days in 2022")
fig.savefig(OUTPUTS / "rain_extremes.png", dpi=160)
plt.show()
display(annual_rain.mean(["lat", "lon"]).to_dataframe(name="city_mean_extreme_rain_days").round(2))"""),
            ("code", """urban_mask = ds["urban_fraction"] >= 0.55
rural_mask = ds["urban_fraction"] <= 0.25
urban_ts = ds["tasmax"].where(urban_mask).mean(["lat", "lon"])
rural_ts = ds["tasmax"].where(rural_mask).mean(["lat", "lon"])
uhi = (urban_ts - rural_ts).resample(time="MS").mean()
fig, ax = plt.subplots(figsize=(11, 4))
uhi.plot(ax=ax, color="#ef4444")
ax.axhline(float(uhi.mean()), color="black", linestyle="--", label="mean UHI")
ax.set_title("Monthly urban heat island signal")
ax.legend()
fig.savefig(OUTPUTS / "urban_heat_island_timeseries.png", dpi=160)
plt.show()
print(f"Mean monthly UHI: {float(uhi.mean()):.2f} C")"""),
            ("code", """years = annual_heat.year.values.astype(float)
def slope_per_year(values):
    return np.polyfit(years, values, 1)[0]
heat_slope = xr.apply_ufunc(
    slope_per_year,
    annual_heat,
    input_core_dims=[["year"]],
    vectorize=True,
    output_dtypes=[float],
)
rain_slope = xr.apply_ufunc(
    slope_per_year,
    annual_rain,
    input_core_dims=[["year"]],
    vectorize=True,
    output_dtypes=[float],
)
fig, axes = plt.subplots(1, 2, figsize=(12, 4), constrained_layout=True)
heat_slope.plot(ax=axes[0], cmap="RdBu_r", center=0)
axes[0].set_title("Heatwave-day trend (days/year)")
rain_slope.plot(ax=axes[1], cmap="BrBG", center=0)
axes[1].set_title("Extreme-rain trend (days/year)")
fig.savefig(OUTPUTS / "extreme_trend_maps.png", dpi=160)
plt.show()
print(f"Median heatwave trend: {float(heat_slope.median()):.2f} days/year")"""),
            ("code", """annual_stack = xr.concat([
    annual_heat.rename("heatwave_days"),
    annual_rain.rename("extreme_rain_days")
], dim=pd.Index(["heat", "rain"], name="metric")).transpose("year", "metric", "lat", "lon")
matrix = annual_stack.values.reshape(len(years), -1)
matrix = matrix - matrix.mean(axis=0)
u, s, vt = np.linalg.svd(matrix, full_matrices=False)
pc1 = pd.Series(u[:, 0] * s[0], index=annual_heat.year.values, name="PC1")
eof1 = xr.DataArray(vt[0].reshape(2, len(ds.lat), len(ds.lon))[0], coords={"lat": ds.lat, "lon": ds.lon}, dims=("lat", "lon"))
fig, axes = plt.subplots(1, 2, figsize=(12, 4), constrained_layout=True)
pc1.plot(ax=axes[0], marker="o", color="#7c3aed")
axes[0].set_title("Dominant annual risk score")
eof1.plot(ax=axes[1], cmap="RdBu_r", center=0)
axes[1].set_title("EOF1 loading for heat metric")
fig.savefig(OUTPUTS / "climate_eof_diagnostics.png", dpi=160)
plt.show()
print(f"EOF1 explained variance: {(s[0] ** 2 / (s ** 2).sum()):.2%}")"""),
            ("code", """heat_2022 = annual_heat.sel(year=2022)
rain_2022 = annual_rain.sel(year=2022)
z_heat = (heat_2022 - heat_2022.mean()) / heat_2022.std()
z_rain = (rain_2022 - rain_2022.mean()) / rain_2022.std()
z_pop = (ds["population"] - ds["population"].mean()) / ds["population"].std()
risk = (0.45 * z_heat + 0.30 * z_rain + 0.25 * z_pop).rename("compound_risk")
risk_table = risk.to_dataframe().reset_index()
risk_table["population"] = ds["population"].values.ravel()
risk_table["heatwave_days"] = heat_2022.values.ravel()
risk_table["extreme_rain_days"] = rain_2022.values.ravel()
risk_table = risk_table.sort_values("compound_risk", ascending=False).head(12)
fig, ax = plt.subplots(figsize=(7, 5))
risk.plot(ax=ax, cmap="Spectral_r")
ax.set_title("Compound climate risk index, 2022")
fig.savefig(OUTPUTS / "compound_climate_risk.png", dpi=160)
plt.show()
display(risk_table.round(3))"""),
            ("code", """exports = {
    "annual_heatwave_days.csv": annual_heat.mean(["lat", "lon"]).to_dataframe(name="city_mean_heatwave_days"),
    "annual_extreme_rain_days.csv": annual_rain.mean(["lat", "lon"]).to_dataframe(name="city_mean_extreme_rain_days"),
    "compound_risk_top_cells.csv": risk_table,
}
for name, frame in exports.items():
    frame.to_csv(OUTPUTS / name)
print("Exported files:")
for path in sorted(OUTPUTS.iterdir()):
    print(f"- {path.name} ({path.stat().st_size} bytes)")"""),
            ("code", """display(Markdown(f'''## Case conclusion

The city climate cube shows a mean monthly urban heat island of **{float(uhi.mean()):.2f} C**. The highest compound-risk cells combine dense population, high 2022 heatwave frequency, and elevated extreme-rain exposure. These cells are exported in `compound_risk_top_cells.csv` for follow-up adaptation planning.
'''))"""),
        ],
    )


def create_urban_access_case() -> None:
    slug = "urban-accessibility-equity-scenarios"
    title = "Urban Accessibility Equity Scenarios"
    case_dir = reset_case(slug)
    data_dir = case_dir / "project" / "data"
    rng = np.random.default_rng(7)

    nodes = []
    node_id = 0
    for j in range(8):
        for i in range(9):
            nodes.append(
                {
                    "node": node_id,
                    "x": 118.72 + i * 0.018 + rng.normal(0, 0.0015),
                    "y": 32.00 + j * 0.014 + rng.normal(0, 0.0012),
                    "district": f"D{j // 2 + 1}",
                }
            )
            node_id += 1
    nodes_df = pd.DataFrame(nodes)
    edges = []
    for j in range(8):
        for i in range(9):
            n = j * 9 + i
            for di, dj in [(1, 0), (0, 1)]:
                ni, nj = i + di, j + dj
                if ni < 9 and nj < 8:
                    m = nj * 9 + ni
                    dx = (nodes_df.loc[n, "x"] - nodes_df.loc[m, "x"]) * 88000
                    dy = (nodes_df.loc[n, "y"] - nodes_df.loc[m, "y"]) * 111000
                    length = float((dx * dx + dy * dy) ** 0.5)
                    walk_speed = 78 + 8 * rng.normal()
                    edges.append({"u": n, "v": m, "length_m": length, "walk_min": length / max(walk_speed, 55)})
                    edges.append({"u": m, "v": n, "length_m": length, "walk_min": length / max(walk_speed, 55)})
    edges_df = pd.DataFrame(edges)

    polys = polygon_grid(4, 4, 118.705, 31.985, 0.042, 0.031)
    zones = gpd.GeoDataFrame(
        {
            "zone_id": [f"Z{i+1:02d}" for i in range(len(polys))],
            "population": rng.integers(900, 5200, len(polys)),
            "low_income": np.clip(rng.normal(0.42, 0.16, len(polys)), 0.08, 0.82),
            "elderly": np.clip(rng.normal(0.18, 0.08, len(polys)), 0.04, 0.43),
            "car_free": np.clip(rng.normal(0.36, 0.18, len(polys)), 0.05, 0.8),
        },
        geometry=polys,
        crs="EPSG:4326",
    )
    centroids = zones.geometry.representative_point()
    zones["nearest_node"] = [
        int(((nodes_df["x"] - p.x) ** 2 + (nodes_df["y"] - p.y) ** 2).idxmin())
        for p in centroids
    ]
    facilities = pd.DataFrame(
        {
            "facility_id": [f"F{i+1}" for i in range(8)],
            "type": ["clinic", "clinic", "school", "school", "park", "park", "clinic", "park"],
            "node": [5, 22, 14, 53, 9, 66, 39, 45],
            "capacity": [1100, 1400, 1800, 1600, 2200, 2600, 1250, 2100],
        }
    )
    candidates = pd.DataFrame({"candidate_id": [f"C{i+1}" for i in range(10)], "node": [2, 11, 18, 27, 33, 41, 49, 57, 62, 70]})
    nodes_df.to_csv(data_dir / "nodes.csv", index=False)
    edges_df.to_csv(data_dir / "edges.csv", index=False)
    facilities.to_csv(data_dir / "facilities.csv", index=False)
    candidates.to_csv(data_dir / "candidate_facilities.csv", index=False)
    zones.to_file(data_dir / "neighborhoods.geojson", driver="GeoJSON")

    steps = [
        "Load local street nodes, weighted edges, neighborhoods, existing facilities, and candidate sites.",
        "Build a directed walking graph and audit graph connectivity and travel-time assumptions.",
        "Snap neighborhood demand to network nodes and compute vulnerability-weighted demand.",
        "Calculate shortest walking time from every neighborhood to each facility class.",
        "Map baseline access gaps and summarize who is outside a 12 minute service threshold.",
        "Run a greedy scenario optimizer that adds candidate facilities to maximize vulnerable-population coverage.",
        "Compare baseline and scenario access by district and social group.",
        "Run a walking-speed sensitivity test for slower pedestrian groups.",
        "Export accessibility tables, maps, and scenario rankings to outputs/.",
    ]
    refs = [
        "OSMnx examples gallery: https://github.com/gboeing/osmnx-examples",
        "NetworkX geospatial example: https://networkx.org/documentation/stable/auto_examples/geospatial/plot_osmnx.html",
        "OSMnx documentation: https://osmnx.readthedocs.io/",
    ]
    write_json(case_dir / "case.json", manifest(slug, title, "A multi-step network accessibility case with equity metrics and facility siting scenarios.", "This case adapts mature OSMnx/NetworkX accessibility workflows to a bundled offline street network, then adds equity screening and scenario optimization.", "Urban Mobility and Equity", "opengms-urban-mobility", ["NetworkX", "OSMnx Pattern", "Accessibility", "Equity", "Facility Location"], steps, ["Baseline and scenario accessibility maps.", "Greedy facility siting ranking.", "Equity and sensitivity tables saved under outputs/."], refs))
    write_text(case_dir / "project" / "README.md", readme(title, "A complex urban accessibility and scenario-planning notebook with local network data.", steps, refs))
    write_cover(case_dir / "cover.svg", title, ("#14532d", "#0f766e", "#facc15"))
    write_notebook(
        case_dir / "project" / "main.ipynb",
        [
            ("markdown", f"# {title}\n\nThis case follows mature street-network accessibility workflows: graph construction, travel-time impedance, demand weighting, baseline gap diagnosis, scenario optimization, and sensitivity testing."),
            ("code", """from pathlib import Path
import os, warnings
os.environ.setdefault("PROJ_LIB", "/opt/conda/share/proj")
os.environ.setdefault("PROJ_DATA", "/opt/conda/share/proj")
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import geopandas as gpd
import networkx as nx
import matplotlib.pyplot as plt
from shapely.geometry import Point
from IPython.display import display, Markdown
PROJECT = Path.cwd()
DATA = PROJECT / "data"
OUTPUTS = PROJECT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
print("Data files:", [p.name for p in sorted(DATA.iterdir())])"""),
            ("code", """nodes = pd.read_csv(DATA / "nodes.csv")
edges = pd.read_csv(DATA / "edges.csv")
facilities = pd.read_csv(DATA / "facilities.csv")
candidates = pd.read_csv(DATA / "candidate_facilities.csv")
zones = gpd.read_file(DATA / "neighborhoods.geojson")
display(nodes.head())
display(edges.head())
display(zones[["zone_id", "population", "low_income", "elderly", "car_free", "nearest_node"]].head())"""),
            ("code", """G = nx.DiGraph()
for row in nodes.itertuples(index=False):
    G.add_node(int(row.node), x=float(row.x), y=float(row.y), district=row.district)
for row in edges.itertuples(index=False):
    G.add_edge(int(row.u), int(row.v), length_m=float(row.length_m), walk_min=float(row.walk_min))
components = nx.number_weakly_connected_components(G)
total_length_km = edges["length_m"].sum() / 2 / 1000
print(f"Graph nodes={G.number_of_nodes()}, directed_edges={G.number_of_edges()}, weak_components={components}, undirected_length={total_length_km:.1f} km")"""),
            ("code", """fig, ax = plt.subplots(figsize=(8, 7))
zones.plot(ax=ax, color="#f8fafc", edgecolor="#94a3b8", linewidth=1)
for row in edges.itertuples(index=False):
    a = nodes.loc[nodes.node == row.u].iloc[0]
    b = nodes.loc[nodes.node == row.v].iloc[0]
    ax.plot([a.x, b.x], [a.y, b.y], color="#64748b", linewidth=0.4, alpha=0.35)
ax.scatter(nodes.x, nodes.y, s=10, color="#334155", label="network nodes")
fac_xy = facilities.merge(nodes, left_on="node", right_on="node")
ax.scatter(fac_xy.x, fac_xy.y, s=80, color="#dc2626", marker="*", label="existing facilities")
ax.set_title("Offline walking network and facility inventory")
ax.legend(loc="lower right")
fig.savefig(OUTPUTS / "network_inventory.png", dpi=170)
plt.show()
print("Saved outputs/network_inventory.png")"""),
            ("code", """zones["vulnerability"] = (
    0.45 * zones["low_income"] + 0.30 * zones["car_free"] + 0.25 * zones["elderly"]
)
zones["weighted_demand"] = zones["population"] * (1 + zones["vulnerability"])
display(zones[["zone_id", "population", "vulnerability", "weighted_demand"]].sort_values("weighted_demand", ascending=False).head(8).round(2))"""),
            ("code", """facility_nodes = sorted(facilities["node"].unique())
dist_to_fac = {}
for zone in zones.itertuples():
    lengths = nx.single_source_dijkstra_path_length(G, int(zone.nearest_node), weight="walk_min")
    dist_to_fac[zone.zone_id] = min(lengths.get(int(node), np.inf) for node in facility_nodes)
zones["nearest_facility_min"] = zones["zone_id"].map(dist_to_fac)
zones["access_gap"] = np.maximum(0, zones["nearest_facility_min"] - 12)
zones["gap_score"] = zones["access_gap"] * zones["weighted_demand"]
display(zones[["zone_id", "nearest_facility_min", "access_gap", "gap_score"]].sort_values("gap_score", ascending=False).round(2))"""),
            ("code", """fig, axes = plt.subplots(1, 2, figsize=(13, 5), constrained_layout=True)
zones.plot(column="nearest_facility_min", ax=axes[0], cmap="YlOrRd", legend=True, edgecolor="white")
axes[0].set_title("Baseline walking time to nearest facility")
zones.plot(column="gap_score", ax=axes[1], cmap="magma", legend=True, edgecolor="white")
axes[1].set_title("Vulnerability-weighted access gap")
for ax in axes:
    ax.set_axis_off()
fig.savefig(OUTPUTS / "baseline_access_gap.png", dpi=170)
plt.show()
print("Saved outputs/baseline_access_gap.png")"""),
            ("code", """def evaluate_added_sites(site_nodes, threshold=12):
    active = sorted(set(facility_nodes) | set(site_nodes))
    minutes = []
    for zone in zones.itertuples():
        lengths = nx.single_source_dijkstra_path_length(G, int(zone.nearest_node), weight="walk_min")
        minutes.append(min(lengths.get(int(node), np.inf) for node in active))
    minutes = np.asarray(minutes)
    covered = minutes <= threshold
    vulnerable_covered = float(zones.loc[covered, "weighted_demand"].sum())
    gap_score = float((np.maximum(0, minutes - threshold) * zones["weighted_demand"].values).sum())
    return vulnerable_covered, gap_score, minutes

baseline_cov, baseline_gap, _ = evaluate_added_sites([])
rows = []
for cand in candidates.itertuples(index=False):
    cov, gap, _ = evaluate_added_sites([int(cand.node)])
    rows.append({"candidate_id": cand.candidate_id, "node": int(cand.node), "added_covered_demand": cov - baseline_cov, "remaining_gap_score": gap})
candidate_scores = pd.DataFrame(rows).sort_values(["added_covered_demand", "remaining_gap_score"], ascending=[False, True])
display(candidate_scores.round(2))"""),
            ("code", """selected = []
history = []
for step in range(3):
    best = None
    for cand in candidates.itertuples(index=False):
        if int(cand.node) in selected:
            continue
        cov, gap, minutes = evaluate_added_sites(selected + [int(cand.node)])
        score = cov - 0.001 * gap
        record = {"step": step + 1, "candidate_id": cand.candidate_id, "node": int(cand.node), "covered_demand": cov, "gap_score": gap, "score": score}
        if best is None or score > best["score"]:
            best = record
    selected.append(best["node"])
    history.append(best)
scenario = pd.DataFrame(history)
_, scenario_gap, scenario_minutes = evaluate_added_sites(selected)
zones["scenario_min"] = scenario_minutes
zones["scenario_improvement"] = zones["nearest_facility_min"] - zones["scenario_min"]
display(scenario.round(2))
print(f"Selected candidate nodes: {selected}")"""),
            ("code", """fig, axes = plt.subplots(1, 2, figsize=(13, 5), constrained_layout=True)
zones.plot(column="scenario_min", ax=axes[0], cmap="YlGnBu", legend=True, edgecolor="white")
axes[0].set_title("Scenario walking time after three added sites")
zones.plot(column="scenario_improvement", ax=axes[1], cmap="Greens", legend=True, edgecolor="white")
axes[1].set_title("Minutes improved")
for ax in axes:
    ax.set_axis_off()
fig.savefig(OUTPUTS / "scenario_access_improvement.png", dpi=170)
plt.show()
print("Saved outputs/scenario_access_improvement.png")"""),
            ("code", """district_summary = zones.assign(district=zones["zone_id"].str.slice(0, 1) + ((zones.index // 4) + 1).astype(str)).groupby("district").agg(
    population=("population", "sum"),
    vulnerability=("vulnerability", "mean"),
    baseline_min=("nearest_facility_min", "mean"),
    scenario_min=("scenario_min", "mean"),
    improvement=("scenario_improvement", "mean"),
)
display(district_summary.round(2))
district_summary.to_csv(OUTPUTS / "district_access_summary.csv")"""),
            ("code", """slow_factor = 1.25
slow_gap = zones["nearest_facility_min"] * slow_factor - 12
zones["slow_pedestrian_gap"] = np.maximum(0, slow_gap)
sensitivity = zones[["zone_id", "nearest_facility_min", "scenario_min", "slow_pedestrian_gap", "vulnerability"]].copy()
fig, ax = plt.subplots(figsize=(8, 4))
ax.scatter(sensitivity["vulnerability"], sensitivity["slow_pedestrian_gap"], s=zones["population"] / 35, alpha=0.65, color="#ea580c")
ax.set_xlabel("Vulnerability index")
ax.set_ylabel("Slow-pedestrian gap (min)")
ax.set_title("Sensitivity: access gap for slower walking speed")
fig.savefig(OUTPUTS / "slow_walker_sensitivity.png", dpi=170)
plt.show()
display(sensitivity.sort_values("slow_pedestrian_gap", ascending=False).head(8).round(2))"""),
            ("code", """zones.drop(columns="geometry").to_csv(OUTPUTS / "zone_access_scenario_results.csv", index=False)
candidate_scores.to_csv(OUTPUTS / "candidate_site_scores.csv", index=False)
scenario.to_csv(OUTPUTS / "selected_facility_scenario.csv", index=False)
print("Exported files:")
for path in sorted(OUTPUTS.iterdir()):
    print(f"- {path.name} ({path.stat().st_size} bytes)")"""),
            ("code", """worst = zones.sort_values("gap_score", ascending=False).iloc[0]
display(Markdown(f'''## Case conclusion

The highest baseline gap is **{worst.zone_id}**, with {worst.nearest_facility_min:.1f} minutes to the nearest facility. The greedy three-site scenario selects nodes **{selected}**, reducing the citywide weighted gap score from **{baseline_gap:,.0f}** to **{scenario_gap:,.0f}**.
'''))"""),
        ],
    )


def create_spatial_stats_case() -> None:
    slug = "spatial-econometric-housing-diagnostics"
    title = "Spatial Econometric Housing Diagnostics"
    case_dir = reset_case(slug)
    data_dir = case_dir / "project" / "data"
    rng = np.random.default_rng(21)
    nxg, nyg = 12, 10
    polys = polygon_grid(nxg, nyg, 118.5, 31.8, 0.025, 0.022)
    xs = np.tile(np.arange(nxg), nyg)
    ys = np.repeat(np.arange(nyg), nxg)
    center_dist = np.sqrt((xs - 5.5) ** 2 + (ys - 4.5) ** 2)
    income = 8.2 + 0.35 * (nxg - center_dist) + rng.normal(0, 0.45, len(polys))
    transit = np.clip(1 - center_dist / center_dist.max() + rng.normal(0, 0.08, len(polys)), 0, 1)
    green = np.clip(0.25 + 0.45 * np.sin(xs / 2.4) + 0.2 * rng.random(len(polys)), 0.02, 0.9)
    old_building = np.clip(0.55 - 0.04 * xs + 0.03 * ys + rng.normal(0, 0.08, len(polys)), 0.05, 0.9)
    noise = rng.normal(0, 0.08, (nyg, nxg))
    smooth = noise.copy()
    for _ in range(5):
        smooth = (
            smooth
            + np.roll(smooth, 1, 0)
            + np.roll(smooth, -1, 0)
            + np.roll(smooth, 1, 1)
            + np.roll(smooth, -1, 1)
        ) / 5
    spatial_error = smooth.ravel()
    price = 2.8 + 0.38 * income + 0.72 * transit + 0.35 * green - 0.55 * old_building + spatial_error + rng.normal(0, 0.18, len(polys))
    gdf = gpd.GeoDataFrame(
        {
            "zone_id": [f"H{i+1:03d}" for i in range(len(polys))],
            "income": income,
            "transit": transit,
            "green": green,
            "old_building": old_building,
            "price": price,
        },
        geometry=polys,
        crs="EPSG:4326",
    )
    gdf.to_file(data_dir / "housing_zones.geojson", driver="GeoJSON")
    steps = [
        "Load a polygon housing market dataset and inspect variable distributions.",
        "Construct queen-contiguity spatial weights and inspect neighbor structure.",
        "Run exploratory maps and correlation checks for price drivers.",
        "Compute global Moran statistics for price and OLS residuals.",
        "Fit a baseline OLS model and inspect residual spatial clustering.",
        "Fit spatial lag and spatial error models using PySAL spreg.",
        "Compare model diagnostics and coefficient interpretation.",
        "Map local Moran clusters and residual outliers for planning review.",
        "Export diagnostics, model comparison tables, and hotspot maps.",
    ]
    refs = [
        "PySAL spatial autocorrelation notebook: https://pysal.org/notebooks/explore/esda/Spatial_Autocorrelation_for_Areal_Unit_Data.html",
        "PySAL spatial model specifications: https://pysal.org/spreg/notebooks/7_spatial_models.html",
        "GeoPandas examples gallery: https://geopandas.org/en/stable/gallery/index.html",
    ]
    write_json(case_dir / "case.json", manifest(slug, title, "A full PySAL workflow for spatial weights, Moran diagnostics, OLS, spatial lag/error models, and hotspot mapping.", "This mature spatial statistics case packages a local housing dataset and walks through the diagnostics expected in a spatial econometrics notebook.", "Spatial Econometrics", "opengms-spatial-stats", ["PySAL", "Spatial Regression", "Moran I", "GeoPandas", "Housing"], steps, ["Model comparison table for OLS, spatial lag, and spatial error models.", "Residual and local-cluster maps.", "CSV diagnostics saved to outputs/."], refs))
    write_text(case_dir / "project" / "README.md", readme(title, "A spatial econometrics notebook with weights, diagnostics, and competing spatial model specifications.", steps, refs))
    write_cover(case_dir / "cover.svg", title, ("#581c87", "#7c3aed", "#22c55e"))
    write_notebook(
        case_dir / "project" / "main.ipynb",
        [
            ("markdown", f"# {title}\n\nThis case mirrors PySAL spatial econometrics examples: contiguity weights, spatial autocorrelation, OLS residual diagnostics, spatial lag/error models, local clusters, and exportable diagnostics."),
            ("code", """from pathlib import Path
import os, warnings
os.environ.setdefault("PROJ_LIB", "/opt/conda/share/proj")
os.environ.setdefault("PROJ_DATA", "/opt/conda/share/proj")
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
import statsmodels.api as sm
from libpysal.weights import Queen
from esda.moran import Moran, Moran_Local
from spreg import ML_Lag, ML_Error
from IPython.display import display, Markdown
PROJECT = Path.cwd()
DATA = PROJECT / "data"
OUTPUTS = PROJECT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
print("Ready. Data files:", [p.name for p in sorted(DATA.iterdir())])"""),
            ("code", """gdf = gpd.read_file(DATA / "housing_zones.geojson")
display(gdf.head())
display(gdf.drop(columns="geometry").describe().round(3))"""),
            ("code", """fig, axes = plt.subplots(1, 3, figsize=(15, 4), constrained_layout=True)
for ax, column, cmap in zip(axes, ["price", "income", "transit"], ["YlOrRd", "viridis", "Blues"]):
    gdf.plot(column=column, ax=ax, cmap=cmap, legend=True, edgecolor="white", linewidth=0.2)
    ax.set_title(column)
    ax.set_axis_off()
fig.savefig(OUTPUTS / "housing_variable_maps.png", dpi=170)
plt.show()
print("Saved outputs/housing_variable_maps.png")"""),
            ("code", """corr = gdf[["price", "income", "transit", "green", "old_building"]].corr()
fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr.columns)), corr.columns, rotation=45, ha="right")
ax.set_yticks(range(len(corr.index)), corr.index)
fig.colorbar(im, ax=ax, shrink=0.8)
ax.set_title("Correlation matrix")
fig.savefig(OUTPUTS / "housing_correlation_matrix.png", dpi=170)
plt.show()
display(corr.round(3))"""),
            ("code", """w = Queen.from_dataframe(gdf, ids=gdf["zone_id"].tolist())
w.transform = "r"
neighbor_counts = pd.Series({k: len(v) for k, v in w.neighbors.items()}, name="neighbors")
print(f"Weights observations={w.n}, islands={w.islands}")
display(neighbor_counts.describe().round(2))
display(neighbor_counts.sort_values().head())"""),
            ("code", """m_price = Moran(gdf["price"].values, w, permutations=199)
print(f"Global Moran I for price: I={m_price.I:.3f}, p_sim={m_price.p_sim:.4f}")
local = Moran_Local(gdf["price"].values, w, permutations=199)
gdf["local_q"] = local.q
gdf["local_p"] = local.p_sim
gdf["local_cluster"] = np.where(gdf["local_p"] <= 0.05, gdf["local_q"].map({1:"HH",2:"LH",3:"LL",4:"HL"}), "Not significant")
display(gdf[["zone_id", "price", "local_cluster", "local_p"]].sort_values("local_p").head(10).round(3))"""),
            ("code", """fig, ax = plt.subplots(figsize=(7, 6))
colors = {"HH":"#dc2626", "LL":"#2563eb", "HL":"#f97316", "LH":"#22c55e", "Not significant":"#e5e7eb"}
gdf.assign(color=gdf["local_cluster"].map(colors)).plot(color=gdf["local_cluster"].map(colors), ax=ax, edgecolor="white", linewidth=0.2)
ax.set_title("Local Moran clusters for housing price")
ax.set_axis_off()
fig.savefig(OUTPUTS / "local_moran_price_clusters.png", dpi=170)
plt.show()
display(gdf["local_cluster"].value_counts().to_frame("count"))"""),
            ("code", """y = gdf["price"].values
X = gdf[["income", "transit", "green", "old_building"]]
ols = sm.OLS(y, sm.add_constant(X)).fit()
gdf["ols_residual"] = ols.resid
print(ols.summary().tables[1])
print(f"OLS adjusted R2={ols.rsquared_adj:.3f}, AIC={ols.aic:.1f}")"""),
            ("code", """m_resid = Moran(gdf["ols_residual"].values, w, permutations=199)
fig, axes = plt.subplots(1, 2, figsize=(12, 5), constrained_layout=True)
gdf.plot(column="ols_residual", ax=axes[0], cmap="RdBu_r", legend=True, edgecolor="white", linewidth=0.2)
axes[0].set_title("OLS residuals")
axes[0].set_axis_off()
axes[1].scatter(ols.fittedvalues, ols.resid, color="#334155", alpha=0.75)
axes[1].axhline(0, color="black", linewidth=1)
axes[1].set_xlabel("Fitted price")
axes[1].set_ylabel("Residual")
axes[1].set_title("Residual spread")
fig.savefig(OUTPUTS / "ols_residual_diagnostics.png", dpi=170)
plt.show()
print(f"Residual Moran I={m_resid.I:.3f}, p_sim={m_resid.p_sim:.4f}")"""),
            ("code", """y2 = gdf[["price"]].values
X2 = gdf[["income", "transit", "green", "old_building"]].values
lag_model = ML_Lag(y2, X2, w=w, name_y="price", name_x=["income", "transit", "green", "old_building"])
err_model = ML_Error(y2, X2, w=w, name_y="price", name_x=["income", "transit", "green", "old_building"])
comparison = pd.DataFrame([
    {"model": "OLS", "aic": ols.aic, "pseudo_r2": ols.rsquared, "spatial_parameter": np.nan},
    {"model": "Spatial lag", "aic": lag_model.aic, "pseudo_r2": lag_model.pr2, "spatial_parameter": float(lag_model.rho)},
    {"model": "Spatial error", "aic": err_model.aic, "pseudo_r2": err_model.pr2, "spatial_parameter": float(err_model.lam)},
])
display(comparison.round(3))
comparison.to_csv(OUTPUTS / "spatial_model_comparison.csv", index=False)"""),
            ("code", """coef_rows = []
for label, model in [("Spatial lag", lag_model), ("Spatial error", err_model)]:
    names = list(model.name_x)
    for name, beta in zip(names, model.betas.flatten()):
        coef_rows.append({"model": label, "term": name, "coef": float(beta)})
coef_table = pd.DataFrame(coef_rows)
fig, ax = plt.subplots(figsize=(9, 4))
for model_name, sub in coef_table[coef_table["term"] != "CONSTANT"].groupby("model"):
    ax.plot(sub["term"], sub["coef"], marker="o", label=model_name)
ax.axhline(0, color="black", linewidth=1)
ax.set_title("Spatial model coefficient comparison")
ax.legend()
fig.savefig(OUTPUTS / "spatial_model_coefficients.png", dpi=170)
plt.show()
display(coef_table.round(3))"""),
            ("code", """gdf["lag_prediction"] = lag_model.predy.flatten()
gdf["lag_residual"] = y - gdf["lag_prediction"]
gdf["absolute_residual"] = gdf["lag_residual"].abs()
review = gdf.sort_values("absolute_residual", ascending=False)[["zone_id", "price", "lag_prediction", "lag_residual", "local_cluster"]].head(12)
fig, ax = plt.subplots(figsize=(7, 6))
gdf.plot(column="absolute_residual", cmap="PuRd", legend=True, ax=ax, edgecolor="white", linewidth=0.2)
ax.set_title("Spatial lag absolute residuals")
ax.set_axis_off()
fig.savefig(OUTPUTS / "spatial_lag_residual_outliers.png", dpi=170)
plt.show()
display(review.round(3))"""),
            ("code", """gdf.drop(columns="geometry").to_csv(OUTPUTS / "housing_spatial_diagnostics.csv", index=False)
gdf.to_file(OUTPUTS / "housing_diagnostics.geojson", driver="GeoJSON")
print("Exported files:")
for path in sorted(OUTPUTS.iterdir()):
    print(f"- {path.name} ({path.stat().st_size} bytes)")"""),
            ("code", """best = comparison.sort_values("aic").iloc[0]
display(Markdown(f'''## Case conclusion

The best AIC model is **{best.model}**. OLS residual Moran I is **{m_resid.I:.3f}** with simulated p-value **{m_resid.p_sim:.4f}**, so the notebook surfaces spatial dependence rather than treating the housing market as independent observations.
'''))"""),
        ],
    )


def create_hydro_case() -> None:
    slug = "watershed-flood-response-chain"
    title = "Watershed Flood Response Chain"
    case_dir = reset_case(slug)
    data_dir = case_dir / "project" / "data"
    rng = np.random.default_rng(32)
    n = 96
    y, x = np.mgrid[0:n, 0:n]
    dem = 220 - 1.2 * y + 0.35 * x + 34 * np.sin(x / 11) + 24 * np.cos(y / 14)
    dem += 60 * np.exp(-((x - 22) ** 2 + (y - 18) ** 2) / 500)
    dem += 35 * np.exp(-((x - 75) ** 2 + (y - 30) ** 2) / 850)
    dem += rng.normal(0, 1.8, dem.shape)
    transform = from_origin(118.4, 32.3, 0.001, 0.001)
    with rasterio.open(
        data_dir / "dem.tif",
        "w",
        driver="GTiff",
        height=n,
        width=n,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=transform,
    ) as dst:
        dst.write(dem.astype("float32"), 1)
    rainfall = pd.DataFrame({
        "hour": np.arange(0, 25),
        "storm_mm": 8 * np.exp(-((np.arange(0, 25) - 9) / 4) ** 2) + 18 * np.exp(-((np.arange(0, 25) - 14) / 2.6) ** 2),
    })
    rainfall.to_csv(data_dir / "design_storm.csv", index=False)
    outlets = pd.DataFrame({"name": ["main_outlet", "urban_outlet"], "row": [90, 82], "col": [50, 64]})
    outlets.to_csv(data_dir / "outlets.csv", index=False)

    steps = [
        "Load a DEM, storm hyetograph, and outlet table from local files.",
        "Derive slope, aspect, and shaded relief to inspect terrain controls.",
        "Run a D8-style flow-routing chain to compute flow direction and accumulation.",
        "Extract a stream network and distance-to-stream surface.",
        "Delineate an outlet-contributing area using reverse flow traversal.",
        "Compute topographic wetness and flood susceptibility indices.",
        "Combine terrain susceptibility with curve-number runoff from a design storm.",
        "Compare baseline and restoration scenarios for peak runoff response.",
        "Export risk maps, stream rasters, hydrographs, and tabular indicators.",
    ]
    refs = [
        "WhiteboxTools Python frontend: https://github.com/opengeos/whitebox-python",
        "Whitebox watershed/LiDAR overview: https://geog-312.gishub.org/book/geospatial/whitebox.html",
        "Pysheds project: https://github.com/mdbartos/pysheds",
    ]
    write_json(case_dir / "case.json", manifest(slug, title, "A hydrology notebook that chains DEM derivatives, flow accumulation, watershed delineation, susceptibility mapping, and runoff scenarios.", "This case follows mature WhiteboxTools/pysheds-style watershed analysis patterns but uses a bundled DEM and transparent Python calculations for offline execution.", "Hydrology and Terrain Analysis", "opengms-hydro-terrain", ["DEM", "Hydrology", "Flood Risk", "Watershed", "Raster"], steps, ["DEM derivative and stream-network maps.", "Watershed and susceptibility rasters.", "Runoff scenario hydrograph and CSV exports."], refs))
    write_text(case_dir / "project" / "README.md", readme(title, "A multi-stage terrain and flood-response notebook with a local DEM and design storm.", steps, refs))
    write_cover(case_dir / "cover.svg", title, ("#164e63", "#0284c7", "#84cc16"))
    write_notebook(
        case_dir / "project" / "main.ipynb",
        [
            ("markdown", f"# {title}\n\nThis notebook implements a full watershed analysis chain: DEM QA, terrain derivatives, D8 flow routing, stream extraction, outlet basin tracing, susceptibility scoring, and runoff scenario comparison."),
            ("code", """from pathlib import Path
import os, warnings
os.environ.setdefault("PROJ_LIB", "/opt/conda/share/proj")
os.environ.setdefault("PROJ_DATA", "/opt/conda/share/proj")
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import rasterio
import matplotlib.pyplot as plt
from scipy import ndimage
from IPython.display import display, Markdown
PROJECT = Path.cwd()
DATA = PROJECT / "data"
OUTPUTS = PROJECT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
print("Data files:", [p.name for p in sorted(DATA.iterdir())])"""),
            ("code", """with rasterio.open(DATA / "dem.tif") as src:
    dem = src.read(1)
    profile = src.profile
rain = pd.read_csv(DATA / "design_storm.csv")
outlets = pd.read_csv(DATA / "outlets.csv")
print(f"DEM shape={dem.shape}, elevation range={dem.min():.1f}-{dem.max():.1f} m")
display(rain.head())
display(outlets)"""),
            ("code", """gy, gx = np.gradient(dem, 30, 30)
slope = np.hypot(gx, gy)
aspect = np.degrees(np.arctan2(-gx, gy))
hillshade = 0.6 * (dem - dem.min()) / (dem.max() - dem.min()) + 0.4 * (1 - slope / slope.max())
fig, axes = plt.subplots(1, 3, figsize=(15, 4), constrained_layout=True)
for ax, arr, title_, cmap in zip(axes, [dem, slope, hillshade], ["DEM", "Slope", "Shaded relief"], ["terrain", "magma", "gray"]):
    im = ax.imshow(arr, cmap=cmap)
    ax.set_title(title_)
    ax.axis("off")
    fig.colorbar(im, ax=ax, shrink=0.75)
fig.savefig(OUTPUTS / "terrain_derivatives.png", dpi=170)
plt.show()
print("Saved outputs/terrain_derivatives.png")"""),
            ("code", """neighbors = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
distances = np.array([np.sqrt(2), 1, np.sqrt(2), 1, 1, np.sqrt(2), 1, np.sqrt(2)])
flow_to = np.full(dem.shape + (2,), -1, dtype=int)
drop = np.zeros(dem.shape)
for r in range(1, dem.shape[0]-1):
    for c in range(1, dem.shape[1]-1):
        vals = np.array([(dem[r, c] - dem[r+dr, c+dc]) / d for (dr, dc), d in zip(neighbors, distances)])
        idx = int(np.argmax(vals))
        if vals[idx] > 0:
            dr, dc = neighbors[idx]
            flow_to[r, c] = [r + dr, c + dc]
            drop[r, c] = vals[idx]
print(f"Cells with downslope receiver: {np.sum(flow_to[...,0] >= 0)} / {dem.size}")
print(f"Median downslope gradient: {np.median(drop[drop>0]):.3f}")"""),
            ("code", """order = np.argsort(dem.ravel())[::-1]
acc = np.ones(dem.shape, dtype=float)
for flat in order:
    r, c = np.unravel_index(flat, dem.shape)
    rr, cc = flow_to[r, c]
    if rr >= 0:
        acc[rr, cc] += acc[r, c]
streams = acc > np.percentile(acc, 96)
fig, axes = plt.subplots(1, 2, figsize=(12, 5), constrained_layout=True)
axes[0].imshow(np.log1p(acc), cmap="Blues")
axes[0].set_title("Log flow accumulation")
axes[1].imshow(dem, cmap="terrain")
axes[1].imshow(np.where(streams, 1, np.nan), cmap="winter", alpha=0.9)
axes[1].set_title("Extracted stream network")
for ax in axes:
    ax.axis("off")
fig.savefig(OUTPUTS / "flow_accumulation_streams.png", dpi=170)
plt.show()
print(f"Stream cells: {int(streams.sum())}")"""),
            ("code", """outlet = outlets.iloc[0]
target = (int(outlet.row), int(outlet.col))
reverse = {}
for r in range(dem.shape[0]):
    for c in range(dem.shape[1]):
        rr, cc = flow_to[r, c]
        if rr >= 0:
            reverse.setdefault((rr, cc), []).append((r, c))
stack = [target]
basin = np.zeros(dem.shape, dtype=bool)
while stack:
    cell = stack.pop()
    if basin[cell]:
        continue
    basin[cell] = True
    stack.extend(reverse.get(cell, []))
print(f"Outlet {outlet['name']} basin cells={basin.sum()}, area={basin.sum() * 30 * 30 / 1e6:.2f} sq km")
fig, ax = plt.subplots(figsize=(6, 6))
ax.imshow(dem, cmap="terrain")
ax.imshow(np.where(basin, 1, np.nan), cmap="cool", alpha=0.42)
ax.scatter([target[1]], [target[0]], c="red", marker="x", s=90)
ax.set_title("Delineated contributing basin")
ax.axis("off")
fig.savefig(OUTPUTS / "delineated_basin.png", dpi=170)
plt.show()"""),
            ("code", """stream_distance = ndimage.distance_transform_edt(~streams) * 30
twi = np.log1p(acc) - np.log(np.maximum(slope, 0.002))
twi_norm = (twi - np.nanpercentile(twi, 2)) / (np.nanpercentile(twi, 98) - np.nanpercentile(twi, 2))
dist_norm = 1 - np.clip(stream_distance / np.percentile(stream_distance, 90), 0, 1)
slope_norm = 1 - np.clip(slope / np.percentile(slope, 95), 0, 1)
susceptibility = np.clip(0.45 * twi_norm + 0.35 * dist_norm + 0.20 * slope_norm, 0, 1)
fig, axes = plt.subplots(1, 3, figsize=(15, 4), constrained_layout=True)
for ax, arr, title_, cmap in zip(axes, [twi, stream_distance, susceptibility], ["Topographic wetness", "Distance to stream (m)", "Flood susceptibility"], ["YlGnBu", "viridis_r", "Reds"]):
    im = ax.imshow(arr, cmap=cmap)
    ax.set_title(title_)
    ax.axis("off")
    fig.colorbar(im, ax=ax, shrink=0.75)
fig.savefig(OUTPUTS / "flood_susceptibility_chain.png", dpi=170)
plt.show()
print(f"High susceptibility cells in basin: {int(((susceptibility > 0.72) & basin).sum())}")"""),
            ("code", """curve_number = np.where(susceptibility > 0.72, 88, np.where(susceptibility > 0.45, 78, 68))
curve_number = np.where(basin, curve_number, np.nan)
storm_total = rain["storm_mm"].sum()
S = 25400 / curve_number - 254
runoff_depth = np.where(storm_total > 0.2 * S, ((storm_total - 0.2 * S) ** 2) / (storm_total + 0.8 * S), 0)
runoff_volume = np.nansum(runoff_depth * 30 * 30 / 1000)
fig, ax = plt.subplots(figsize=(7, 5))
im = ax.imshow(runoff_depth, cmap="PuBu")
ax.set_title("Runoff depth from SCS curve-number method")
ax.axis("off")
fig.colorbar(im, ax=ax, shrink=0.75)
fig.savefig(OUTPUTS / "runoff_depth_map.png", dpi=170)
plt.show()
print(f"Design storm total={storm_total:.1f} mm; estimated basin runoff={runoff_volume:,.0f} cubic meters")"""),
            ("code", """def route_hydrograph(depth_map, restoration=False):
    depth = depth_map.copy()
    if restoration:
        restored = (susceptibility > 0.62) & basin
        depth = np.where(restored, depth * 0.78, depth)
    delay = np.clip((stream_distance / 120).astype(int), 0, 24)
    response = np.zeros(49)
    for h, rain_mm in zip(rain["hour"], rain["storm_mm"]):
        contribution = depth / max(storm_total, 1) * rain_mm
        for lag in range(25):
            response[int(h) + lag] += np.nansum(contribution[delay == lag] * 30 * 30 / 1000)
    return response

base_h = route_hydrograph(runoff_depth, restoration=False)
rest_h = route_hydrograph(runoff_depth, restoration=True)
hydro = pd.DataFrame({"hour": np.arange(len(base_h)), "baseline_m3": base_h, "restoration_m3": rest_h})
fig, ax = plt.subplots(figsize=(10, 4))
ax.plot(hydro["hour"], hydro["baseline_m3"], label="baseline", color="#2563eb")
ax.plot(hydro["hour"], hydro["restoration_m3"], label="restoration", color="#16a34a")
ax.set_title("Runoff response scenario")
ax.set_xlabel("Hour")
ax.set_ylabel("Runoff volume per hour (m3)")
ax.legend()
fig.savefig(OUTPUTS / "runoff_response_scenario.png", dpi=170)
plt.show()
display(hydro.head(12).round(1))"""),
            ("code", """risk_table = pd.DataFrame({
    "metric": ["basin_area_sq_km", "storm_total_mm", "baseline_peak_m3", "restoration_peak_m3", "peak_reduction_pct", "high_susceptibility_cells"],
    "value": [
        basin.sum() * 30 * 30 / 1e6,
        storm_total,
        base_h.max(),
        rest_h.max(),
        100 * (1 - rest_h.max() / base_h.max()),
        int(((susceptibility > 0.72) & basin).sum()),
    ],
})
display(risk_table.round(2))
risk_table.to_csv(OUTPUTS / "watershed_risk_summary.csv", index=False)
hydro.to_csv(OUTPUTS / "runoff_hydrograph.csv", index=False)"""),
            ("code", """with rasterio.open(OUTPUTS / "flood_susceptibility.tif", "w", **profile) as dst:
    dst.write(susceptibility.astype("float32"), 1)
with rasterio.open(OUTPUTS / "flow_accumulation.tif", "w", **profile) as dst:
    dst.write(acc.astype("float32"), 1)
print("Exported files:")
for path in sorted(OUTPUTS.iterdir()):
    print(f"- {path.name} ({path.stat().st_size} bytes)")"""),
            ("code", """display(Markdown(f'''## Case conclusion

The delineated basin covers **{basin.sum() * 30 * 30 / 1e6:.2f} sq km**. The restoration scenario reduces the modeled peak runoff by **{100 * (1 - rest_h.max() / base_h.max()):.1f}%**, and the exported susceptibility map identifies stream-adjacent cells with high wetness and slow drainage.
'''))"""),
        ],
    )


def create_energy_case() -> None:
    slug = "solar-storage-microgrid-dispatch"
    title = "Solar Storage Microgrid Dispatch"
    case_dir = reset_case(slug)
    data_dir = case_dir / "project" / "data"
    rng = np.random.default_rng(52)
    hours = pd.date_range("2026-07-01", periods=168, freq="h")
    h = np.arange(len(hours))
    solar_shape = np.maximum(0, np.sin(np.pi * ((hours.hour.values - 6) / 12)))
    cloud = np.clip(0.85 + 0.15 * np.sin(h / 9) + rng.normal(0, 0.05, len(h)), 0.45, 1.05)
    pv_cf = solar_shape * cloud
    temp = 29 + 5 * solar_shape + 2 * np.sin(h / 24 * 2 * np.pi) + rng.normal(0, 0.8, len(h))
    base = 42 + 6 * np.sin((hours.hour.values - 15) / 24 * 2 * np.pi)
    cooling = np.maximum(0, temp - 26) * 2.4
    demand = base + cooling + 4 * (hours.dayofweek.values < 5) + rng.normal(0, 1.6, len(h))
    tariff = np.where((hours.hour.values >= 17) & (hours.hour.values <= 21), 1.28, np.where((hours.hour.values >= 10) & (hours.hour.values <= 16), 0.82, 0.48))
    df = pd.DataFrame({"timestamp": hours, "demand_mw": demand, "pv_capacity_factor": pv_cf, "temperature_c": temp, "tariff_cny_kwh": tariff})
    df.to_csv(data_dir / "microgrid_timeseries.csv", index=False)
    districts = pd.DataFrame({
        "district": ["Campus", "Hospital", "Residential", "Transit hub"],
        "peak_share": [0.22, 0.28, 0.34, 0.16],
        "critical_load": [0.4, 0.85, 0.35, 0.65],
    })
    districts.to_csv(data_dir / "district_loads.csv", index=False)
    steps = [
        "Load a week-long demand, PV, temperature, tariff, and critical-load dataset.",
        "Diagnose load shape, solar coincidence, ramps, and price exposure.",
        "Build a baseline grid-import cost and emissions inventory.",
        "Formulate a storage dispatch optimization with state-of-charge constraints.",
        "Solve multiple PV and battery scenarios with scipy/HiGHS-style linear programming.",
        "Compare cost, peak import, PV curtailment, and resilience metrics.",
        "Allocate benefits across districts using peak-share and critical-load weights.",
        "Export dispatch schedules, scenario tables, and visual diagnostics.",
    ]
    refs = [
        "PyPSA overview: https://pypsa.org/",
        "PyPSA optimal power flow docs: https://docs.pypsa.org/",
        "pvlib Python project: https://pvlib-python.readthedocs.io/",
    ]
    write_json(case_dir / "case.json", manifest(slug, title, "An urban-energy notebook for PV, battery dispatch, tariff exposure, peak shaving, and resilience comparison.", "This case adapts mature PyPSA/PV/storage planning patterns to a compact local microgrid dataset and solves dispatch scenarios offline.", "Urban Energy Systems", "opengms-urban-energy", ["PyPSA Pattern", "PV", "Battery Storage", "Optimization", "Microgrid"], steps, ["Scenario dispatch schedules.", "Cost, emission, peak, and resilience comparison table.", "District benefit allocation under outputs/."], refs))
    write_text(case_dir / "project" / "README.md", readme(title, "A multi-stage microgrid dispatch and scenario planning notebook.", steps, refs))
    write_cover(case_dir / "cover.svg", title, ("#713f12", "#f59e0b", "#22c55e"))
    write_notebook(
        case_dir / "project" / "main.ipynb",
        [
            ("markdown", f"# {title}\n\nThis notebook is a local microgrid adaptation of mature energy-system planning examples: load/PV diagnostics, baseline inventory, storage dispatch optimization, scenario comparison, and benefit allocation."),
            ("code", """from pathlib import Path
import os, warnings
os.environ.setdefault("PROJ_LIB", "/opt/conda/share/proj")
os.environ.setdefault("PROJ_DATA", "/opt/conda/share/proj")
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.optimize import linprog
from IPython.display import display, Markdown
try:
    import pypsa
    pypsa_version = pypsa.__version__
except Exception as exc:
    pypsa_version = f"unavailable: {exc}"
PROJECT = Path.cwd()
DATA = PROJECT / "data"
OUTPUTS = PROJECT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
print(f"PyPSA runtime check: {pypsa_version}")
print("Data files:", [p.name for p in sorted(DATA.iterdir())])"""),
            ("code", """ts = pd.read_csv(DATA / "microgrid_timeseries.csv", parse_dates=["timestamp"])
districts = pd.read_csv(DATA / "district_loads.csv")
display(ts.head())
display(districts)"""),
            ("code", """fig, axes = plt.subplots(3, 1, figsize=(12, 8), sharex=True, constrained_layout=True)
axes[0].plot(ts["timestamp"], ts["demand_mw"], color="#ef4444")
axes[0].set_ylabel("Demand MW")
axes[1].plot(ts["timestamp"], ts["pv_capacity_factor"], color="#f59e0b")
axes[1].set_ylabel("PV capacity factor")
axes[2].step(ts["timestamp"], ts["tariff_cny_kwh"], where="mid", color="#2563eb")
axes[2].set_ylabel("Tariff")
axes[2].set_title("Tariff schedule")
fig.savefig(OUTPUTS / "microgrid_timeseries_overview.png", dpi=170)
plt.show()
print("Saved outputs/microgrid_timeseries_overview.png")"""),
            ("code", """diagnostics = pd.Series({
    "peak_demand_mw": ts["demand_mw"].max(),
    "mean_demand_mw": ts["demand_mw"].mean(),
    "load_factor": ts["demand_mw"].mean() / ts["demand_mw"].max(),
    "pv_cf_mean": ts["pv_capacity_factor"].mean(),
    "max_hourly_ramp_mw": ts["demand_mw"].diff().abs().max(),
    "price_weighted_demand_cost_index": (ts["demand_mw"] * ts["tariff_cny_kwh"]).sum(),
})
display(diagnostics.round(3).to_frame("value"))"""),
            ("code", """def baseline_metrics(pv_mw=0):
    pv = pv_mw * ts["pv_capacity_factor"].values
    demand = ts["demand_mw"].values
    used_pv = np.minimum(demand, pv)
    grid = demand - used_pv
    curtailed = np.maximum(0, pv - demand)
    cost = np.sum(grid * ts["tariff_cny_kwh"].values * 1000)
    emissions = np.sum(grid * 0.58)
    return pd.Series({
        "cost_cny": cost,
        "emissions_tco2": emissions,
        "peak_grid_mw": grid.max(),
        "pv_used_mwh": used_pv.sum(),
        "pv_curtailed_mwh": curtailed.sum(),
    })
baseline = baseline_metrics(0)
pv_only = baseline_metrics(32)
display(pd.DataFrame({"no_pv": baseline, "pv_only_32mw": pv_only}).round(2))"""),
            ("code", """def solve_storage_dispatch(pv_mw, battery_mwh, battery_mw):
    demand = ts["demand_mw"].values
    pv = pv_mw * ts["pv_capacity_factor"].values
    price = ts["tariff_cny_kwh"].values * 1000
    n = len(ts)
    # Variables: grid[n], charge[n], discharge[n], soc[n], curtail[n]
    var_count = 5 * n
    idx_grid = slice(0, n)
    idx_charge = slice(n, 2*n)
    idx_discharge = slice(2*n, 3*n)
    idx_soc = slice(3*n, 4*n)
    idx_curtail = slice(4*n, 5*n)
    c = np.zeros(var_count)
    c[idx_grid] = price
    c[idx_curtail] = 5
    A_eq = []
    b_eq = []
    for t in range(n):
        row = np.zeros(var_count)
        row[idx_grid.start + t] = 1
        row[idx_discharge.start + t] = 1
        row[idx_charge.start + t] = -1
        row[idx_curtail.start + t] = -1
        A_eq.append(row)
        b_eq.append(demand[t] - pv[t])
        row = np.zeros(var_count)
        row[idx_soc.start + t] = 1
        if t > 0:
            row[idx_soc.start + t - 1] = -1
        row[idx_charge.start + t] = -0.92
        row[idx_discharge.start + t] = 1 / 0.92
        A_eq.append(row)
        b_eq.append(0 if t > 0 else 0.5 * battery_mwh)
    row = np.zeros(var_count)
    row[idx_soc.stop - 1] = 1
    A_eq.append(row)
    b_eq.append(0.5 * battery_mwh)
    bounds = [(0, None)] * var_count
    for t in range(n):
        bounds[idx_charge.start + t] = (0, battery_mw)
        bounds[idx_discharge.start + t] = (0, battery_mw)
        bounds[idx_soc.start + t] = (0.1 * battery_mwh, battery_mwh)
    result = linprog(c, A_eq=np.vstack(A_eq), b_eq=np.array(b_eq), bounds=bounds, method="highs")
    if not result.success:
        raise RuntimeError(result.message)
    x = result.x
    dispatch = pd.DataFrame({
        "timestamp": ts["timestamp"],
        "demand_mw": demand,
        "pv_mw": pv,
        "grid_mw": x[idx_grid],
        "charge_mw": x[idx_charge],
        "discharge_mw": x[idx_discharge],
        "soc_mwh": x[idx_soc],
        "curtail_mw": x[idx_curtail],
    })
    return dispatch

demo_dispatch = solve_storage_dispatch(32, 90, 18)
display(demo_dispatch.head().round(2))
print(f"Optimization rows={len(demo_dispatch)}, peak grid={demo_dispatch.grid_mw.max():.2f} MW")"""),
            ("code", """def metrics_from_dispatch(name, dispatch, battery_mwh):
    grid = dispatch["grid_mw"].values
    cost = np.sum(grid * ts["tariff_cny_kwh"].values * 1000)
    emissions = np.sum(grid * 0.58)
    pv_used = np.sum(dispatch["pv_mw"] - dispatch["curtail_mw"])
    outage_hours_supported = battery_mwh / max(ts["demand_mw"].quantile(0.90) * 0.55, 1)
    return {
        "scenario": name,
        "cost_cny": cost,
        "emissions_tco2": emissions,
        "peak_grid_mw": grid.max(),
        "pv_used_mwh": pv_used,
        "pv_curtailed_mwh": dispatch["curtail_mw"].sum(),
        "resilience_hours": outage_hours_supported,
    }

scenarios = [
    ("PV 20 + storage 40", 20, 40, 10),
    ("PV 32 + storage 90", 32, 90, 18),
    ("PV 45 + storage 120", 45, 120, 22),
]
rows = []
dispatches = {}
for name, pv_mw, batt_mwh, batt_mw in scenarios:
    disp = solve_storage_dispatch(pv_mw, batt_mwh, batt_mw)
    dispatches[name] = disp
    rows.append(metrics_from_dispatch(name, disp, batt_mwh))
scenario_table = pd.DataFrame(rows)
display(scenario_table.round(2))"""),
            ("code", """best = scenario_table.sort_values(["cost_cny", "peak_grid_mw"]).iloc[0]["scenario"]
dispatch = dispatches[best]
fig, axes = plt.subplots(2, 1, figsize=(12, 7), sharex=True, constrained_layout=True)
axes[0].plot(dispatch["timestamp"], dispatch["demand_mw"], label="demand", color="#111827")
axes[0].plot(dispatch["timestamp"], dispatch["pv_mw"], label="PV", color="#f59e0b")
axes[0].plot(dispatch["timestamp"], dispatch["grid_mw"], label="grid import", color="#2563eb")
axes[0].legend()
axes[0].set_ylabel("MW")
axes[0].set_title(best)
axes[1].plot(dispatch["timestamp"], dispatch["soc_mwh"], color="#16a34a")
axes[1].set_ylabel("Battery SOC (MWh)")
fig.savefig(OUTPUTS / "best_dispatch_schedule.png", dpi=170)
plt.show()
print(f"Best scenario by cost: {best}")"""),
            ("code", """fig, axes = plt.subplots(1, 3, figsize=(14, 4), constrained_layout=True)
for ax, metric, title_ in zip(axes, ["cost_cny", "peak_grid_mw", "resilience_hours"], ["Cost", "Peak grid import", "Resilience hours"]):
    ax.barh(scenario_table["scenario"], scenario_table[metric], color="#0f766e")
    ax.set_title(title_)
fig.savefig(OUTPUTS / "scenario_metric_comparison.png", dpi=170)
plt.show()
display(scenario_table.round(2))"""),
            ("code", """benefits = []
best_row = scenario_table.loc[scenario_table["scenario"] == best].iloc[0]
cost_saving = baseline["cost_cny"] - best_row["cost_cny"]
peak_reduction = baseline["peak_grid_mw"] - best_row["peak_grid_mw"]
for row in districts.itertuples(index=False):
    allocation = 0.55 * row.peak_share + 0.45 * row.critical_load / districts["critical_load"].sum()
    benefits.append({
        "district": row.district,
        "allocated_cost_saving_cny": cost_saving * allocation,
        "allocated_peak_reduction_mw": peak_reduction * row.peak_share,
        "critical_load": row.critical_load,
    })
benefit_table = pd.DataFrame(benefits)
display(benefit_table.round(2))"""),
            ("code", """scenario_table.to_csv(OUTPUTS / "microgrid_scenario_comparison.csv", index=False)
dispatch.to_csv(OUTPUTS / "best_dispatch_schedule.csv", index=False)
benefit_table.to_csv(OUTPUTS / "district_benefit_allocation.csv", index=False)
print("Exported files:")
for path in sorted(OUTPUTS.iterdir()):
    print(f"- {path.name} ({path.stat().st_size} bytes)")"""),
            ("code", """display(Markdown(f'''## Case conclusion

The lowest-cost scenario in this offline microgrid study is **{best}**. Relative to the no-PV baseline, it saves about **{cost_saving:,.0f} CNY** over the modeled week and reduces peak grid import by **{peak_reduction:.1f} MW** while adding resilience value for critical districts.
'''))"""),
        ],
    )


def create_streetview_case() -> None:
    slug = "streetview-semantic-comfort-audit"
    title = "Streetview Semantic Comfort Audit"
    case_dir = reset_case(slug)
    data_dir = case_dir / "project" / "data"
    images_dir = data_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(64)
    rows = []
    for i in range(30):
        width, height = 180, 130
        sky_h = int(rng.integers(34, 58))
        road_y = int(rng.integers(78, 94))
        img = Image.new("RGB", (width, height), (135, 185, 220))
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, sky_h, width, road_y], fill=(185, 184, 174))
        draw.polygon([(0, height), (width, height), (int(width * 0.64), road_y), (int(width * 0.36), road_y)], fill=(84, 86, 88))
        green_level = rng.uniform(0.08, 0.55)
        building_level = rng.uniform(0.2, 0.7)
        for b in range(int(5 + building_level * 9)):
            x0 = int(rng.integers(0, width - 20))
            bw = int(rng.integers(12, 35))
            bh = int(rng.integers(28, 70))
            y0 = max(sky_h, road_y - bh + rng.integers(-12, 10))
            color = tuple(int(v) for v in rng.integers(118, 176, 3))
            draw.rectangle([x0, y0, min(width, x0 + bw), road_y], fill=color)
            for wx in range(x0 + 3, min(width, x0 + bw - 3), 8):
                draw.rectangle([wx, y0 + 6, wx + 3, min(road_y - 3, y0 + 12)], fill=(215, 225, 235))
        for t in range(int(4 + green_level * 18)):
            cx = int(rng.integers(0, width))
            cy = int(rng.integers(max(18, sky_h - 4), road_y + 16))
            r = int(rng.integers(7, 18))
            green = tuple(int(v) for v in (rng.integers(26, 75), rng.integers(95, 165), rng.integers(38, 85)))
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=green)
            draw.rectangle([cx - 2, cy + r - 3, cx + 2, min(height, cy + r + 18)], fill=(94, 63, 39))
        for lane in [-18, 18]:
            draw.line([(width // 2 + lane, height), (width // 2 + lane // 3, road_y)], fill=(235, 235, 210), width=2)
        filename = f"street_{i:02d}.png"
        img.save(images_dir / filename)
        heat = 38 - 7.5 * green_level + 4 * building_level + rng.normal(0, 0.7)
        rows.append({
            "image": filename,
            "lon": 118.72 + (i % 10) * 0.006,
            "lat": 32.00 + (i // 10) * 0.008,
            "observed_heat_c": heat,
            "pedestrian_count": int(rng.integers(40, 280)),
            "corridor": ["A", "B", "C"][i // 10],
        })
    pd.DataFrame(rows).to_csv(data_dir / "image_index.csv", index=False)
    steps = [
        "Load a local street-view image set with location and comfort observations.",
        "Inspect image inventory, metadata, and sample montage.",
        "Segment sky, vegetation, road, and built facade using color-space and morphology rules.",
        "Measure green-view, sky-view, enclosure, edge density, and facade texture indicators.",
        "Validate indicator distributions and flag segmentation outliers.",
        "Cluster scenes into streetscape typologies with standardized image metrics.",
        "Model observed heat stress from image-derived indicators.",
        "Rank corridors and simulate a greening intervention for low-comfort scenes.",
        "Export segmentation panels, metric tables, clusters, and intervention rankings.",
    ]
    refs = [
        "scikit-image watershed segmentation example: https://scikit-image.org/docs/0.25.x/auto_examples/segmentation/plot_watershed.html",
        "OpenCV documentation: https://docs.opencv.org/",
        "TorchGeo overview: https://docs.torchgeo.org/",
    ]
    write_json(case_dir / "case.json", manifest(slug, title, "A CV-style streetscape notebook for segmentation, feature extraction, clustering, heat-stress modeling, and intervention ranking.", "This case adapts mature image-processing and urban visual analytics workflows to bundled street-view images so the CV runtime can execute offline.", "Streetview CV and Urban Comfort", "opengms-streetview-cv", ["OpenCV", "scikit-image", "Streetview", "Segmentation", "Urban Comfort"], steps, ["Scene segmentation panels.", "Image metrics and cluster assignments.", "Heat-stress model diagnostics and corridor intervention ranking."], refs))
    write_text(case_dir / "project" / "README.md", readme(title, "A longer street-view CV workflow with segmentation, feature extraction, clustering, and comfort modeling.", steps, refs))
    write_cover(case_dir / "cover.svg", title, ("#1e3a8a", "#0891b2", "#65a30d"))
    write_notebook(
        case_dir / "project" / "main.ipynb",
        [
            ("markdown", f"# {title}\n\nThis notebook follows mature street-view CV workflows: image QA, semantic segmentation, feature extraction, cluster-based typology, heat-stress modeling, and corridor intervention ranking."),
            ("code", """from pathlib import Path
import os, warnings
os.environ.setdefault("PROJ_LIB", "/opt/conda/share/proj")
os.environ.setdefault("PROJ_DATA", "/opt/conda/share/proj")
warnings.filterwarnings("ignore")
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image
from skimage import color, filters, measure, morphology, feature
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from IPython.display import display, Markdown
PROJECT = Path.cwd()
DATA = PROJECT / "data"
OUTPUTS = PROJECT / "outputs"
OUTPUTS.mkdir(exist_ok=True)
print("Data files:", [p.name for p in sorted(DATA.iterdir())])"""),
            ("code", """index = pd.read_csv(DATA / "image_index.csv")
display(index.head())
print(f"Images: {len(index)}, corridors: {index['corridor'].nunique()}")"""),
            ("code", """fig, axes = plt.subplots(3, 5, figsize=(12, 7), constrained_layout=True)
for ax, row in zip(axes.ravel(), index.head(15).itertuples(index=False)):
    img = Image.open(DATA / "images" / row.image)
    ax.imshow(img)
    ax.set_title(f"{row.image}\\nheat={row.observed_heat_c:.1f}C", fontsize=8)
    ax.axis("off")
fig.savefig(OUTPUTS / "streetview_sample_montage.png", dpi=170)
plt.show()
print("Saved outputs/streetview_sample_montage.png")"""),
            ("code", """def segment_image(path):
    arr = np.asarray(Image.open(path).convert("RGB")) / 255.0
    hsv = color.rgb2hsv(arr)
    gray = color.rgb2gray(arr)
    vegetation = (hsv[..., 0] > 0.20) & (hsv[..., 0] < 0.46) & (hsv[..., 1] > 0.22) & (hsv[..., 2] > 0.18)
    sky = (hsv[..., 0] > 0.50) & (hsv[..., 0] < 0.68) & (hsv[..., 1] > 0.12) & (hsv[..., 2] > 0.45)
    road = (gray < 0.43) & (~vegetation) & (~sky)
    facade = ~(vegetation | sky | road)
    vegetation = morphology.remove_small_objects(vegetation, 16)
    sky = morphology.remove_small_objects(sky, 24)
    road = morphology.remove_small_objects(road, 24)
    edges = feature.canny(gray, sigma=1.2)
    return arr, {"vegetation": vegetation, "sky": sky, "road": road, "facade": facade, "edges": edges}

arr, masks = segment_image(DATA / "images" / index.iloc[0]["image"])
print({name: int(mask.sum()) for name, mask in masks.items()})"""),
            ("code", """sample = index.iloc[0]["image"]
arr, masks = segment_image(DATA / "images" / sample)
fig, axes = plt.subplots(1, 6, figsize=(15, 3), constrained_layout=True)
axes[0].imshow(arr)
axes[0].set_title("RGB")
for ax, name in zip(axes[1:], ["vegetation", "sky", "road", "facade", "edges"]):
    ax.imshow(masks[name], cmap="gray")
    ax.set_title(name)
for ax in axes:
    ax.axis("off")
fig.savefig(OUTPUTS / "semantic_masks_example.png", dpi=170)
plt.show()
print(f"Saved segmentation example for {sample}")"""),
            ("code", """records = []
for row in index.itertuples(index=False):
    arr, masks = segment_image(DATA / "images" / row.image)
    total = arr.shape[0] * arr.shape[1]
    veg = masks["vegetation"]
    sky = masks["sky"]
    facade = masks["facade"]
    labels = measure.label(veg)
    props = measure.regionprops(labels)
    canopy_objects = len([p for p in props if p.area >= 20])
    records.append({
        "image": row.image,
        "green_view": veg.sum() / total,
        "sky_view": sky.sum() / total,
        "road_view": masks["road"].sum() / total,
        "facade_view": facade.sum() / total,
        "edge_density": masks["edges"].sum() / total,
        "canopy_objects": canopy_objects,
        "observed_heat_c": row.observed_heat_c,
        "pedestrian_count": row.pedestrian_count,
        "corridor": row.corridor,
    })
metrics = pd.DataFrame(records)
display(metrics.head().round(3))
display(metrics.describe().round(3))"""),
            ("code", """fig, axes = plt.subplots(1, 3, figsize=(14, 4), constrained_layout=True)
axes[0].hist(metrics["green_view"], bins=10, color="#16a34a")
axes[0].set_title("Green-view distribution")
axes[1].scatter(metrics["green_view"], metrics["observed_heat_c"], s=metrics["pedestrian_count"] / 3, alpha=0.7, color="#ef4444")
axes[1].set_xlabel("Green view")
axes[1].set_ylabel("Observed heat C")
axes[1].set_title("Comfort relationship")
axes[2].scatter(metrics["facade_view"], metrics["edge_density"], color="#2563eb", alpha=0.7)
axes[2].set_xlabel("Facade view")
axes[2].set_ylabel("Edge density")
axes[2].set_title("Built form texture")
fig.savefig(OUTPUTS / "streetscape_metric_diagnostics.png", dpi=170)
plt.show()
display(metrics.corr(numeric_only=True)["observed_heat_c"].sort_values().round(3))"""),
            ("code", """features = ["green_view", "sky_view", "road_view", "facade_view", "edge_density", "canopy_objects"]
X = StandardScaler().fit_transform(metrics[features])
kmeans = KMeans(n_clusters=4, random_state=4, n_init=20)
metrics["typology"] = kmeans.fit_predict(X)
cluster_summary = metrics.groupby("typology")[features + ["observed_heat_c"]].mean().round(3)
display(cluster_summary)"""),
            ("code", """fig, ax = plt.subplots(figsize=(7, 5))
for typology, sub in metrics.groupby("typology"):
    ax.scatter(sub["green_view"], sub["facade_view"], s=sub["pedestrian_count"] / 3, label=f"type {typology}", alpha=0.7)
ax.set_xlabel("Green view")
ax.set_ylabel("Facade enclosure")
ax.set_title("Streetscape typology clusters")
ax.legend()
fig.savefig(OUTPUTS / "streetscape_typology_clusters.png", dpi=170)
plt.show()
print("Saved outputs/streetscape_typology_clusters.png")"""),
            ("code", """model_features = ["green_view", "sky_view", "facade_view", "edge_density", "canopy_objects"]
model = LinearRegression().fit(metrics[model_features], metrics["observed_heat_c"])
metrics["predicted_heat_c"] = model.predict(metrics[model_features])
coef = pd.Series(model.coef_, index=model_features, name="heat_model_coef")
r2 = r2_score(metrics["observed_heat_c"], metrics["predicted_heat_c"])
fig, ax = plt.subplots(figsize=(5, 5))
ax.scatter(metrics["observed_heat_c"], metrics["predicted_heat_c"], color="#7c3aed", alpha=0.75)
lims = [metrics["observed_heat_c"].min() - 1, metrics["observed_heat_c"].max() + 1]
ax.plot(lims, lims, color="black", linestyle="--")
ax.set_xlabel("Observed heat C")
ax.set_ylabel("Predicted heat C")
ax.set_title(f"Heat model fit, R2={r2:.2f}")
fig.savefig(OUTPUTS / "heat_model_fit.png", dpi=170)
plt.show()
display(coef.round(3))"""),
            ("code", """metrics["comfort_priority"] = (
    metrics["predicted_heat_c"].rank(pct=True)
    + (1 - metrics["green_view"]).rank(pct=True)
    + metrics["pedestrian_count"].rank(pct=True)
)
priority = metrics.sort_values("comfort_priority", ascending=False).head(10)
display(priority[["image", "corridor", "green_view", "predicted_heat_c", "pedestrian_count", "comfort_priority"]].round(3))"""),
            ("code", """corridor = metrics.groupby("corridor").agg(
    scenes=("image", "count"),
    mean_green=("green_view", "mean"),
    mean_heat=("predicted_heat_c", "mean"),
    pedestrians=("pedestrian_count", "sum"),
    priority=("comfort_priority", "mean"),
).sort_values("priority", ascending=False)
display(corridor.round(3))
fig, ax = plt.subplots(figsize=(8, 4))
ax.bar(corridor.index, corridor["priority"], color=["#dc2626", "#f97316", "#22c55e"][:len(corridor)])
ax.set_title("Corridor comfort intervention priority")
ax.set_ylabel("Priority score")
fig.savefig(OUTPUTS / "corridor_priority.png", dpi=170)
plt.show()"""),
            ("code", """intervention = metrics.copy()
intervention["green_view_after"] = np.where(intervention["comfort_priority"] >= intervention["comfort_priority"].quantile(0.75), np.minimum(0.65, intervention["green_view"] + 0.14), intervention["green_view"])
after_features = intervention[model_features].copy()
after_features["green_view"] = intervention["green_view_after"]
intervention["heat_after_c"] = model.predict(after_features)
intervention["heat_reduction_c"] = intervention["predicted_heat_c"] - intervention["heat_after_c"]
display(intervention.sort_values("heat_reduction_c", ascending=False)[["image", "corridor", "green_view", "green_view_after", "heat_reduction_c"]].head(10).round(3))"""),
            ("code", """metrics.to_csv(OUTPUTS / "streetview_image_metrics.csv", index=False)
corridor.to_csv(OUTPUTS / "corridor_priority_summary.csv")
intervention.to_csv(OUTPUTS / "street_greening_intervention.csv", index=False)
print("Exported files:")
for path in sorted(OUTPUTS.iterdir()):
    print(f"- {path.name} ({path.stat().st_size} bytes)")"""),
            ("code", """top_corridor = corridor.index[0]
display(Markdown(f'''## Case conclusion

Corridor **{top_corridor}** is the highest intervention priority after combining image-derived heat exposure, low green-view, and pedestrian volume. The regression model reaches **R2={r2:.2f}** on the bundled audit set, and the intervention table estimates cooling benefits from targeted greening.
'''))"""),
        ],
    )


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    create_climate_case()
    create_urban_access_case()
    create_spatial_stats_case()
    create_hydro_case()
    create_energy_case()
    create_streetview_case()
    print("Generated mature case seeds:")
    for slug in [
        "climate-extreme-risk-atlas",
        "urban-accessibility-equity-scenarios",
        "spatial-econometric-housing-diagnostics",
        "watershed-flood-response-chain",
        "solar-storage-microgrid-dispatch",
        "streetview-semantic-comfort-audit",
    ]:
        print(f"- {ROOT / slug}")


if __name__ == "__main__":
    main()
