const path = require('path');

const RUNTIME_CATALOG_VERSION = '2026.05';

const JUPYTER_IMAGES = {
    'geomodel-jupyter': {
        name: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        label: 'GeoModel Core',
        title: 'GeoModel Core',
        description: 'Default CPU runtime for OpenGMS notebooks, geospatial IO, raster/vector analysis, and PyGeoModel SDK workflows.',
        source: 'official',
        category: 'core',
        python: '3.13',
        tags: ['Official', 'CPU', 'Core'],
        stack: 'Python 3.13 · JupyterLab 4 · GDAL · GeoPandas · Xarray · PyGeoModel SDK',
        accelerator: 'CPU',
        estimatedSize: '4-6 GB',
        features: ['JupyterLab', 'numpy', 'scipy', 'geopandas', 'rasterio', 'xarray', 'PyGeoModel SDK'],
        baseImage: 'quay.io/jupyter/scipy-notebook:latest',
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/geomodel-core/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-core`,
            overview: 'A balanced default image for scientific geospatial notebooks. It keeps the Jupyter Docker Stacks user model, adds OpenGMS/GeoModel wheels, and includes the Python packages most notebooks need for vector, raster, and multidimensional data analysis.',
            runtimeStack: [
                { label: 'Base', value: 'Jupyter scipy-notebook' },
                { label: 'Python', value: '3.13' },
                { label: 'Kernel', value: 'JupyterLab 4' },
                { label: 'Compute', value: 'CPU' }
            ],
            libraries: [
                ['pygeomodel', 'local'],
                ['jupyterlab-geomodel', 'local'],
                ['geopandas', 'latest'],
                ['rasterio', 'latest'],
                ['rioxarray', 'latest'],
                ['xarray', 'latest'],
                ['dask', 'latest'],
                ['netcdf4', 'latest'],
                ['h5py', 'latest'],
                ['pyogrio', 'latest'],
                ['shapely', 'latest'],
                ['pyproj', 'latest'],
                ['matplotlib', 'latest'],
                ['plotly', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Runtime Team'
        },
        default: true
    },
    'opengms-pangeo-earth': {
        name: `opengms/pangeo-earth:${RUNTIME_CATALOG_VERSION}`,
        label: 'Pangeo Earth System',
        title: 'Pangeo Earth System',
        description: 'Distributed Earth-system analysis image for xarray, Dask, Zarr, NetCDF, and cloud object-store workflows.',
        source: 'official',
        category: 'earth-system',
        python: '3.13',
        tags: ['Official', 'CPU', 'Pangeo'],
        stack: 'GeoModel Core · Xarray · Dask · Zarr · NetCDF',
        accelerator: 'CPU',
        estimatedSize: '5-8 GB',
        features: ['pangeo', 'xarray', 'dask', 'zarr', 'netcdf4', 'intake', 'cartopy'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/pangeo-earth/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-pangeo`,
            overview: 'A Pangeo-style notebook runtime for climate, hydrology, oceanography, and gridded Earth-system data. It is designed for workflows that read NetCDF/Zarr collections and scale analysis with Dask.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Python', value: '3.13' },
                { label: 'Distributed', value: 'Dask' },
                { label: 'Formats', value: 'Zarr / NetCDF' }
            ],
            libraries: [
                ['xarray', 'latest'],
                ['dask', 'latest'],
                ['distributed', 'latest'],
                ['zarr', 'latest'],
                ['netcdf4', 'latest'],
                ['h5netcdf', 'latest'],
                ['intake', 'latest'],
                ['intake-xarray', 'latest'],
                ['fsspec', 'latest'],
                ['s3fs', 'latest'],
                ['cartopy', 'latest'],
                ['hvplot', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '8+ vCPU recommended' },
                { label: 'Memory', value: '16+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Earth System Runtime'
        },
        default: false
    },
    'opengms-cloud-eo': {
        name: `opengms/cloud-eo-stac:${RUNTIME_CATALOG_VERSION}`,
        label: 'Cloud EO / STAC',
        title: 'Cloud EO / STAC',
        description: 'Cloud-native Earth-observation runtime for STAC search, lazy raster loading, and analysis-ready imagery.',
        source: 'official',
        category: 'earth-observation',
        python: '3.13',
        tags: ['Official', 'CPU', 'STAC'],
        stack: 'STAC · Stackstac · ODC-STAC · Rasterio · Rioxarray',
        accelerator: 'CPU',
        estimatedSize: '5-8 GB',
        features: ['pystac-client', 'stackstac', 'odc-stac', 'planetary-computer', 'rasterio', 'rioxarray'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/cloud-eo-stac/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-stac`,
            overview: 'A runtime for cloud-hosted imagery and catalog-driven EO workflows. It focuses on STAC discovery, lazy raster loading, object-store IO, and notebook analysis for Sentinel/Landsat-style datasets.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Catalog', value: 'STAC' },
                { label: 'Raster', value: 'Rasterio / Rioxarray' },
                { label: 'Cloud IO', value: 'S3 / Azure' }
            ],
            libraries: [
                ['pystac-client', 'latest'],
                ['stackstac', 'latest'],
                ['odc-stac', 'latest'],
                ['planetary-computer', 'latest'],
                ['rasterio', 'latest'],
                ['rioxarray', 'latest'],
                ['xarray-spatial', 'latest'],
                ['s3fs', 'latest'],
                ['adlfs', 'latest'],
                ['leafmap', 'latest'],
                ['geemap', 'latest'],
                ['rio-tiler', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '8+ vCPU recommended' },
                { label: 'Memory', value: '16+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS EO Runtime'
        },
        default: false
    },
    'opengms-geoai-pytorch': {
        name: `opengms/geoai-pytorch:${RUNTIME_CATALOG_VERSION}`,
        label: 'GeoAI PyTorch',
        title: 'GeoAI PyTorch',
        description: 'CPU-first GeoAI runtime for remote-sensing deep learning, TorchGeo datasets, segmentation, and model inference.',
        source: 'official',
        category: 'geoai',
        python: '3.13',
        tags: ['Official', 'CPU', 'GeoAI'],
        stack: 'PyTorch · TorchGeo · Rasterio · Albumentations · TimM',
        accelerator: 'CPU',
        estimatedSize: '7-9 GB',
        features: ['pytorch', 'torchgeo', 'timm', 'segmentation-models-pytorch', 'albumentations', 'rasterio'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/geoai-pytorch/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-geoai`,
            overview: 'A CPU-first deep-learning notebook image for GeoAI experiments. It preserves the OpenGMS Jupyter launch contract while adding geospatial IO and common remote-sensing model libraries from conda-forge.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Python', value: '3.13' },
                { label: 'ML', value: 'PyTorch CPU / TorchGeo' },
                { label: 'Accelerator', value: 'CPU' }
            ],
            libraries: [
                ['torch', '2.10 CPU'],
                ['torchvision', '0.26 CPU'],
                ['torchgeo', '0.5.x'],
                ['timm', 'latest'],
                ['segmentation-models-pytorch', 'latest'],
                ['albumentations', '1.4.x'],
                ['scikit-learn', 'latest'],
                ['rasterio', 'latest'],
                ['rioxarray', 'latest'],
                ['geopandas', 'latest'],
                ['opencv-python-headless', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '8+ vCPU recommended' },
                { label: 'Memory', value: '16+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS GeoAI Runtime'
        },
        default: false
    },
    'opengms-geoviz': {
        name: `opengms/geoviz-notebook:${RUNTIME_CATALOG_VERSION}`,
        label: 'Interactive GeoViz',
        title: 'Interactive GeoViz',
        description: 'Notebook runtime for maps, vector tiles, dashboards, and interactive scientific visualization.',
        source: 'official',
        category: 'visualization',
        python: '3.13',
        tags: ['Official', 'CPU', 'Visualization'],
        stack: 'JupyterLab · ipyleaflet · Leafmap · Lonboard · HoloViews',
        accelerator: 'CPU',
        estimatedSize: '4-7 GB',
        features: ['ipyleaflet', 'leafmap', 'geemap', 'lonboard', 'pydeck', 'holoviews', 'panel'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/geoviz-notebook/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-geoviz`,
            overview: 'A visualization-focused runtime for exploratory geospatial notebooks, browser-native maps, vector tiles, and dashboard prototypes.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Maps', value: 'ipyleaflet / Leafmap' },
                { label: 'Tiles', value: 'Lonboard / PyDeck' },
                { label: 'Apps', value: 'Panel / HoloViews' }
            ],
            libraries: [
                ['ipyleaflet', 'latest'],
                ['leafmap', 'latest'],
                ['geemap', 'latest'],
                ['lonboard', 'latest'],
                ['pydeck', 'latest'],
                ['folium', 'latest'],
                ['holoviews', 'latest'],
                ['panel', 'latest'],
                ['plotly', 'latest'],
                ['geopandas', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Visualization Runtime'
        },
        default: false
    },
    'opengms-r-geospatial': {
        name: `opengms/r-geospatial:${RUNTIME_CATALOG_VERSION}`,
        label: 'R Geospatial',
        title: 'R Geospatial',
        description: 'Jupyter-compatible R/Python environment for spatial statistics, sf/terra workflows, and reproducible notebooks.',
        source: 'official',
        category: 'r-spatial',
        python: '3.13',
        tags: ['Official', 'CPU', 'R'],
        stack: 'GeoModel Core · R · IRkernel · sf · terra · stars',
        accelerator: 'CPU',
        estimatedSize: '5-9 GB',
        features: ['R', 'IRkernel', 'sf', 'terra', 'stars', 'lubridate', 'codetools', 'geopandas'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/r-geospatial/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-rgeo`,
            overview: 'A Jupyter-compatible R spatial runtime. It is for users who need sf, terra, stars, IRkernel, and Python geospatial libraries inside the same project workspace.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Language', value: 'Python / R' },
                { label: 'R Kernel', value: 'IRkernel' },
                { label: 'Compute', value: 'CPU' }
            ],
            libraries: [
                ['sf', 'latest'],
                ['terra', 'latest'],
                ['stars', 'latest'],
                ['lubridate', 'latest'],
                ['codetools', 'latest'],
                ['IRkernel', 'latest'],
                ['geopandas', 'latest'],
                ['rasterio', 'latest'],
                ['xarray', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS R Spatial Runtime'
        },
        default: false
    }
};

