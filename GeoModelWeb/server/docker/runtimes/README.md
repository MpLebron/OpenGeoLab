# OpenGMS Jupyter Runtime Images

These Dockerfiles define the real runtime images shown in the OpenGMS Jupyter
Environments tab. They are intentionally based on established notebook image
families so every project can still be launched with the standard
`start-notebook.sh` entrypoint used by the backend.

Build one image:

```bash
cd GeoModelWeb/server
node scripts/buildJupyterRuntimeImages.js geomodel-jupyter
```

Build all predefined images:

```bash
cd GeoModelWeb/server
node scripts/buildJupyterRuntimeImages.js --all
```

The catalog itself lives in `server/utils/jupyterRuntime.js`; image IDs stored
in `.project.json` must match that catalog.
