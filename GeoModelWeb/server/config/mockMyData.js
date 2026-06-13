const MOCK_SOURCE = 'mock';

const mockFolders = [
    {
        id: 'mock-folder-remote-sensing',
        name: 'Remote Sensing',
        kind: 'folder',
        type: 'folder',
        path: '/Remote Sensing',
        source: MOCK_SOURCE,
        metadata: { domain: 'Remote Sensing' }
    },
    {
        id: 'mock-folder-worldcover',
        name: 'ESA WorldCover',
        kind: 'folder',
        type: 'folder',
        path: '/Remote Sensing/ESA WorldCover',
        parentId: 'mock-folder-remote-sensing',
        source: MOCK_SOURCE,
        metadata: { domain: 'Remote Sensing' }
    },
    {
        id: 'mock-folder-sentinel2',
        name: 'Sentinel-2',
        kind: 'folder',
        type: 'folder',
        path: '/Remote Sensing/Sentinel-2',
        parentId: 'mock-folder-remote-sensing',
        source: MOCK_SOURCE,
        metadata: { domain: 'Remote Sensing' }
    },
    {
        id: 'mock-folder-terrain',
        name: 'Terrain',
        kind: 'folder',
        type: 'folder',
        path: '/Terrain',
        source: MOCK_SOURCE,
        metadata: { domain: 'Terrain' }
    },
    {
        id: 'mock-folder-terrain-dem',
        name: 'DEM',
        kind: 'folder',
        type: 'folder',
        path: '/Terrain/DEM',
        parentId: 'mock-folder-terrain',
        source: MOCK_SOURCE,
        metadata: { domain: 'Terrain' }
    },
    {
        id: 'mock-folder-climate',
        name: 'Climate',
        kind: 'folder',
        type: 'folder',
        path: '/Climate',
        source: MOCK_SOURCE,
        metadata: { domain: 'Climate' }
    },
    {
        id: 'mock-folder-era5',
        name: 'ERA5',
        kind: 'folder',
        type: 'folder',
        path: '/Climate/ERA5',
        parentId: 'mock-folder-climate',
        source: MOCK_SOURCE,
        metadata: { domain: 'Climate' }
    },
    {
        id: 'mock-folder-hydrology',
        name: 'Hydrology',
        kind: 'folder',
        type: 'folder',
        path: '/Hydrology',
        source: MOCK_SOURCE,
        metadata: { domain: 'Hydrology' }
    },
    {
        id: 'mock-folder-watershed',
        name: 'Watershed',
        kind: 'folder',
        type: 'folder',
        path: '/Hydrology/Watershed',
        parentId: 'mock-folder-hydrology',
        source: MOCK_SOURCE,
        metadata: { domain: 'Hydrology' }
    },
    {
        id: 'mock-folder-urban',
        name: 'Urban',
        kind: 'folder',
        type: 'folder',
        path: '/Urban',
        source: MOCK_SOURCE,
        metadata: { domain: 'Urban' }
    },
    {
        id: 'mock-folder-poi',
        name: 'POI',
        kind: 'folder',
        type: 'folder',
        path: '/Urban/POI',
        parentId: 'mock-folder-urban',
        source: MOCK_SOURCE,
        metadata: { domain: 'Urban' }
    },
    {
        id: 'mock-folder-documents',
        name: 'Documents',
        kind: 'folder',
        type: 'folder',
        path: '/Documents',
        source: MOCK_SOURCE,
        metadata: { domain: 'Documentation' }
    }
];

