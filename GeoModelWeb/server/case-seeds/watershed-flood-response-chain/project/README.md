# Watershed Flood Response Chain

A multi-stage terrain and flood-response notebook with a local DEM and design storm.

## Data
- `data/` - Bundled local inputs. The notebook does not download external data.
- `outputs/` - Created when the notebook is executed.

## Workflow
1. Load a DEM, storm hyetograph, and outlet table from local files.
2. Derive slope, aspect, and shaded relief to inspect terrain controls.
3. Run a D8-style flow-routing chain to compute flow direction and accumulation.
4. Extract a stream network and distance-to-stream surface.
5. Delineate an outlet-contributing area using reverse flow traversal.
6. Compute topographic wetness and flood susceptibility indices.
7. Combine terrain susceptibility with curve-number runoff from a design storm.
8. Compare baseline and restoration scenarios for peak runoff response.
9. Export risk maps, stream rasters, hydrographs, and tabular indicators.

## Reference Workflows
- WhiteboxTools Python frontend: https://github.com/opengeos/whitebox-python
- Whitebox watershed/LiDAR overview: https://geog-312.gishub.org/book/geospatial/whitebox.html
- Pysheds project: https://github.com/mdbartos/pysheds

## Source Notes
This case is a local, reproducible OpenGeoLab adaptation of mature public geospatial workflows. It does not copy third-party notebooks or require remote data at runtime.
