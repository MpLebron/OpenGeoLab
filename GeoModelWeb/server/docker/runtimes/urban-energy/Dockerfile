FROM opengms/geomodel-core:2026.05

USER root

RUN mamba install -y -c conda-forge \
    pypsa \
    pvlib-python \
    linopy \
    highspy \
    && pip install --no-cache-dir "pandapower>=3.1" \
    && mamba clean --all -f -y \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

USER ${NB_UID}

WORKDIR /home/jovyan/work
