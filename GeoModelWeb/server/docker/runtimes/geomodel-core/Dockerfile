FROM quay.io/jupyter/scipy-notebook:latest

USER root

ENV OPENGEOLAB_API=http://host.docker.internal:3000/api

RUN mamba install -y -c conda-forge \
    geopandas \
    rasterio \
    rioxarray \
    pyogrio \
    netcdf4 \
    h5py \
    zarr \
    dask \
    distributed \
    fsspec \
    s3fs \
    cartopy \
    pyarrow \
    plotly \
    && mamba clean --all -f -y \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

COPY jupyterlab_geomodel-0.1.0-py3-none-any.whl /tmp/
COPY pygeomodel-1.0.15-py3-none-any.whl /tmp/

RUN pip install --no-cache-dir \
      /tmp/jupyterlab_geomodel-0.1.0-py3-none-any.whl \
      /tmp/pygeomodel-1.0.15-py3-none-any.whl \
    && rm -f /tmp/*.whl \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

USER ${NB_UID}

WORKDIR /home/jovyan/work