const mockFiles = [
    {
        id: 'mock-worldcover-changsha-2020',
        name: 'Changsha_ESA_WorldCover_2020.tif',
        kind: 'file',
        type: 'tif',
        path: '/Remote Sensing/ESA WorldCover/Changsha_ESA_WorldCover_2020.tif',
        parentId: 'mock-folder-worldcover',
        size: 125829120,
        source: MOCK_SOURCE,
        downloadable: false,
        description: 'ESA WorldCover land-cover classification clipped to the Changsha urban region.',
        uploadedAt: '2026-05-22T00:00:00.000Z',
        metadata: {
            domain: 'Remote Sensing',
            formatLabel: 'GeoTIFF',
            crs: 'EPSG:4326',
            resolution: '10 m',
            spatialCoverage: 'Changsha, China',
            temporalCoverage: '2020'
        }
    },
    {
        id: 'mock-sentinel2-changsha-2024',
        name: 'Changsha_S2_L2A_2024_sample.tif',
        kind: 'file',
        type: 'tif',
        path: '/Remote Sensing/Sentinel-2/Changsha_S2_L2A_2024_sample.tif',
        parentId: 'mock-folder-sentinel2',
        size: 98566144,
        source: MOCK_SOURCE,
        downloadable: false,
        description: 'Sentinel-2 L2A sample scene for vegetation and land surface analysis.',
        uploadedAt: '2026-05-22T00:00:00.000Z',
        metadata: {
            domain: 'Remote Sensing',
            formatLabel: 'GeoTIFF',
            crs: 'EPSG:32649',
            resolution: '10 m',
            spatialCoverage: 'Changsha, China',
            temporalCoverage: '2024'
        }
    },
    {
        id: 'mock-dem-changsha-30m',
        name: 'Changsha_DEM_30m.tif',
        kind: 'file',
        type: 'tif',
        path: '/Terrain/DEM/Changsha_DEM_30m.tif',
        parentId: 'mock-folder-terrain-dem',
        size: 44879052,
        source: MOCK_SOURCE,
        downloadable: false,
        description: 'Thirty-meter digital elevation model for topographic aggregation and terrain analysis.',
        uploadedAt: '2026-05-22T00:00:00.000Z',
        metadata: {
            domain: 'Terrain',
            formatLabel: 'GeoTIFF',
            crs: 'EPSG:4326',
            resolution: '30 m',
            spatialCoverage: 'Changsha, China'
        }
    },
    {
        id: 'mock-era5-changsha-temperature-2020',
        name: 'Changsha_ERA5_Temperature_2020.nc',
        kind: 'file',
        type: 'nc',
        path: '/Climate/ERA5/Changsha_ERA5_Temperature_2020.nc',
        parentId: 'mock-folder-era5',
        size: 73400320,
        source: MOCK_SOURCE,
        downloadable: false,
        description: 'ERA5 near-surface temperature subset for climate notebook demonstrations.',
        uploadedAt: '2026-05-22T00:00:00.000Z',
        metadata: {
            domain: 'Climate',
            formatLabel: 'NetCDF',
            crs: 'EPSG:4326',
            resolution: '0.25°',
            spatialCoverage: 'Changsha, China',
            temporalCoverage: '2020'
        }
    },
    {
        id: 'mock-xiangjiang-basin',
        name: 'Xiangjiang_Basin.geojson',
        kind: 'file',
        type: 'geojson',
        path: '/Hydrology/Watershed/Xiangjiang_Basin.geojson',
        parentId: 'mock-folder-watershed',
        size: 1853440,
        source: MOCK_SOURCE,
        downloadable: false,
        description: 'Watershed boundary and core attributes for hydrological modeling examples.',
        uploadedAt: '2026-05-22T00:00:00.000Z',
        metadata: {
            domain: 'Hydrology',
            formatLabel: 'GeoJSON',
            crs: 'EPSG:4326',
            spatialCoverage: 'Xiangjiang Basin'
        }
    },
    {
        id: 'mock-poi-changsha-2024',
        name: 'Changsha_POI_2024.csv',
        kind: 'file',
        type: 'csv',
        path: '/Urban/POI/Changsha_POI_2024.csv',
        parentId: 'mock-folder-poi',
        size: 6422528,
        source: MOCK_SOURCE,
        downloadable: false,
        description: 'Point-of-interest table for urban accessibility and spatial distribution notebooks.',
        uploadedAt: '2026-05-22T00:00:00.000Z',
        metadata: {
            domain: 'Urban',
            formatLabel: 'CSV',
            crs: 'WGS84 coordinates',
            spatialCoverage: 'Changsha, China',
            temporalCoverage: '2024'
        }
    },
    {
        id: 'mock-readme-project-data',
        name: 'README_Project_Data.txt',
        kind: 'file',
        type: 'txt',
        path: '/Documents/README_Project_Data.txt',
        parentId: 'mock-folder-documents',
        size: 4096,
        source: MOCK_SOURCE,
        downloadable: false,
        description: 'A short note explaining how My Data assets are attached to Jupyter workspaces.',
        uploadedAt: '2026-05-22T00:00:00.000Z',
        metadata: {
            domain: 'Documentation',
            formatLabel: 'Plain Text'
        }
    }
];

module.exports = {
    MOCK_MY_DATA: [...mockFolders, ...mockFiles]
};
