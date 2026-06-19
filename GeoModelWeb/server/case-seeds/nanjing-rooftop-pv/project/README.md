# Nanjing Rooftop Photovoltaic Potential Assessment

This OpenGeoLab case reproduces the PyGeoModel-Case notebook workflow for assessing rooftop photovoltaic potential in Xuanwu District, Nanjing.

Open `main.ipynb` and run the cells in order. The notebook is written as a small research experiment: inspect the rooftop inventory, verify the PyGeoModel model metadata, submit a fresh OpenGMS rooftop PV task, download the task output, and analyze the returned shapefile.

The main workflow intentionally does not read a bundled result shapefile. If the live task returns no downloadable output, the notebook stops instead of substituting an archived result.

## Data

- `data/xuanwu/xuanwu.shp`: rooftop vector data for Xuanwu District.
- `data/xuanwu_rooftop.zip`: zipped rooftop input used by the PyGeoModel model call.
- `outputs/live-rooftop-pv/<run-id>/downloads/`: files downloaded from the current OpenGMS task.
- `outputs/live-rooftop-pv/<run-id>/analysis_summary.json`: summary derived from the live model result.

The runtime must be able to invoke OpenGMS model services. On OpenGeoLab this is normally handled by the Jupyter runtime environment through `OGMS_TOKEN`.