const DEFAULT_IMAGE = 'geomodel-jupyter';

function normalizeRuntimeImageId(value) {
    return String(value || '').trim();
}

function cloneRuntimeValue(value) {
    return JSON.parse(JSON.stringify(value));
}

function getRuntimeCatalog(catalog = JUPYTER_IMAGES) {
    return Object.entries(catalog).map(([id, config]) => ({
        id,
        ...cloneRuntimeValue(config),
        imageName: config.name,
        displayName: config.title || config.label || id,
        buildable: Boolean(config.build?.dockerfile)
    }));
}

function getRuntimeBuildSpec(imageId, options = {}) {
    const normalizedImageId = normalizeRuntimeImageId(imageId);
    const catalog = options.catalog || JUPYTER_IMAGES;
    const serverRoot = options.serverRoot || path.join(__dirname, '..');
    const config = catalog[normalizedImageId];

    if (!config) {
        return {
            ok: false,
            status: 400,
            code: 'runtime_not_registered',
            imageId: normalizedImageId,
            message: `运行环境未注册：${normalizedImageId}`
        };
    }

    if (!config.build?.dockerfile) {
        return {
            ok: false,
            status: 400,
            code: 'runtime_not_buildable',
            imageId: normalizedImageId,
            imageName: config.name,
            message: `运行环境没有配置 Dockerfile：${normalizedImageId}`
        };
    }

    return {
        ok: true,
        imageId: normalizedImageId,
        imageName: config.name,
        label: config.label,
        contextPath: path.join(serverRoot, config.build.context || 'docker'),
        dockerfilePath: path.join(serverRoot, config.build.dockerfile),
        baseImage: config.baseImage
    };
}

