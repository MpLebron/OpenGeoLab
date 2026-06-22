#!/usr/bin/env python3
"""Generate a broad, heterogeneous set of OpenGeoLab case seeds.

The cases generated here are intentionally diverse. They are not split variants
of one experiment: every case has a different research scenario, domain label,
tags, data shape, analysis visual, and result-derived cover image.
"""

from __future__ import annotations

import json
import math
import shutil
from dataclasses import dataclass
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import nbformat as nbf
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1] / "case-seeds"
TIME_LABEL = "2026/06/21"


@dataclass(frozen=True)
class CaseSpec:
    slug: str
    title: str
    domain: str
    summary: str
    focus: str
    visual: str
    runtime: str
    tags: tuple[str, ...]
    palette: tuple[str, str, str]


CASE_SPECS: tuple[CaseSpec, ...] = (
    CaseSpec("coastal-algal-bloom-early-warning", "Coastal Algal Bloom Early Warning", "Coastal Ocean Monitoring", "Detect bloom-prone coastal cells from chlorophyll, temperature, turbidity, and wind exposure.", "coastal harmful algal bloom alerting", "raster", "opengms-cloud-eo", ("Ocean Color", "Chlorophyll", "Coastal Risk", "Remote Sensing"), ("#0f766e", "#22c55e", "#fde047")),
    CaseSpec("coral-reef-bleaching-thermal-stress", "Coral Reef Bleaching Thermal Stress", "Marine Ecology", "Map reef sectors where thermal stress and light exposure raise bleaching pressure.", "coral bleaching thermal stress screening", "matrix", "opengms-pangeo-earth", ("Coral Reef", "Thermal Stress", "Ecology", "Climate"), ("#0e7490", "#f97316", "#fef3c7")),
    CaseSpec("mangrove-blue-carbon-monitoring", "Mangrove Blue Carbon Monitoring", "Coastal Blue Carbon", "Estimate mangrove carbon priority zones from canopy vigor, tidal exposure, and disturbance signals.", "mangrove blue-carbon monitoring", "raster", "opengms-cloud-eo", ("Mangrove", "Blue Carbon", "Vegetation", "Coastal"), ("#064e3b", "#10b981", "#a7f3d0")),
    CaseSpec("glacier-lake-outburst-screening", "Glacier Lake Outburst Screening", "Cryosphere Hazard", "Rank glacier lakes by expansion, slope confinement, and downstream exposure.", "glacial lake outburst flood screening", "ranked", "opengms-hydro-terrain", ("Glacier Lake", "GLOF", "Terrain", "Hazard"), ("#1e3a8a", "#38bdf8", "#e0f2fe")),
    CaseSpec("permafrost-thaw-settlement-risk", "Permafrost Thaw Settlement Risk", "Cold Region Infrastructure", "Screen settlement-sensitive corridors using thaw depth, ice content, and asset exposure.", "permafrost infrastructure risk", "profile", "opengms-pangeo-earth", ("Permafrost", "Infrastructure", "Ground Ice", "Risk"), ("#1f2937", "#93c5fd", "#f9fafb")),
    CaseSpec("landslide-rainfall-thresholds", "Landslide Rainfall Thresholds", "Slope Hazard Analytics", "Compare rainfall intensity-duration signals with terrain susceptibility for landslide warning zones.", "landslide threshold analysis", "scatter", "opengms-hydro-terrain", ("Landslide", "Rainfall", "Slope", "Threshold"), ("#713f12", "#f59e0b", "#fef3c7")),
    CaseSpec("wildfire-fuel-moisture-danger", "Wildfire Fuel Moisture Danger", "Wildfire Risk", "Combine fuel moisture, wind, slope, and road access to identify wildfire response priorities.", "wildfire danger mapping", "raster", "opengms-cloud-eo", ("Wildfire", "Fuel Moisture", "Response", "Hazard"), ("#7f1d1d", "#f97316", "#fde68a")),
    CaseSpec("earthquake-shelter-capacity-allocation", "Earthquake Shelter Capacity Allocation", "Disaster Response Planning", "Allocate neighborhoods to shelters under capacity limits and road-disruption penalties.", "earthquake shelter allocation", "network", "opengms-urban-mobility", ("Earthquake", "Shelter", "Capacity", "Network"), ("#312e81", "#6366f1", "#e0e7ff")),
    CaseSpec("volcanic-ashfall-exposure-routing", "Volcanic Ashfall Exposure Routing", "Volcanic Hazard Logistics", "Plan low-exposure logistics routes through ashfall probability and wind-drift surfaces.", "volcanic ashfall routing", "network", "opengms-hydro-terrain", ("Volcanic Ash", "Routing", "Exposure", "Logistics"), ("#44403c", "#a16207", "#fde68a")),
    CaseSpec("drought-crop-yield-sentinel", "Drought Crop Yield Sentinel", "Agricultural Drought", "Track yield-risk parcels using vegetation anomaly, soil moisture, and rainfall deficit indicators.", "agricultural drought yield sentinel", "timeseries", "opengms-cloud-eo", ("Drought", "Crop Yield", "NDVI", "Soil Moisture"), ("#365314", "#84cc16", "#fef9c3")),
    CaseSpec("irrigation-canal-water-loss-audit", "Irrigation Canal Water Loss Audit", "Irrigation Water Management", "Prioritize canal reaches where seepage, delivery gaps, and crop demand indicate water loss.", "irrigation canal leakage audit", "profile", "opengms-hydro-terrain", ("Irrigation", "Canal", "Water Loss", "Agriculture"), ("#164e63", "#06b6d4", "#cffafe")),
    CaseSpec("soil-salinity-reclamation-zoning", "Soil Salinity Reclamation Zoning", "Soil and Land Management", "Classify reclamation zones from salinity, drainage, elevation, and vegetation recovery.", "soil salinity reclamation zoning", "matrix", "opengms-cloud-eo", ("Soil Salinity", "Reclamation", "Drainage", "Land"), ("#78350f", "#f59e0b", "#ecfccb")),
    CaseSpec("pest-habitat-suitability-forecast", "Pest Habitat Suitability Forecast", "Agroecological Pest Risk", "Forecast pest-suitable habitats from host availability, temperature, humidity, and field connectivity.", "crop pest habitat forecast", "raster", "opengms-spatial-stats", ("Pest Risk", "Habitat Suitability", "Agriculture", "Forecast"), ("#581c87", "#a855f7", "#f0abfc")),
    CaseSpec("pollinator-corridor-connectivity", "Pollinator Corridor Connectivity", "Landscape Ecology", "Identify flower-rich corridor gaps between farms, hedgerows, and habitat patches.", "pollinator corridor connectivity", "network", "opengms-spatial-stats", ("Pollinator", "Connectivity", "Habitat", "Landscape"), ("#831843", "#ec4899", "#fce7f3")),
    CaseSpec("wetland-methane-hotspot-screening", "Wetland Methane Hotspot Screening", "Wetland Carbon Flux", "Screen methane-emission hotspots from inundation persistence, biomass, and temperature.", "wetland methane hotspot screening", "raster", "opengms-pangeo-earth", ("Wetland", "Methane", "Carbon Flux", "Inundation"), ("#134e4a", "#14b8a6", "#ccfbf1")),
    CaseSpec("river-plastic-debris-tracking", "River Plastic Debris Tracking", "River Pollution Monitoring", "Trace plastic-debris accumulation risk using flow convergence, land use, and cleanup accessibility.", "river plastic debris tracking", "network", "opengms-hydro-terrain", ("River Pollution", "Plastic Debris", "Flow", "Cleanup"), ("#0f172a", "#38bdf8", "#f8fafc")),
    CaseSpec("reservoir-sediment-trap-efficiency", "Reservoir Sediment Trap Efficiency", "Reservoir Sediment Management", "Compare sub-basin sediment delivery, storage loss, and trap-efficiency scenarios.", "reservoir sediment management", "ranked", "opengms-hydro-terrain", ("Reservoir", "Sediment", "Trap Efficiency", "Watershed"), ("#78350f", "#d97706", "#ffedd5")),
    CaseSpec("groundwater-nitrate-vulnerability", "Groundwater Nitrate Vulnerability", "Groundwater Quality", "Map aquifer nitrate vulnerability from fertilizer pressure, recharge, depth, and soil permeability.", "groundwater nitrate vulnerability", "scatter", "opengms-spatial-stats", ("Groundwater", "Nitrate", "Aquifer", "Water Quality"), ("#1d4ed8", "#22c55e", "#dbeafe")),
    CaseSpec("snowpack-runoff-seasonal-forecast", "Snowpack Runoff Seasonal Forecast", "Mountain Hydroclimate", "Estimate seasonal runoff risk from snow-water equivalent, melt degree days, and basin storage.", "snowpack runoff forecasting", "timeseries", "opengms-pangeo-earth", ("Snowpack", "Runoff", "Hydroclimate", "Forecast"), ("#075985", "#7dd3fc", "#f0f9ff")),
    CaseSpec("urban-tree-canopy-cooling-benefits", "Urban Tree Canopy Cooling Benefits", "Urban Climate Adaptation", "Rank blocks where canopy restoration can reduce heat exposure for vulnerable residents.", "urban canopy cooling benefit mapping", "raster", "opengms-geoviz", ("Tree Canopy", "Cooling", "Urban Heat", "Equity"), ("#14532d", "#22c55e", "#dcfce7")),
    CaseSpec("noise-exposure-school-buffer", "Noise Exposure School Buffer", "Urban Environmental Health", "Assess school-area noise exposure from traffic intensity, building shielding, and buffer design.", "school noise exposure screening", "profile", "opengms-urban-mobility", ("Noise", "Schools", "Traffic", "Health"), ("#3f3f46", "#facc15", "#f4f4f5")),
    CaseSpec("air-quality-sensor-calibration-map", "Air Quality Sensor Calibration Map", "Air Quality Sensing", "Calibrate low-cost sensors against reference monitors and map residual PM2.5 bias.", "air-quality sensor calibration", "scatter", "opengms-spatial-stats", ("Air Quality", "Sensors", "Calibration", "PM2.5"), ("#0f766e", "#64748b", "#ecfeff")),
    CaseSpec("mobility-emissions-low-emission-zone", "Mobility Emissions Low Emission Zone", "Transport Emissions", "Evaluate candidate low-emission zones using traffic flow, bus priority, and exposure reduction.", "low-emission zone screening", "matrix", "opengms-urban-mobility", ("Transport", "Emissions", "Low Emission Zone", "Exposure"), ("#111827", "#22c55e", "#d1fae5")),
    CaseSpec("evacuation-network-flood-closure", "Evacuation Network Flood Closure", "Flood Evacuation Planning", "Measure evacuation robustness when roads are closed by depth-dependent flood disruption.", "flood evacuation network robustness", "network", "opengms-hydro-terrain", ("Evacuation", "Flood", "Road Closure", "Network"), ("#1e40af", "#60a5fa", "#dbeafe")),
    CaseSpec("logistics-cold-chain-risk-grid", "Logistics Cold Chain Risk Grid", "Food Logistics Resilience", "Map cold-chain shipment risk from travel delay, temperature exposure, and warehouse capacity.", "cold-chain logistics risk", "ranked", "opengms-urban-mobility", ("Logistics", "Cold Chain", "Risk", "Food"), ("#0f172a", "#2dd4bf", "#ccfbf1")),
    CaseSpec("port-hinterland-freight-resilience", "Port Hinterland Freight Resilience", "Freight Infrastructure", "Identify freight corridors vulnerable to port congestion, bridge constraints, and storm disruption.", "port hinterland freight resilience", "network", "opengms-urban-mobility", ("Freight", "Port", "Resilience", "Infrastructure"), ("#172554", "#f97316", "#ffedd5")),
    CaseSpec("tourism-carrying-capacity-park", "Tourism Carrying Capacity Park", "Protected Area Management", "Estimate trail and viewpoint pressure under seasonal tourism scenarios and habitat sensitivity.", "tourism carrying capacity planning", "timeseries", "opengms-geoviz", ("Tourism", "Carrying Capacity", "Protected Area", "Trails"), ("#064e3b", "#65a30d", "#ecfccb")),
    CaseSpec("cultural-heritage-flood-exposure", "Cultural Heritage Flood Exposure", "Heritage Risk Management", "Prioritize heritage assets by flood depth, material fragility, access difficulty, and recovery value.", "heritage flood exposure ranking", "ranked", "opengms-hydro-terrain", ("Cultural Heritage", "Flood Exposure", "Asset Risk", "Recovery"), ("#422006", "#b45309", "#fef3c7")),
    CaseSpec("food-desert-retail-accessibility", "Food Desert Retail Accessibility", "Food Access Equity", "Map neighborhoods where food-store access and affordability constraints overlap.", "food desert accessibility screening", "network", "opengms-urban-mobility", ("Food Access", "Retail", "Equity", "Accessibility"), ("#7c2d12", "#fb923c", "#ffedd5")),
    CaseSpec("hospital-surge-catchment-planning", "Hospital Surge Catchment Planning", "Health System Resilience", "Estimate hospital surge catchments from bed capacity, travel time, and scenario demand.", "hospital surge catchment planning", "matrix", "opengms-urban-mobility", ("Hospital", "Surge Capacity", "Catchment", "Health"), ("#7f1d1d", "#ef4444", "#fee2e2")),
    CaseSpec("vector-borne-disease-habitat-alert", "Vector Borne Disease Habitat Alert", "Epidemiological Ecology", "Screen mosquito habitat alert zones using standing water, temperature, vegetation, and population exposure.", "vector-borne disease habitat alert", "raster", "opengms-spatial-stats", ("Vector Disease", "Habitat", "Population Exposure", "Alert"), ("#581c87", "#22c55e", "#dcfce7")),
    CaseSpec("heatwave-energy-demand-response", "Heatwave Energy Demand Response", "Urban Energy Resilience", "Estimate cooling demand peaks and demand-response potential during heatwave episodes.", "heatwave energy demand response", "timeseries", "opengms-urban-energy", ("Heatwave", "Energy Demand", "Demand Response", "Cooling"), ("#7f1d1d", "#facc15", "#fef9c3")),
    CaseSpec("offshore-wind-site-screening", "Offshore Wind Site Screening", "Renewable Energy Siting", "Rank offshore wind lease cells by wind resource, bathymetry, cable distance, and ecological constraints.", "offshore wind site screening", "raster", "opengms-cloud-eo", ("Offshore Wind", "Siting", "Bathymetry", "Renewable Energy"), ("#0c4a6e", "#38bdf8", "#ecfeff")),
    CaseSpec("geothermal-gradient-resource-ranking", "Geothermal Gradient Resource Ranking", "Subsurface Energy", "Rank geothermal prospects from heat-flow gradient, drilling depth, water demand, and grid distance.", "geothermal resource ranking", "scatter", "opengms-spatial-stats", ("Geothermal", "Subsurface", "Resource Ranking", "Energy"), ("#7c2d12", "#dc2626", "#fee2e2")),
    CaseSpec("mining-tailings-dam-stability-monitor", "Mining Tailings Dam Stability Monitor", "Mine Safety Monitoring", "Monitor tailings-dam stability using rainfall, pond proximity, deformation, and downstream exposure.", "tailings dam stability monitoring", "profile", "opengms-hydro-terrain", ("Mining", "Tailings Dam", "Safety", "Monitoring"), ("#292524", "#f59e0b", "#fef3c7")),
    CaseSpec("quarry-blast-vibration-setback", "Quarry Blast Vibration Setback", "Industrial Environmental Safety", "Estimate blast-vibration setback zones for settlements, slopes, and critical infrastructure.", "quarry blast vibration setback", "scatter", "opengms-spatial-stats", ("Quarry", "Vibration", "Setback", "Safety"), ("#3f3f46", "#a855f7", "#f3e8ff")),
    CaseSpec("powerline-vegetation-encroachment", "Powerline Vegetation Encroachment", "Utility Vegetation Management", "Rank spans where canopy height, wind throw, and access constraints threaten transmission lines.", "powerline vegetation encroachment", "profile", "opengms-pointcloud-lidar", ("Powerline", "Vegetation", "LiDAR", "Utility"), ("#14532d", "#facc15", "#fef9c3")),
    CaseSpec("telecom-outage-storm-restoration", "Telecom Outage Storm Restoration", "Critical Infrastructure Recovery", "Prioritize telecom restoration crews from outage clusters, tower backup power, and road accessibility.", "telecom outage restoration planning", "network", "opengms-urban-mobility", ("Telecom", "Outage", "Storm", "Restoration"), ("#312e81", "#06b6d4", "#cffafe")),
    CaseSpec("school-walkability-safety-index", "School Walkability Safety Index", "Safe Routes to School", "Rate school walking corridors using crossing density, vehicle speed, sidewalk continuity, and crash history.", "school walkability safety index", "ranked", "opengms-urban-mobility", ("Walkability", "Schools", "Safety", "Streets"), ("#1e3a8a", "#f97316", "#ffedd5")),
    CaseSpec("crime-hotspot-environmental-design", "Crime Hotspot Environmental Design", "Urban Safety Analytics", "Screen public-realm hotspots using lighting, land-use mix, footfall, and incident clustering.", "crime prevention environmental design", "raster", "opengms-spatial-stats", ("Urban Safety", "Hotspots", "CPTED", "Public Realm"), ("#111827", "#f43f5e", "#ffe4e6")),
    CaseSpec("housing-vacancy-regeneration-priority", "Housing Vacancy Regeneration Priority", "Urban Regeneration", "Rank blocks for regeneration from vacancy, transit access, age, market stress, and social need.", "housing vacancy regeneration priority", "matrix", "opengms-spatial-stats", ("Housing", "Vacancy", "Regeneration", "Urban Planning"), ("#334155", "#06b6d4", "#e0f2fe")),
    CaseSpec("informal-settlement-service-upgrade", "Informal Settlement Service Upgrade", "Inclusive Urban Services", "Prioritize service upgrades where water, sanitation, drainage, and tenure risks intersect.", "informal settlement service upgrading", "ranked", "opengms-geoviz", ("Informal Settlement", "Service Upgrade", "Equity", "Planning"), ("#7c2d12", "#22c55e", "#dcfce7")),
    CaseSpec("land-subsidence-insar-trend-audit", "Land Subsidence InSAR Trend Audit", "Ground Deformation Monitoring", "Audit subsidence trends from time-series deformation, groundwater stress, and infrastructure exposure.", "land subsidence InSAR trend audit", "timeseries", "opengms-cloud-eo", ("InSAR", "Subsidence", "Groundwater", "Infrastructure"), ("#1f2937", "#60a5fa", "#dbeafe")),
    CaseSpec("bathymetry-channel-dredging-priority", "Bathymetry Channel Dredging Priority", "Navigation Channel Management", "Rank channel segments where shoaling, vessel draft, and sedimentation require dredging.", "navigation channel dredging priority", "profile", "opengms-hydro-terrain", ("Bathymetry", "Dredging", "Navigation", "Sediment"), ("#0c4a6e", "#f59e0b", "#cffafe")),
    CaseSpec("shipping-lane-ice-risk", "Shipping Lane Ice Risk", "Polar Marine Transport", "Map shipping-lane risk from sea-ice concentration, drift, visibility, and rescue distance.", "shipping lane ice-risk monitoring", "timeseries", "opengms-pangeo-earth", ("Sea Ice", "Shipping", "Marine Risk", "Polar"), ("#172554", "#67e8f9", "#ecfeff")),
    CaseSpec("marine-protected-area-patrol-planning", "Marine Protected Area Patrol Planning", "Marine Conservation Operations", "Schedule patrol zones from vessel density, habitat sensitivity, and enforcement history.", "marine protected area patrol planning", "network", "opengms-geoviz", ("MPA", "Patrol", "Conservation", "Vessel Activity"), ("#134e4a", "#2dd4bf", "#ccfbf1")),
    CaseSpec("fisheries-catch-effort-spatial-balance", "Fisheries Catch Effort Spatial Balance", "Fisheries Management", "Compare catch-per-unit-effort, habitat sensitivity, and fleet pressure across fishing grounds.", "fisheries catch-effort balance", "scatter", "opengms-spatial-stats", ("Fisheries", "CPUE", "Fleet Pressure", "Management"), ("#0f172a", "#38bdf8", "#fef3c7")),
    CaseSpec("invasive-plant-roadside-spread", "Invasive Plant Roadside Spread", "Invasive Species Monitoring", "Model roadside invasion pressure from seed sources, disturbance, moisture, and traffic corridors.", "invasive plant roadside spread", "network", "opengms-spatial-stats", ("Invasive Species", "Roadside", "Spread", "Ecology"), ("#365314", "#a3e635", "#f7fee7")),
    CaseSpec("snow-avalanche-terrain-exposure", "Snow Avalanche Terrain Exposure", "Mountain Hazard Safety", "Screen avalanche paths using slope, aspect, snow loading, and exposed trail segments.", "snow avalanche terrain exposure", "raster", "opengms-hydro-terrain", ("Avalanche", "Snow", "Terrain", "Exposure"), ("#0f172a", "#e0f2fe", "#38bdf8")),
    CaseSpec("pipeline-leak-detection-pressure-zones", "Pipeline Leak Detection Pressure Zones", "Pipeline Integrity Monitoring", "Detect pipeline leak-prone zones from pressure residuals, soil corrosion, slope, and nearby receptors.", "pipeline leak detection pressure zones", "profile", "opengms-spatial-stats", ("Pipeline", "Leak Detection", "Pressure", "Infrastructure"), ("#450a0a", "#f97316", "#fee2e2")),
)


