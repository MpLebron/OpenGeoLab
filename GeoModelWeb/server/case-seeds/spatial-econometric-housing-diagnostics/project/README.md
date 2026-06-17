# Spatial Econometric Housing Diagnostics

A spatial econometrics notebook with weights, diagnostics, and competing spatial model specifications.

## Data
- `data/` - Bundled local inputs. The notebook does not download external data.
- `outputs/` - Created when the notebook is executed.

## Workflow
1. Load a polygon housing market dataset and inspect variable distributions.
2. Construct queen-contiguity spatial weights and inspect neighbor structure.
3. Run exploratory maps and correlation checks for price drivers.
4. Compute global Moran statistics for price and OLS residuals.
5. Fit a baseline OLS model and inspect residual spatial clustering.
6. Fit spatial lag and spatial error models using PySAL spreg.
7. Compare model diagnostics and coefficient interpretation.
8. Map local Moran clusters and residual outliers for planning review.
9. Export diagnostics, model comparison tables, and hotspot maps.

## Reference Workflows
- PySAL spatial autocorrelation notebook: https://pysal.org/notebooks/explore/esda/Spatial_Autocorrelation_for_Areal_Unit_Data.html
- PySAL spatial model specifications: https://pysal.org/spreg/notebooks/7_spatial_models.html
- GeoPandas examples gallery: https://geopandas.org/en/stable/gallery/index.html

## Source Notes
This case is a local, reproducible OpenGeoLab adaptation of mature public geospatial workflows. It does not copy third-party notebooks or require remote data at runtime.
