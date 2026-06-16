FROM opengms/geomodel-core:2026.05

USER root

RUN mamba install -y -c conda-forge \
    pdal \
    python-pdal \
    laspy \
    pyvista \
    trimesh \
    && pip install --no-cache-dir lazrs \
    && mamba clean --all -f -y \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

ENV PROJ_DATA=/opt/conda/share/proj \
    PROJ_LIB=/opt/conda/share/proj

USER ${NB_UID}

WORKDIR /home/jovyan/work