function quoteShellPath(value) {
    return `"${String(value).replace(/"/g, '\\"')}"`;
}

function buildDockerBuildCommand(imageId, options = {}) {
    const spec = getRuntimeBuildSpec(imageId, options);
    if (!spec.ok) return spec;

    return {
        ...spec,
        command: [
            'docker build',
            `-f ${quoteShellPath(spec.dockerfilePath)}`,
            `-t ${spec.imageName}`,
            quoteShellPath(spec.contextPath)
        ].join(' ')
    };
}

function formatDockerImageSize(bytes) {
    const numericSize = Number(bytes);
    if (!Number.isFinite(numericSize) || numericSize <= 0) return '';
    const gib = numericSize / (1024 * 1024 * 1024);
    if (gib >= 1) return `${gib.toFixed(1)} GB`;
    const mib = numericSize / (1024 * 1024);
    return `${Math.max(1, Math.round(mib))} MB`;
}

function buildProjectRuntimeMeta(imageId = DEFAULT_IMAGE, catalog = JUPYTER_IMAGES) {
    const normalizedImageId = normalizeRuntimeImageId(imageId) || DEFAULT_IMAGE;
    const config = catalog[normalizedImageId] || catalog[DEFAULT_IMAGE];
    const resolvedImageId = catalog[normalizedImageId] ? normalizedImageId : DEFAULT_IMAGE;

    return {
        runtimeImageId: resolvedImageId,
        runtime: {
            imageId: resolvedImageId,
            imageName: config.name,
            label: config.label
        }
    };
}

