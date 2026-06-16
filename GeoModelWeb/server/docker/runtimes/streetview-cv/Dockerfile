FROM opengms/geomodel-core:2026.05

USER root

RUN mamba install -y -c conda-forge \
    opencv \
    scikit-image \
    pillow \
    imageio \
    pytorch-cpu \
    torchvision \
    transformers \
    && mamba clean --all -f -y \
    && pip install --no-cache-dir \
      timm \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

USER ${NB_UID}

WORKDIR /home/jovyan/work
