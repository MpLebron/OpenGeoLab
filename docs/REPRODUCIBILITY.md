# Reproducibility and Code Availability

This document describes the public artifacts made available for review of the
OpenGeoLab manuscript submitted to *Computers & Geosciences*.

## Journal-Oriented Checklist

- Public repository: this GitHub repository.
- License: MIT License in `LICENSE`.
- English README: `README.md`.
- Installation and usage instructions: `README.md`.
- Dependencies and runtime requirements: `README.md`, package manifests, and
  Dockerfiles.
- Source code: `GeoModelWeb/` and `jupyterlab-geomodel/`.
- Case-study material: `GeoModelWeb/server/case-seeds/`.
- Tutorials / typical use cases: the two case-study notebooks and their local
  project READMEs.
- User guide for inputs, outputs, and expected behavior: `README.md`, case
  READMEs, and notebook markdown cells.

## Manuscript Case Mapping

| Manuscript case | Repository path | Main purpose |
| --- | --- | --- |
| UrbanM2M-based urban expansion simulation in Suzhou | `GeoModelWeb/server/case-seeds/urban-m2m-suzhou-expansion/project/main.ipynb` | Demonstrates raster-based service invocation, cached result loading, and notebook-side map analysis. |
| Rooftop photovoltaic potential assessment in Nanjing | `GeoModelWeb/server/case-seeds/nanjing-rooftop-pv/project/main.ipynb` | Demonstrates vector data preparation, model invocation structure, and building-level result analysis. |

## Data and Service Availability

The repository includes the source code, notebooks, and bundled case-study files
needed to inspect the OpenGeoLab workflow. Live model and data-method execution
depends on web-accessible OpenGMS services and valid service credentials.

The public repository does not include private `.env` files, personal runtime
workspaces, uploaded user data, MongoDB runtime databases, or local JupyterLab
container state. These files are intentionally excluded for privacy, security,
and reproducibility hygiene.

Large geospatial data files included in the case-study folders are provided as
ordinary repository files because each file is below GitHub's hard file-size
limit. For long-term archival reproducibility, these files should also be
released in a DOI-backed data repository, such as Zenodo or an institutional
data repository, before final publication.

## Suggested Verification Commands

Build the web client:

```bash
cd GeoModelWeb/client
npm install
npm run build
```

Run client helper tests:

```bash
cd GeoModelWeb/client
node --test tests/*.test.mjs
```

Run server helper tests:

```bash
cd GeoModelWeb/server
npm install
node --test tests/*.test.mjs
```

Build the JupyterLab extension:

```bash
cd jupyterlab-geomodel
npm install
pip install -e .
npm run build
```

## Known Limitations

- Live OpenGMS service execution requires valid OpenGMS credentials and network
  access to the service endpoints configured in the `.env` file.
- Docker runtime tests require Docker to be installed and running.
- Some full-stack routes require MongoDB and a local workspace directory.
- The repository contains a research prototype. Production deployments should
  harden authentication, credential management, HTTPS, and per-user storage
  isolation before public operation.
