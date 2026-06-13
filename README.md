# OpenGeoLab

OpenGeoLab is a JupyterLab-based computational workspace for open geographic
modeling and simulation with web-accessible resource services.

This repository accompanies the manuscript:

> OpenGeoLab: A JupyterLab-Based Computational Workspace for Open Geographic
> Modeling and Simulation

OpenGeoLab connects an OpenGMS-style resource service catalog, project data,
generated Python service calls, container-supported JupyterLab sessions, and
notebook-side result analysis in one research workspace. The prototype includes
a web portal, a Node.js service layer, a JupyterLab extension, Docker runtime
definitions, and the two case-study notebooks described in the manuscript.

## Repository Contents

```text
OpenGeoLab/
├── GeoModelWeb/
│   ├── client/              # Vue 3 + Vite web portal
│   ├── server/              # Express service layer, case seeding, Jupyter runtime control
│   ├── docs/                # deployment and environment notes
│   └── scripts/             # helper scripts for runtime images and host configuration
├── jupyterlab-geomodel/     # JupyterLab extension for resource browsing and code insertion
├── docs/
│   └── REPRODUCIBILITY.md   # code, data, and reproducibility notes for review
├── LICENSE
├── CITATION.cff
└── README.md
```

## Main Components

- **Web portal**: prepares projects, runtime environments, case-library access,
  data assets, and JupyterLab launch flows.
- **Server layer**: exposes OpenGeoLab APIs, project/case management, OpenGMS
  model and data-method access, and Docker-backed JupyterLab sessions.
- **JupyterLab extension**: adds an OpenGeoLab resource panel for browsing
  model/data-method services, configuring tasks, previewing generated calls,
  and inserting executable Python code into notebooks.
- **Runtime images**: Dockerfiles define JupyterLab environments with the
  OpenGeoLab extension and geospatial Python tooling.
- **Case studies**: notebook projects for Suzhou urban expansion simulation and
  Nanjing rooftop photovoltaic potential assessment.

## Requirements

Recommended development environment:

- Node.js 20 or later
- npm 10 or later
- Python 3.10 or later
- JupyterLab 4.x
- Docker Desktop or Docker Engine
- MongoDB 6 or later, or another MongoDB-compatible endpoint

The case-study notebooks additionally use geospatial Python packages such as
`geopandas`, `rasterio`, `matplotlib`, `folium`, and `pygeomodel` in the
selected Jupyter runtime.

## Configuration

The repository includes example environment files:

- `GeoModelWeb/client/.env.example`
- `GeoModelWeb/server/.env.example`

Copy them to `.env` files before running local services. Do not commit local
`.env` files.

Important variables:

| Variable | Purpose |
| --- | --- |
| `HOST_IP` / `VITE_HOST_IP` | Hostname or IP used by the portal, server, and JupyterLab launch URLs. |
| `MONGODB_URI` / `MONGODB_DB_NAME` | MongoDB connection for user, project, and model metadata. |
| `JWT_SECRET` | Secret used for local JWT authentication. |
| `OGMS_TOKEN` | Token for OpenGMS data-method/model-service requests. |
| `OGMS_DEPLOYED_MODEL_QUERY_TOKEN` | Optional query token for deployed OpenGMS model metadata. |
| `USER_DATA_DIR` | Persistent workspace directory mounted into JupyterLab containers. |
| `VITE_API_BASE_URL` | Client-side API base URL. |

Live OpenGMS service invocation requires valid service credentials and network
access to the corresponding OpenGMS endpoints. The notebooks also contain cached
or bundled example outputs so that the analysis workflow can be inspected
without re-running every remote service.

## Installation

Install the web portal client:

```bash
cd GeoModelWeb/client
npm install
npm run build
```

Install the server:

```bash
cd GeoModelWeb/server
npm install
cp .env.example .env
npm start
```

Install the JupyterLab extension for development:

```bash
cd jupyterlab-geomodel
npm install
pip install -e .
jupyter labextension develop . --overwrite
npm run build
```

## Local Development

Run the server:

```bash
cd GeoModelWeb/server
npm start
```

Run the web portal in development mode:

```bash
cd GeoModelWeb/client
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Runtime Images

OpenGeoLab starts JupyterLab sessions from Docker images. The default image is
configured in `GeoModelWeb/server/utils/jupyterRuntime.js`, and runtime
Dockerfiles are stored under:

```text
GeoModelWeb/server/docker/
GeoModelWeb/server/docker/runtimes/
```

Build the default runtime:

```bash
cd GeoModelWeb/server
npm run build:runtime
```

Build all configured runtimes:

```bash
npm run build:runtimes
```

## Case Studies

The manuscript uses two demonstration projects:

1. `GeoModelWeb/server/case-seeds/urban-m2m-suzhou-expansion/project/main.ipynb`
2. `GeoModelWeb/server/case-seeds/nanjing-rooftop-pv/project/main.ipynb`

Seed the local case library:

```bash
cd GeoModelWeb/server
npm run seed:cases
```

The notebooks can also be opened directly in a JupyterLab environment with the
required geospatial Python packages installed.

## Reproducibility

See [docs/REPRODUCIBILITY.md](docs/REPRODUCIBILITY.md) for:

- the Computers & Geosciences code-availability checklist,
- included code and data artifacts,
- known service/data limitations,
- suggested smoke-test commands, and
- how the two manuscript case studies map to repository files.

## Tests

The repository includes focused Node.js unit tests for display logic, data
binding, runtime helpers, and local case seeding.

Run client tests individually, for example:

```bash
cd GeoModelWeb/client
node --test tests/*.test.mjs
```

Run server tests individually, for example:

```bash
cd GeoModelWeb/server
node --test tests/*.test.mjs
```

Some server tests require local fixture data, Docker, MongoDB, or OpenGMS network
access. If those services are unavailable, use the tests that target pure helper
modules and documented case-seed structure.

## License

This repository is released under the MIT License. See [LICENSE](LICENSE).

## Citation

If you use OpenGeoLab in academic work, please cite the manuscript listed in
[CITATION.cff](CITATION.cff). A DOI can be added after publication or archival
release.