def stable_seed(slug: str) -> int:
    value = 0
    for idx, char in enumerate(slug):
        value += (idx + 17) * ord(char)
    return value % (2**32 - 1)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def reset_case(slug: str) -> Path:
    case_dir = ROOT / slug
    if case_dir.exists():
        shutil.rmtree(case_dir)
    (case_dir / "project" / "data").mkdir(parents=True, exist_ok=True)
    (case_dir / "project" / "outputs").mkdir(parents=True, exist_ok=True)
    return case_dir


def make_common_tables(spec: CaseSpec, data_dir: Path) -> dict[str, pd.DataFrame]:
    rng = np.random.default_rng(stable_seed(spec.slug))
    n = 144
    x = rng.uniform(0, 100, n)
    y = rng.uniform(0, 100, n)
    hotspot_a = np.exp(-(((x - 32) / 20) ** 2 + ((y - 68) / 22) ** 2))
    hotspot_b = np.exp(-(((x - 72) / 23) ** 2 + ((y - 35) / 18) ** 2))
    pressure = np.clip(0.36 + 0.48 * hotspot_a + 0.22 * rng.random(n), 0, 1)
    exposure = np.clip(0.30 + 0.45 * hotspot_b + 0.25 * rng.random(n), 0, 1)
    resilience = np.clip(0.15 + 0.70 * rng.random(n), 0, 1)
    trend = np.clip(0.18 + 0.58 * (x / 100) + 0.20 * rng.random(n), 0, 1)
    risk = np.clip(0.44 * pressure + 0.36 * exposure + 0.20 * trend - 0.23 * resilience, 0, 1)
    region = np.where(x < 50, "west", "east")
    region = np.where(y > 50, region + "-north", region + "-south")
    observations = pd.DataFrame(
        {
            "sample_id": [f"S{i + 1:03d}" for i in range(n)],
            "x": x.round(3),
            "y": y.round(3),
            "pressure": pressure.round(4),
            "exposure": exposure.round(4),
            "resilience": resilience.round(4),
            "trend": trend.round(4),
            "priority_score": risk.round(4),
            "region": region,
        }
    )

    months = pd.date_range("2024-01-01", periods=36, freq="MS")
    seasonal = np.sin(np.linspace(0, 5.4 * math.pi, len(months)))
    baseline = 0.42 + 0.10 * seasonal + rng.normal(0, 0.025, len(months))
    observed = baseline + np.linspace(-0.03, 0.16, len(months)) + rng.normal(0, 0.035, len(months))
    scenario = observed - 0.06 * np.clip(np.sin(np.linspace(0, 3.0 * math.pi, len(months))) + 1, 0, 2)
    timeseries = pd.DataFrame(
        {
            "date": months.strftime("%Y-%m-%d"),
            "baseline": baseline.round(4),
            "observed": observed.round(4),
            "mitigation_scenario": scenario.round(4),
        }
    )

    entities = pd.DataFrame(
        {
            "asset_id": [f"A{i + 1:02d}" for i in range(18)],
            "asset_name": [f"{spec.focus.title()} sector {i + 1}" for i in range(18)],
            "demand_or_value": rng.integers(80, 680, 18),
            "vulnerability": np.clip(rng.beta(2.2, 2.8, 18), 0, 1).round(4),
            "access_difficulty": np.clip(rng.beta(2.6, 2.4, 18), 0, 1).round(4),
        }
    )
    entities["priority_score"] = (
        0.45 * entities["vulnerability"]
        + 0.35 * entities["access_difficulty"]
        + 0.20 * (entities["demand_or_value"] / entities["demand_or_value"].max())
    ).round(4)

    grid_x, grid_y = np.meshgrid(np.arange(18), np.arange(12))
    grid = pd.DataFrame({"gx": grid_x.ravel(), "gy": grid_y.ravel()})
    field = (
        0.50 * np.exp(-(((grid["gx"] - 5.0) / 4.0) ** 2 + ((grid["gy"] - 8.0) / 3.0) ** 2))
        + 0.42 * np.exp(-(((grid["gx"] - 13.0) / 3.5) ** 2 + ((grid["gy"] - 3.0) / 3.2) ** 2))
        + 0.13 * rng.random(len(grid))
    )
    grid["priority_score"] = np.clip(field, 0, 1).round(4)
    grid["constraint"] = np.clip(0.15 + 0.70 * rng.random(len(grid)), 0, 1).round(4)

    nodes = observations.head(26)[["sample_id", "x", "y", "priority_score"]].rename(columns={"sample_id": "node_id"})
    edges = []
    node_records = nodes.to_dict("records")
    for i, a in enumerate(node_records):
        distances = []
        for j, b in enumerate(node_records):
            if i == j:
                continue
            d = math.hypot(a["x"] - b["x"], a["y"] - b["y"])
            distances.append((d, b["node_id"]))
        for d, target in sorted(distances)[:2]:
            edges.append({"source": a["node_id"], "target": target, "travel_cost": round(d * (1.0 + rng.random()), 3)})
    edges_df = pd.DataFrame(edges).drop_duplicates()

    tables = {
        "observations": observations,
        "timeseries": timeseries,
        "entities": entities,
        "grid": grid,
        "nodes": nodes,
        "edges": edges_df,
    }
    for name, frame in tables.items():
        frame.to_csv(data_dir / f"{name}.csv", index=False)
    return tables


