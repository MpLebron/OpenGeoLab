# Suzhou Urban Expansion Simulation with UrbanM2M

This OpenGeoLab case reproduces a Suzhou urban expansion experiment using the OpenGMS UrbanM2M model.

Open `main.ipynb` and run the cells in order. The notebook follows a normal modeling workflow: load the study area, inspect historical urban land rasters, prepare UrbanM2M parameters, keep the model invocation visible, and analyze the included 2013 simulation result.

## Data

- `data/Suzhou.zip`: packaged UrbanM2M model input.
- `data/Suzhou-Masked/range.tif`: research range raster.
- `data/Suzhou-Masked/restriction.tif`: restriction raster.
- `data/Suzhou-Masked/year/land_2010.tif`: observed urban land in 2010.
- `data/Suzhou-Masked/year/land_2013.tif`: observed urban land in 2013.
- `data/Suzhou-Masked/vars0/`: spatial driving variables for slope, town distance, and county distance.
- `data/Result/sim_2013.tif`: cached simulated urban land result.
- `data/Result/prob_2013.tif`: cached transition probability result.
- `data/Result/sim_dir.zip` and `data/Result/prob_dir.zip`: archived OpenGMS result packages.

The notebook uses the cached result for reproducible analysis. The PyGeoModel invocation cell is retained for runtimes configured to submit live OpenGMS model tasks.