function resolveProjectRuntime(projectMeta = {}, catalog = JUPYTER_IMAGES) {
    const runtime = projectMeta && typeof projectMeta.runtime === 'object' && projectMeta.runtime
        ? projectMeta.runtime
        : {};

    let imageId = normalizeRuntimeImageId(runtime.imageId);
    let runtimeSource = 'project_runtime';

    if (!imageId) {
        imageId = normalizeRuntimeImageId(projectMeta.runtimeImageId);
        runtimeSource = 'legacy_runtimeImageId';
    }

    if (!imageId) {
        imageId = DEFAULT_IMAGE;
        runtimeSource = 'default_fallback';
    }

    const config = catalog[imageId];
    if (!config) {
        return {
            ok: false,
            status: 400,
            code: 'runtime_not_registered',
            imageId,
            runtimeSource,
            message: `当前项目绑定的运行环境未注册：${imageId}`
        };
    }

    return {
        ok: true,
        imageId,
        runtimeImageId: imageId,
        runtimeSource,
        runtime: {
            imageId,
            imageName: config.name,
            name: config.name,
            title: config.title,
            label: runtime.label || config.label,
            description: config.description,
            source: config.source,
            category: config.category,
            python: config.python,
            tags: Array.isArray(config.tags) ? [...config.tags] : [],
            stack: config.stack,
            accelerator: config.accelerator,
            estimatedSize: config.estimatedSize,
            baseImage: config.baseImage,
            features: Array.isArray(config.features) ? [...config.features] : [],
            buildable: Boolean(config.build?.dockerfile),
            default: !!config.default
        }
    };
}

async function checkDockerDaemon(runDockerCommand) {
    try {
        await runDockerCommand('docker info --format "{{.ServerVersion}}"');
        return {
            ok: true,
            status: 200,
            code: 'docker_ready'
        };
    } catch (error) {
        return {
            ok: false,
            status: 503,
            code: 'docker_unavailable',
            message: 'Docker Desktop 未启动或 Docker daemon 无法连接。请先启动 Docker 后再启动项目。'
        };
    }
}

async function inspectRuntimeReadiness(runtime, runDockerCommand) {
    const dockerStatus = await checkDockerDaemon(runDockerCommand);
    if (!dockerStatus.ok) {
        return dockerStatus;
    }

    try {
        await runDockerCommand(`docker image inspect ${runtime.imageName}`);
        return {
            ok: true,
            status: 200,
            code: 'ready',
            imageId: runtime.imageId,
            imageName: runtime.imageName
        };
    } catch (error) {
        return {
            ok: false,
            status: 409,
            code: 'runtime_image_missing',
            imageId: runtime.imageId,
            imageName: runtime.imageName,
            message: `当前项目绑定环境未安装：${runtime.imageName}`
        };
    }
}

function buildDockerCommandEnv(baseEnv = process.env, platform = process.platform) {
    const env = { ...baseEnv };
    if (platform !== 'win32' && /^npipe:/i.test(String(env.DOCKER_HOST || ''))) {
        delete env.DOCKER_HOST;
    }
    return env;
}

module.exports = {
    JUPYTER_IMAGES,
    DEFAULT_IMAGE,
    getRuntimeCatalog,
    getRuntimeBuildSpec,
    buildDockerBuildCommand,
    formatDockerImageSize,
    buildProjectRuntimeMeta,
    resolveProjectRuntime,
    checkDockerDaemon,
    inspectRuntimeReadiness,
    buildDockerCommandEnv
};