def render_result(spec: CaseSpec, tables: dict[str, pd.DataFrame], output_path: Path) -> None:
    primary, secondary, light = spec.palette
    plt.rcParams.update({"font.size": 9, "axes.titlesize": 11, "axes.labelsize": 9})
    fig, axes = plt.subplots(1, 2, figsize=(10, 5), constrained_layout=True)
    fig.patch.set_facecolor("white")

    if spec.visual == "raster":
        grid = tables["grid"]
        raster = grid.pivot(index="gy", columns="gx", values="priority_score").sort_index(ascending=False)
        im = axes[0].imshow(raster, cmap="viridis")
        axes[0].set_title("Priority surface")
        axes[0].set_xticks([])
        axes[0].set_yticks([])
        fig.colorbar(im, ax=axes[0], fraction=0.046)
        obs = tables["observations"]
        axes[1].scatter(obs["pressure"], obs["exposure"], c=obs["priority_score"], cmap="magma", s=28, alpha=0.85)
        axes[1].set_xlabel("Pressure")
        axes[1].set_ylabel("Exposure")
        axes[1].set_title("Driver space")
    elif spec.visual == "timeseries":
        ts = tables["timeseries"]
        dates = pd.to_datetime(ts["date"])
        axes[0].plot(dates, ts["baseline"], color="#64748b", label="baseline", linewidth=2)
        axes[0].plot(dates, ts["observed"], color=primary, label="observed", linewidth=2)
        axes[0].plot(dates, ts["mitigation_scenario"], color=secondary, label="scenario", linewidth=2)
        axes[0].set_title("Monthly trajectory")
        axes[0].legend(frameon=False)
        delta = ts["observed"] - ts["baseline"]
        axes[1].bar(dates, delta, color=secondary, width=20)
        axes[1].axhline(0, color="#111827", linewidth=0.8)
        axes[1].set_title("Observed anomaly")
    elif spec.visual == "network":
        nodes = tables["nodes"]
        edges = tables["edges"]
        node_lookup = nodes.set_index("node_id")
        for edge in edges.itertuples(index=False):
            a = node_lookup.loc[edge.source]
            b = node_lookup.loc[edge.target]
            axes[0].plot([a.x, b.x], [a.y, b.y], color="#94a3b8", linewidth=0.7, alpha=0.6)
        axes[0].scatter(nodes["x"], nodes["y"], c=nodes["priority_score"], s=90, cmap="plasma", edgecolor="white", linewidth=0.6)
        axes[0].set_title("Network exposure")
        axes[0].set_xticks([])
        axes[0].set_yticks([])
        ranked = tables["entities"].sort_values("priority_score", ascending=True).tail(8)
        axes[1].barh(range(len(ranked)), ranked["priority_score"], color=primary)
        axes[1].set_yticks(range(len(ranked)))
        axes[1].set_yticklabels(ranked["asset_id"])
        axes[1].set_title("Priority assets")
    elif spec.visual == "matrix":
        obs = tables["observations"]
        matrix = obs.pivot_table(index="region", columns=pd.cut(obs["pressure"], 5), values="priority_score", aggfunc="mean", observed=False)
        im = axes[0].imshow(matrix.fillna(0), cmap="coolwarm", vmin=0, vmax=1)
        axes[0].set_title("Regional pressure matrix")
        axes[0].set_yticks(range(len(matrix.index)))
        axes[0].set_yticklabels(matrix.index)
        axes[0].set_xticks([])
        fig.colorbar(im, ax=axes[0], fraction=0.046)
        ent = tables["entities"].sort_values("priority_score", ascending=False).head(10)
        axes[1].plot(ent["vulnerability"], ent["access_difficulty"], marker="o", color=secondary, linewidth=2)
        axes[1].set_xlabel("Vulnerability")
        axes[1].set_ylabel("Access difficulty")
        axes[1].set_title("Asset trade-off curve")
    elif spec.visual == "scatter":
        obs = tables["observations"]
        axes[0].scatter(obs["pressure"], obs["priority_score"], c=obs["trend"], cmap="cividis", s=36, alpha=0.85)
        coef = np.polyfit(obs["pressure"], obs["priority_score"], 1)
        xs = np.linspace(obs["pressure"].min(), obs["pressure"].max(), 50)
        axes[0].plot(xs, coef[0] * xs + coef[1], color=primary, linewidth=2)
        axes[0].set_xlabel("Pressure")
        axes[0].set_ylabel("Priority score")
        axes[0].set_title("Pressure-risk relationship")
        axes[1].hist(obs["priority_score"], bins=18, color=secondary, alpha=0.85)
        axes[1].set_title("Priority distribution")
    elif spec.visual == "profile":
        grid = tables["grid"]
        profile = grid.groupby("gx")[["priority_score", "constraint"]].mean().reset_index()
        axes[0].fill_between(profile["gx"], profile["priority_score"], color=primary, alpha=0.32)
        axes[0].plot(profile["gx"], profile["priority_score"], color=primary, linewidth=2)
        axes[0].plot(profile["gx"], profile["constraint"], color=secondary, linewidth=2)
        axes[0].set_title("Longitudinal profile")
        axes[0].set_xlabel("Segment")
        axes[0].legend(["Priority", "Constraint"], frameon=False)
        ent = tables["entities"].sort_values("priority_score", ascending=False).head(9)
        axes[1].bar(ent["asset_id"], ent["priority_score"], color=primary)
        axes[1].set_title("Inspection targets")
        axes[1].tick_params(axis="x", rotation=45)
    else:
        ent = tables["entities"].sort_values("priority_score", ascending=True).tail(12)
        axes[0].barh(range(len(ent)), ent["priority_score"], color=primary)
        axes[0].set_yticks(range(len(ent)))
        axes[0].set_yticklabels(ent["asset_id"])
        axes[0].set_title("Ranked intervention queue")
        obs = tables["observations"]
        axes[1].scatter(obs["x"], obs["y"], s=28 + 80 * obs["priority_score"], c=obs["priority_score"], cmap="viridis", alpha=0.82)
        axes[1].set_title("Spatial sample field")
        axes[1].set_xticks([])
        axes[1].set_yticks([])

    fig.suptitle(spec.title, x=0.02, y=1.02, ha="left", fontsize=15, fontweight="bold")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=170, bbox_inches="tight")
    plt.close(fig)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def fit_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def fit_contain(image: Image.Image, size: tuple[int, int], fill: tuple[int, int, int]) -> Image.Image:
    contained = ImageOps.contain(image.convert("RGB"), size, method=Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", size, fill)
    canvas.paste(contained, ((size[0] - contained.width) // 2, (size[1] - contained.height) // 2))
    return canvas


def paste_with_shadow(canvas: Image.Image, image: Image.Image, xy: tuple[int, int], radius: int = 28) -> None:
    x, y = xy
    shadow = Image.new("RGBA", (image.width + radius * 2, image.height + radius * 2), (0, 0, 0, 0))
    mask = Image.new("L", (image.width, image.height), 210)
    shadow.paste((15, 23, 42, 70), (radius, radius), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius // 2))
    canvas.paste(shadow, (x - radius, y - radius), shadow)
    canvas.paste(image.convert("RGB"), (x, y))


def draw_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.ImageFont, fill: tuple[int, int, int], bg: tuple[int, int, int] | None = None) -> None:
    x, y = xy
    bbox = draw.textbbox((x, y), text, font=font)
    if bg:
        pad_x, pad_y = 12, 6
        draw.rounded_rectangle((bbox[0] - pad_x, bbox[1] - pad_y, bbox[2] + pad_x, bbox[3] + pad_y), radius=10, fill=bg)
    draw.text((x, y), text, font=font, fill=fill)


def wrap_lines(text: str, font: ImageFont.ImageFont, max_width: int, max_lines: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for word in words:
        trial = " ".join(current + [word])
        if measure.textlength(trial, font=font) <= max_width or not current:
            current.append(word)
            continue
        lines.append(" ".join(current))
        current = [word]
        if len(lines) >= max_lines:
            break
    if current and len(lines) < max_lines:
        lines.append(" ".join(current))
    if len(lines) == max_lines and len(" ".join(words)) > len(" ".join(lines)):
        lines[-1] = lines[-1].rstrip(".") + "..."
    return lines


def draw_title_block(draw: ImageDraw.ImageDraw, x: int, y: int, title: str, domain: str, text_color: tuple[int, int, int], accent: tuple[int, int, int], width: int, scale: int = 1) -> None:
    label_font = load_font(19 * scale, bold=True)
    title_font = load_font(48 * scale, bold=True)
    domain_font = load_font(23 * scale)
    draw_label(draw, (x, y), domain.upper(), label_font, text_color, tuple(min(255, channel + 210) for channel in accent))
    offset = y + 50 * scale
    for line in wrap_lines(title, title_font, width, 3):
        draw.text((x, offset), line, font=title_font, fill=text_color)
        offset += 58 * scale
    draw.text((x, offset + 8 * scale), "OpenGeoLab reproducible case", font=domain_font, fill=text_color)


def crop_panel_regions(panel: Image.Image, variant: int) -> Image.Image:
    width, height = panel.size
    top = int(height * 0.12)
    body = panel.crop((0, top, width, height))
    if variant % 5 == 0:
        return body.crop((0, 0, int(body.width * 0.58), body.height))
    if variant % 5 == 1:
        return body.crop((int(body.width * 0.42), 0, body.width, body.height))
    if variant % 5 == 2:
        return body.crop((int(body.width * 0.16), 0, int(body.width * 0.86), body.height))
    if variant % 5 == 3:
        return body.crop((0, int(body.height * 0.04), body.width, int(body.height * 0.88)))
    return body


def render_cover_from_result(spec: CaseSpec, panel_path: Path, cover_path: Path) -> None:
    panel = Image.open(panel_path).convert("RGB")
    primary = hex_to_rgb(spec.palette[0])
    secondary = hex_to_rgb(spec.palette[1])
    light = hex_to_rgb(spec.palette[2])
    ink = (15, 23, 42)
    variant = stable_seed(spec.slug) % 6
    size = (1280, 720)
    crop = crop_panel_regions(panel, variant)

    if variant == 0:
        canvas = fit_crop(crop, size)
        overlay = Image.new("RGBA", size, primary + (132,))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, 470, size[1]), fill=(255, 255, 255))
        draw_title_block(draw, 62, 78, spec.title, spec.domain, ink, secondary, 330)
    elif variant == 1:
        canvas = Image.new("RGB", size, (248, 250, 252))
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, 90, size[1]), fill=primary)
        hero = fit_contain(crop, (860, 520), (255, 255, 255))
        paste_with_shadow(canvas, hero, (350, 96), 34)
        draw_title_block(draw, 58, 86, spec.title, spec.domain, ink, secondary, 300)
    elif variant == 2:
        canvas = Image.new("RGB", size, (10, 15, 28))
        hero = fit_crop(crop, (760, 600))
        hero = ImageEnhanceSafe(hero, factor=0.90)
        paste_with_shadow(canvas, hero, (468, 60), 44)
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, 520, size[1]), fill=(10, 15, 28))
        draw_title_block(draw, 60, 92, spec.title, spec.domain, (241, 245, 249), secondary, 370)
        draw.line((60, 620, 330, 620), fill=secondary, width=8)
    elif variant == 3:
        canvas = Image.new("RGB", size, light)
        draw = ImageDraw.Draw(canvas)
        main = fit_crop(crop, (730, 520))
        detail = fit_crop(panel, (340, 230))
        paste_with_shadow(canvas, main, (70, 92), 30)
        paste_with_shadow(canvas, detail, (850, 352), 26)
        draw_title_block(draw, 850, 90, spec.title, spec.domain, ink, primary, 340)
    elif variant == 4:
        canvas = Image.new("RGB", size, (255, 255, 255))
        draw = ImageDraw.Draw(canvas)
        draw.rectangle((0, 0, size[0], 18), fill=primary)
        draw.rectangle((0, 18, size[0], 118), fill=(248, 250, 252))
        draw_title_block(draw, 54, 34, spec.title, spec.domain, ink, secondary, 1080, scale=1)
        hero = fit_contain(crop, (1080, 482), (255, 255, 255))
        canvas.paste(hero, (100, 180))
    else:
        blurred = fit_crop(panel, size).filter(ImageFilter.GaussianBlur(18))
        tint = Image.new("RGBA", size, primary + (104,))
        canvas = Image.alpha_composite(blurred.convert("RGBA"), tint).convert("RGB")
        hero = fit_contain(crop, (720, 450), (255, 255, 255))
        paste_with_shadow(canvas, hero, (500, 150), 36)
        draw = ImageDraw.Draw(canvas)
        draw_title_block(draw, 64, 104, spec.title, spec.domain, (255, 255, 255), secondary, 390)

    cover_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(cover_path, quality=94)


