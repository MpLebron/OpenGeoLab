FROM opengms/geomodel-core:2026.05

USER root

RUN mamba install -y -c conda-forge \
    rioxarray \
    ipyleaflet \
    folium \
    pydeck \
    holoviews \
    panel \
    plotly \
    && mamba clean --all -f -y \
    && pip install --no-cache-dir \
      lonboard \
      leafmap \
      geemap \
    && fix-permissions "${CONDA_DIR}" \
    && fix-permissions "/home/${NB_USER}"

USER ${NB_UID}

WORKDIR /home/jovyan/work
