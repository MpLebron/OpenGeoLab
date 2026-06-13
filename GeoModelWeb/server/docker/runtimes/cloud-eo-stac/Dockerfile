FROM opengms/geomodel-core:2026.05

USER root

RUN mamba install -y -c conda-forge \
    pystac-client \
    planetary-computer \
    stackstac \
    odc-stac \
    rio-tiler \
    xarray-spatial \
    fsspec \
    s3fs \
    adlfs \
    && mamba clean --all -f -y \
    && pip install --no-cache-dir \
      leafmap \
      geemap \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

USER ${NB_UID}

WORKDIR /home/jovyan/work