def ImageEnhanceSafe(image: Image.Image, factor: float) -> Image.Image:
    # Keep this tiny helper local to avoid an extra import solely for a mild dark-mode adjustment.
    return Image.blend(Image.new("RGB", image.size, (8, 13, 24)), image, factor)


def manifest(spec: CaseSpec) -> dict:
    steps = [
        f"Load bundled local tables for {spec.focus}.",
        "Inspect spatial samples, time series, ranked entities, and grid indicators.",
        "Normalize pressure, exposure, trend, and resilience indicators.",
        f"Compute a reproducible priority score for {spec.domain.lower()}.",
        "Render a domain-specific diagnostic panel and export ranked results.",
    ]
    return {
        "source": "opengeolab-heterogeneous-case",
        "sourceId": spec.slug,
        "title": spec.title,
        "summary": spec.summary,
        "description": f"A heterogeneous OpenGeoLab case for {spec.focus}; it uses bundled local data, a domain-specific priority model, and a result-derived visual cover.",
        "domain": spec.domain,
        "tags": list(spec.tags),
        "authors": ["OpenGeoLab Diverse Case Curation"],
        "authorLine": "OpenGeoLab Diverse Case Curation",
        "timeLabel": TIME_LABEL,
        "runtimeImageId": spec.runtime,
        "coreNotebook": "main.ipynb",
        "coverFileName": "cover.png",
        "datasets": [
            {
                "name": "Scenario observations",
                "path": "data/observations.csv",
                "type": "CSV",
                "description": "Spatial samples with pressure, exposure, resilience, trend, and priority indicators.",
            },
            {
                "name": "Scenario time series",
                "path": "data/timeseries.csv",
                "type": "CSV",
                "description": "Baseline, observed, and mitigation-scenario trajectories.",
            },
            {
                "name": "Ranked assets",
                "path": "data/entities.csv",
                "type": "CSV",
                "description": "Domain assets or zones used for intervention ranking.",
            },
        ],
        "steps": steps,
        "expectedResults": [
            "A result-derived cover image generated from the case analysis.",
            "A reproducible notebook that loads only bundled local data.",
            "Ranked priority outputs and a domain-specific diagnostic panel under outputs/.",
        ],
    }


