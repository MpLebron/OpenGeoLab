# Nanjing Rooftop Photovoltaic Potential Assessment

This OpenGeoLab case reproduces the PyGeoModel-Case notebook workflow for assessing rooftop photovoltaic potential in Xuanwu District, Nanjing.

Open `main.ipynb` and run the cells in order. The notebook follows a normal modeling workflow: load rooftop vector data, inspect the study area, ask PyGeoModel for a model recommendation, run the rooftop PV model, and analyze the included model result shapefile.

## Data

- `data/xuanwu/xuanwu.shp`: rooftop vector data for Xuanwu District.
- `data/xuanwu_rooftop.zip`: zipped rooftop input used by the PyGeoModel model call.
- `data/result/roof_results_with_power_generation.shp`: model result used for visualization and summary analysis.
- `data/SolarCalculation-roofSloar.zip`: archived model output package from the original case.
