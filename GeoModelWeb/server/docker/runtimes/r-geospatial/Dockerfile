FROM opengms/geomodel-core:2026.05

USER root

RUN mamba install -y -c conda-forge \
    rioxarray \
    r-base \
    r-irkernel \
    r-sf \
    r-terra \
    r-stars \
    r-lubridate \
    r-codetools \
    && mamba clean --all -f -y \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

USER ${NB_UID}

WORKDIR /home/jovyan/work