def readme(spec: CaseSpec) -> str:
    return f"""# {spec.title}

{spec.summary}

## Purpose
This case covers **{spec.domain}** and focuses on {spec.focus}. It is part of a deliberately heterogeneous OpenGeoLab case library: each case uses its own topic, domain vocabulary, tags, and analysis view.

## Data
- `data/observations.csv` - spatial samples and normalized indicators.
- `data/timeseries.csv` - baseline, observed, and mitigation-scenario trajectories.
- `data/entities.csv` - assets or zones for intervention ranking.
- `data/grid.csv`, `data/nodes.csv`, `data/edges.csv` - supporting spatial fields and graph-like diagnostics.

## Workflow
1. Load the bundled local data.
2. Inspect the spatial and temporal evidence.
3. Compute a priority score from pressure, exposure, trend, and resilience.
4. Render the diagnostic panel for this case type.
5. Export ranked outputs for downstream review.

## Notes
The cover image is not a decorative placeholder. It is generated from the same intermediate analysis output that the notebook writes to `outputs/{spec.slug}_analysis_panel.png`.
"""


def notebook_for(spec: CaseSpec) -> nbf.NotebookNode:
    nb = nbf.v4.new_notebook()
    nb["metadata"] = {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "pygments_lexer": "ipython3"},
    }
    code = f"""from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

PROJECT = Path.cwd()
DATA = PROJECT / "data"
OUT = PROJECT / "outputs"
OUT.mkdir(exist_ok=True)

observations = pd.read_csv(DATA / "observations.csv")
timeseries = pd.read_csv(DATA / "timeseries.csv", parse_dates=["date"])
entities = pd.read_csv(DATA / "entities.csv")
grid = pd.read_csv(DATA / "grid.csv")
nodes = pd.read_csv(DATA / "nodes.csv")
edges = pd.read_csv(DATA / "edges.csv")

observations["computed_priority"] = (
    0.44 * observations["pressure"]
    + 0.36 * observations["exposure"]
    + 0.20 * observations["trend"]
    - 0.23 * observations["resilience"]
).clip(0, 1)

ranked = entities.sort_values("priority_score", ascending=False).head(12)
ranked.to_csv(OUT / "{spec.slug}_ranked_assets.csv", index=False)

fig, axes = plt.subplots(1, 2, figsize=(10, 5), constrained_layout=True)
fig.patch.set_facecolor("white")
fig.suptitle("{spec.title}", x=0.02, y=1.02, ha="left", fontsize=15, fontweight="bold")
visual = "{spec.visual}"
primary, secondary = "{spec.palette[0]}", "{spec.palette[1]}"

if visual == "raster":
    raster = grid.pivot(index="gy", columns="gx", values="priority_score").sort_index(ascending=False)
    im = axes[0].imshow(raster, cmap="viridis")
    fig.colorbar(im, ax=axes[0], fraction=0.046)
    axes[0].set_title("Priority surface")
    axes[0].set_xticks([])
    axes[0].set_yticks([])
    axes[1].scatter(observations["pressure"], observations["exposure"], c=observations["computed_priority"], cmap="magma", s=28)
    axes[1].set_title("Driver space")
elif visual == "timeseries":
    axes[0].plot(timeseries["date"], timeseries["baseline"], label="baseline", color="#64748b", linewidth=2)
    axes[0].plot(timeseries["date"], timeseries["observed"], label="observed", color=primary, linewidth=2)
    axes[0].plot(timeseries["date"], timeseries["mitigation_scenario"], label="scenario", color=secondary, linewidth=2)
    axes[0].legend(frameon=False)
    axes[0].set_title("Monthly trajectory")
    axes[1].bar(timeseries["date"], timeseries["observed"] - timeseries["baseline"], color=secondary, width=20)
    axes[1].axhline(0, color="#111827", linewidth=0.8)
    axes[1].set_title("Observed anomaly")
elif visual == "network":
    lookup = nodes.set_index("node_id")
    for edge in edges.itertuples(index=False):
        a, b = lookup.loc[edge.source], lookup.loc[edge.target]
        axes[0].plot([a.x, b.x], [a.y, b.y], color="#94a3b8", linewidth=0.7, alpha=0.6)
    axes[0].scatter(nodes["x"], nodes["y"], c=nodes["priority_score"], cmap="plasma", s=90, edgecolor="white", linewidth=0.6)
    axes[0].set_title("Network exposure")
    axes[1].barh(ranked["asset_id"], ranked["priority_score"], color=primary)
    axes[1].set_title("Priority assets")
elif visual == "matrix":
    matrix = observations.pivot_table(index="region", columns=pd.cut(observations["pressure"], 5), values="computed_priority", aggfunc="mean", observed=False)
    im = axes[0].imshow(matrix.fillna(0), cmap="coolwarm", vmin=0, vmax=1)
    fig.colorbar(im, ax=axes[0], fraction=0.046)
    axes[0].set_yticks(range(len(matrix.index)))
    axes[0].set_yticklabels(matrix.index)
    axes[0].set_xticks([])
    axes[0].set_title("Regional pressure matrix")
    axes[1].plot(ranked["vulnerability"], ranked["access_difficulty"], marker="o", color=secondary)
    axes[1].set_title("Asset trade-off curve")
elif visual == "scatter":
    axes[0].scatter(observations["pressure"], observations["computed_priority"], c=observations["trend"], cmap="cividis", s=36)
    coef = np.polyfit(observations["pressure"], observations["computed_priority"], 1)
    xs = np.linspace(observations["pressure"].min(), observations["pressure"].max(), 50)
    axes[0].plot(xs, coef[0] * xs + coef[1], color=primary, linewidth=2)
    axes[0].set_title("Pressure-risk relationship")
    axes[1].hist(observations["computed_priority"], bins=18, color=secondary)
    axes[1].set_title("Priority distribution")
elif visual == "profile":
    profile = grid.groupby("gx")[["priority_score", "constraint"]].mean().reset_index()
    axes[0].fill_between(profile["gx"], profile["priority_score"], color=primary, alpha=0.32)
    axes[0].plot(profile["gx"], profile["priority_score"], color=primary, linewidth=2)
    axes[0].plot(profile["gx"], profile["constraint"], color=secondary, linewidth=2)
    axes[0].set_title("Longitudinal profile")
    axes[1].bar(ranked["asset_id"], ranked["priority_score"], color=primary)
    axes[1].tick_params(axis="x", rotation=45)
    axes[1].set_title("Inspection targets")
else:
    axes[0].barh(ranked["asset_id"], ranked["priority_score"], color=primary)
    axes[0].set_title("Ranked intervention queue")
    axes[1].scatter(observations["x"], observations["y"], s=28 + 80 * observations["computed_priority"], c=observations["computed_priority"], cmap="viridis")
    axes[1].set_title("Spatial sample field")

for ax in axes:
    ax.grid(alpha=0.15)

fig.savefig(OUT / "{spec.slug}_analysis_panel.png", dpi=170, bbox_inches="tight")
print("Saved", OUT / "{spec.slug}_analysis_panel.png")
print("Top ranked assets")
display(ranked)
"""
    nb["cells"] = [
        nbf.v4.new_markdown_cell(f"# {spec.title}\n\n{spec.summary}\n\nThis notebook is a local reproducible workflow for **{spec.focus}**."),
        nbf.v4.new_code_cell(code),
        nbf.v4.new_markdown_cell("## Interpretation\n\nUse the exported ranking and diagnostic panel to compare pressure, exposure, trend, and resilience signals for this case."),
    ]
    return nb


def write_case(spec: CaseSpec) -> None:
    case_dir = reset_case(spec.slug)
    project_dir = case_dir / "project"
    data_dir = project_dir / "data"
    outputs_dir = project_dir / "outputs"
    tables = make_common_tables(spec, data_dir)
    result_path = outputs_dir / f"{spec.slug}_analysis_panel.png"
    render_result(spec, tables, result_path)
    render_cover_from_result(spec, result_path, case_dir / "cover.png")
    write_json(case_dir / "case.json", manifest(spec))
    write_text(project_dir / "README.md", readme(spec))
    nbf.write(notebook_for(spec), project_dir / "main.ipynb")


def main() -> None:
    existing = {path.parent.name for path in ROOT.glob("*/case.json")}
    duplicates = sorted(existing.intersection({spec.slug for spec in CASE_SPECS}))
    if duplicates:
        print(f"Regenerating existing heterogeneous cases: {', '.join(duplicates)}")
    for spec in CASE_SPECS:
        write_case(spec)
    print(f"Generated {len(CASE_SPECS)} heterogeneous case seeds under {ROOT}")


if __name__ == "__main__":
    main()
