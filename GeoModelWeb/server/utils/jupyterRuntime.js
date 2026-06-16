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
    },
    'opengms-spatial-stats': {
        name: `opengms/spatial-stats:${RUNTIME_CATALOG_VERSION}`,
        label: 'Spatial Statistics',
        title: 'Spatial Statistics',
        description: 'Spatial statistics and econometrics runtime for exploratory spatial data analysis, spatial weights, hotspot detection, and regression workflows.',
        source: 'official',
        category: 'spatial-analysis',
        python: '3.13',
        tags: ['Official', 'CPU', 'Statistics'],
        stack: 'GeoModel Core · PySAL · ESDA · Spatial Regression · MGWR',
        accelerator: 'CPU',
        estimatedSize: '5-7 GB',
        features: ['pysal', 'libpysal', 'esda', 'spreg', 'mgwr', 'statsmodels', 'scikit-learn'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/spatial-stats/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-spatial-stats`,
            overview: 'A geospatial statistics notebook runtime for spatial weights, autocorrelation, hotspot/outlier analysis, spatial regression, and model diagnostics on vector datasets.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Analysis', value: 'PySAL / ESDA' },
                { label: 'Modeling', value: 'Spatial regression' },
                { label: 'Compute', value: 'CPU' }
            ],
            libraries: [
                ['pysal', 'latest'],
                ['libpysal', 'latest'],
                ['esda', 'latest'],
                ['spreg', 'latest'],
                ['mgwr', 'latest'],
                ['statsmodels', 'latest'],
                ['scikit-learn', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Spatial Analysis Runtime'
        },
        default: false
    },
    'opengms-urban-mobility': {
        name: `opengms/urban-mobility:${RUNTIME_CATALOG_VERSION}`,
        label: 'Urban Mobility',
        title: 'Urban Mobility',
        description: 'Street-network, accessibility, urban morphology, and trajectory-analysis runtime for city-scale mobility workflows.',
        source: 'official',
        category: 'urban-analysis',
        python: '3.13',
        tags: ['Official', 'CPU', 'Urban'],
        stack: 'GeoModel Core · OSMnx · NetworkX · Momepy · MovingPandas',
        accelerator: 'CPU',
        estimatedSize: '5-8 GB',
        features: ['osmnx', 'networkx', 'momepy', 'movingpandas', 'contextily'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/urban-mobility/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-urban-mobility`,
            overview: 'A city analytics runtime for downloading and analyzing street networks, urban amenities, morphology, accessibility, and movement trajectories.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Networks', value: 'OSMnx / NetworkX' },
                { label: 'Morphology', value: 'Momepy' },
                { label: 'Trajectories', value: 'MovingPandas' }
            ],
            libraries: [
                ['osmnx', 'latest'],
                ['networkx', 'latest'],
                ['momepy', 'latest'],
                ['movingpandas', 'latest'],
                ['contextily', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Urban Analytics Runtime'
        },
        default: false
    },
    'opengms-streetview-cv': {
        name: `opengms/streetview-cv:${RUNTIME_CATALOG_VERSION}`,
        label: 'Street-View CV',
        title: 'Street-View CV',
        description: 'CPU-first computer-vision runtime for street-view imagery, urban scene analysis, image processing, and lightweight deep-learning inference.',
        source: 'official',
        category: 'computer-vision',
        python: '3.13',
        tags: ['Official', 'CPU', 'CV'],
        stack: 'GeoModel Core · OpenCV · scikit-image · PyTorch CPU · Transformers',
        accelerator: 'CPU',
        estimatedSize: '7-10 GB',
        features: ['opencv', 'scikit-image', 'pillow', 'imageio', 'pytorch-cpu', 'torchvision', 'timm', 'transformers'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/streetview-cv/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-streetview-cv`,
            overview: 'A CPU-only image analytics runtime for street-view imagery, urban perception, feature extraction, segmentation experiments, and notebook-based computer vision workflows. It does not bundle model weights.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Vision', value: 'OpenCV / scikit-image' },
                { label: 'ML', value: 'PyTorch CPU' },
                { label: 'Weights', value: 'Not bundled' }
            ],
            libraries: [
                ['opencv', 'latest'],
                ['scikit-image', 'latest'],
                ['pillow', 'latest'],
                ['imageio', 'latest'],
                ['pytorch-cpu', 'latest'],
                ['torchvision', 'latest'],
                ['timm', 'latest'],
                ['transformers', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '8+ vCPU recommended' },
                { label: 'Memory', value: '16+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Computer Vision Runtime'
        },
        default: false
    },
    'opengms-urban-energy': {
        name: `opengms/urban-energy:${RUNTIME_CATALOG_VERSION}`,
        label: 'Urban Energy',
        title: 'Urban Energy',
        description: 'Urban energy and power-system analysis runtime for photovoltaic, power-flow, grid, and scenario modeling workflows.',
        source: 'official',
        category: 'energy-modeling',
        python: '3.13',
        tags: ['Official', 'CPU', 'Energy'],
        stack: 'GeoModel Core · PyPSA · pandapower · pvlib · Linopy',
        accelerator: 'CPU',
        estimatedSize: '5-8 GB',
        features: ['pypsa', 'pandapower', 'pvlib-python', 'linopy', 'highspy'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/urban-energy/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-urban-energy`,
            overview: 'A city-scale energy analysis runtime for renewable generation, photovoltaic modeling, power-flow simulation, and optimization-backed energy scenarios.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Energy Systems', value: 'PyPSA' },
                { label: 'Power Flow', value: 'pandapower' },
                { label: 'Solar', value: 'pvlib' }
            ],
            libraries: [
                ['pypsa', 'latest'],
                ['pandapower', 'latest'],
                ['pvlib-python', 'latest'],
                ['linopy', 'latest'],
                ['highspy', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Urban Energy Runtime'
        },
        default: false
    },
    'opengms-hydro-terrain': {
        name: `opengms/hydro-terrain:${RUNTIME_CATALOG_VERSION}`,
        label: 'Hydro Terrain',
        title: 'Hydro Terrain',
        description: 'Hydrology, terrain, watershed, flow-routing, and geomorphometry runtime for DEM-centered workflows.',
        source: 'official',
        category: 'hydrology',
        python: '3.13',
        tags: ['Official', 'CPU', 'Hydrology'],
        stack: 'GeoModel Core · WhiteboxTools · pyflwdir · FloPy · Landlab',
        accelerator: 'CPU',
        estimatedSize: '5-8 GB',
        features: ['whitebox', 'pysheds', 'pyflwdir', 'flopy', 'landlab'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/hydro-terrain/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-hydro-terrain`,
            overview: 'A terrain and hydrology runtime for DEM conditioning, watershed delineation, flow direction, groundwater modeling, and landscape process experiments.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Terrain', value: 'WhiteboxTools' },
                { label: 'Flow Routing', value: 'pyflwdir / pysheds' },
                { label: 'Hydrology', value: 'FloPy / Landlab' }
            ],
            libraries: [
                ['whitebox', 'latest'],
                ['pysheds', 'latest'],
                ['pyflwdir', 'latest'],
                ['flopy', 'latest'],
                ['landlab', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Hydrology Runtime'
        },
        default: false
    },
    'opengms-pointcloud-lidar': {
        name: `opengms/pointcloud-lidar:${RUNTIME_CATALOG_VERSION}`,
        label: 'Point Cloud / LiDAR',
        title: 'Point Cloud / LiDAR',
        description: 'Point-cloud and 3D geospatial runtime for LiDAR translation, filtering, visualization, and mesh analysis.',
        source: 'official',
        category: 'point-cloud',
        python: '3.13',
        tags: ['Official', 'CPU', 'LiDAR'],
        stack: 'GeoModel Core · PDAL · laspy · PyVista · Trimesh',
        accelerator: 'CPU',
        estimatedSize: '5-8 GB',
        features: ['pdal', 'python-pdal', 'laspy', 'lazrs', 'pyvista', 'trimesh'],
        baseImage: `opengms/geomodel-core:${RUNTIME_CATALOG_VERSION}`,
        build: {
            context: 'docker',
            dockerfile: 'docker/runtimes/pointcloud-lidar/Dockerfile'
        },
        detail: {
            version: `v${RUNTIME_CATALOG_VERSION}-pointcloud-lidar`,
            overview: 'A 3D geospatial notebook runtime for point-cloud translation, filtering, LAZ/LAS processing, exploratory visualization, and lightweight mesh workflows.',
            runtimeStack: [
                { label: 'Base', value: 'GeoModel Core' },
                { label: 'Point Clouds', value: 'PDAL / laspy' },
                { label: 'Compression', value: 'lazrs' },
                { label: '3D Viz', value: 'PyVista / Trimesh' }
            ],
            libraries: [
                ['pdal', 'latest'],
                ['python-pdal', 'latest'],
                ['laspy', 'latest'],
                ['lazrs', 'latest'],
                ['pyvista', 'latest'],
                ['trimesh', 'latest']
            ],
            requirements: [
                { label: 'Compute', value: '4+ vCPU recommended' },
                { label: 'Memory', value: '8+ GB RAM' },
                { label: 'Accelerator', value: 'Not required' }
            ],
            maintainer: 'OpenGMS Point Cloud Runtime'
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

async function inspectRuntimeCatalogImage(runtimeConfig, runDockerCommand) {
    try {
        const rawInspect = await runDockerCommand(`docker image inspect --format "{{json .}}" ${runtimeConfig.imageName}`);
        const inspect = JSON.parse(String(rawInspect || '{}').trim() || '{}');
        const installedSize = formatDockerImageSize(inspect.Size);

        return {
            ...runtimeConfig,
            available: true,
            status: 'installed',
            installedSize,
            size: installedSize || runtimeConfig.estimatedSize || '',
            imageId: inspect.Id || '',
            imageCreatedAt: inspect.Created || '',
            unavailableReason: ''
        };
    } catch (error) {
        return {
            ...runtimeConfig,
            available: false,
            status: 'missing',
            installedSize: '',
            size: runtimeConfig.estimatedSize || '',
            imageId: '',
            imageCreatedAt: '',
            unavailableReason: 'image_missing'
        };
    }
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

const OPENGMS_RUNTIME_ENV_KEYS = [
    'OGMS_TOKEN',
    'OGMS_BASE_PORTAL_URL',
    'OGMS_BASE_MANAGER_URL',
    'OGMS_BASE_DATA_URL',
    'OPENGMS_ROOF_PV_TOKEN',
    'OPENGMS_LIVE_MODE',
    'OPENGMS_LIVE_TIMEOUT_SECONDS',
    'PYGEOMODEL_OPENAI_API_KEY',
    'PYGEOMODEL_OPENAI_BASE_URL',
    'PYGEOMODEL_OPENAI_MODEL',
    'PYGEOMODEL_DIFY_API_KEY',
    'PYGEOMODEL_DIFY_BASE_URL',
    'PYGEOMODEL_CONSENSUS_API_KEY',
    'PYGEOMODEL_CONSENSUS_BASE_URL'
];

function buildOpenGmsCredentialEnv(baseEnv = process.env) {
    return OPENGMS_RUNTIME_ENV_KEYS.reduce((env, key) => {
        const value = String(baseEnv[key] || '').trim();
        if (value) {
            env[key] = value;
        }
        return env;
    }, {});
}

module.exports = {
    JUPYTER_IMAGES,
    DEFAULT_IMAGE,
    getRuntimeCatalog,
    getRuntimeBuildSpec,
    buildDockerBuildCommand,
    formatDockerImageSize,
    inspectRuntimeCatalogImage,
    buildProjectRuntimeMeta,
    resolveProjectRuntime,
    checkDockerDaemon,
    inspectRuntimeReadiness,
    buildDockerCommandEnv,
    buildOpenGmsCredentialEnv
};
