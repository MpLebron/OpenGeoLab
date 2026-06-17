# Climate Extreme Risk Atlas

A multi-stage climate-risk analysis workflow using local NetCDF data.

## Data
- `data/` - Bundled local inputs. The notebook does not download external data.
- `outputs/` - Created when the notebook is executed.

## Workflow
1. Load a multi-year gridded climate panel and inspect variables, dimensions, and missingness.
2. Map urban fraction, elevation, and annual heat exposure to understand the analysis domain.
3. Compute seasonal climatology and daily percentile thresholds for heatwave detection.
4. Estimate annual heatwave days and extreme precipitation days for every grid cell.
5. Compare urban and rural time series to quantify the urban heat island signal.
6. Fit per-cell linear trends for heat and precipitation extremes.
7. Run an EOF/PCA decomposition to summarize dominant space-time risk patterns.
8. Build a population-weighted compound risk index and rank hotspot cells.
9. Write maps, tables, and a machine-readable risk atlas under outputs/.

## Reference Workflows
- Project Pythia Cookbook Gallery: https://cookbooks.projectpythia.org/
- CMIP6 Cookbook: https://projectpythia.org/cmip6-cookbook/
- Xarray documentation: https://docs.xarray.dev/

## Source Notes
This case is a local, reproducible OpenGeoLab adaptation of mature public geospatial workflows. It does not copy third-party notebooks or require remote data at runtime.
