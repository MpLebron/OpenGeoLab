# Suzhou Urban Expansion Simulation with UrbanM2M

This OpenGeoLab case reproduces a Suzhou urban expansion experiment using the OpenGMS UrbanM2M model.

Open `main.ipynb` and run the cells in order. The notebook is written as a small validation experiment: inspect the study area and observed 2010-2013 urban change, prepare UrbanM2M parameters, submit a fresh OpenGMS task, download the returned simulation and probability rasters, and validate those live outputs against observed 2013 urban land.

The main workflow intentionally does not read bundled simulation rasters. If the live task returns no downloadable output, the notebook stops instead of substituting an archived result.

## Data

- `data/Suzhou.zip`: packaged UrbanM2M model input.
- `data/Suzhou-Masked/range.tif`: research range raster.
- `data/Suzhou-Masked/restriction.tif`: restriction raster.
- `data/Suzhou-Masked/year/land_2010.tif`: observed urban land in 2010.
- `data/Suzhou-Masked/year/land_2013.tif`: observed urban land in 2013.
- `data/Suzhou-Masked/vars0/`: spatial driving variables for slope, town distance, and county distance.
- `outputs/live-urban-m2m/<run-id>/downloads/`: files downloaded from the current OpenGMS UrbanM2M task.
- `outputs/live-urban-m2m/<run-id>/validation_summary.json`: validation metrics derived from the live model output.

The runtime must be able to invoke OpenGMS model services. On OpenGeoLab this is normally handled by the Jupyter runtime environment through `OGMS_TOKEN`.
