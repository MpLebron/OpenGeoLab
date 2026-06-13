FROM opengms/geomodel-core:2026.05

USER root

RUN mamba install -y -c conda-forge \
    pytorch-cpu \
    torchgeo \
    albumentations \
    && mamba clean --all -f -y \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

USER ${NB_UID}

WORKDIR /home/jovyan/work
