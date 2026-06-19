const fs = require('fs');
const path = require('path');
const { CASE_LIBRARY_DIR, getCaseDirectory, getCaseProjectDirectory } = require('../config/cases');
const { buildProjectRuntimeMeta } = require('./jupyterRuntime');

const LOCAL_CASE_SOURCE = 'opengeolab-local-case';
const DEFAULT_WORKBENCH_CASE_OWNER = 'MpLebron';
const NANJING_ROOFTOP_CASE_SLUG = 'nanjing-rooftop-pv';
const URBAN_M2M_CASE_SLUG = 'urban-m2m-suzhou-expansion';
const CURATED_CASE_SOURCE = 'opengeolab-curated-case';
const CASE_SEED_ROOT = path.join(__dirname, '..', 'case-seeds');

const NANJING_ROOFTOP_CASE = {
    source: LOCAL_CASE_SOURCE,
    sourceId: NANJING_ROOFTOP_CASE_SLUG,
    slug: NANJING_ROOFTOP_CASE_SLUG,
    title: 'Nanjing Rooftop Photovoltaic Potential Assessment',
    summary: 'Run a live PyGeoModel/OpenGMS rooftop PV experiment for building-level photovoltaic potential and carbon reduction in Xuanwu District, Nanjing.',
    description: 'A research-question-driven OpenGeoLab case that inspects a rooftop inventory, invokes the live OpenGMS rooftop photovoltaic model, and analyzes the downloaded task output.',
    domain: 'Urban Renewable Energy',
    tags: ['PyGeoModel', 'OpenGMS', 'Solar Energy', 'Rooftop PV', 'Nanjing', 'Geospatial Modeling'],
    authors: ['OpenGeoLab Team'],
    authorLine: 'OpenGeoLab Team',
    timeLabel: '2026/05/23',
    runtimeImageId: 'opengms-geoviz',
    coreNotebook: 'main.ipynb',
    coverFileName: 'cover.svg',
    projectDir: path.join(CASE_SEED_ROOT, NANJING_ROOFTOP_CASE_SLUG, 'project'),
    coverPath: path.join(CASE_SEED_ROOT, NANJING_ROOFTOP_CASE_SLUG, 'cover.svg'),
    projectDataBindings: [],
    steps: [
        'Open main.ipynb in the Interactive GeoViz runtime.',
        'Load and inspect the Xuanwu rooftop vector inventory as the model input.',
        'Verify the PyGeoModel rooftop photovoltaic model metadata and parameters.',
        'Submit a fresh OpenGMS rooftop PV task and download the returned output files.',
        'Analyze the live model output shapefile to summarize PV generation, carbon reduction, and the spatial heatmap.'
    ],
    datasets: [
        {
            name: 'Xuanwu rooftop vector data',
            path: 'data/xuanwu/xuanwu.shp',
            type: 'Shapefile',
            description: 'Building rooftop polygons for Xuanwu District, Nanjing.'
        },
        {
            name: 'Rooftop model input package',
            path: 'data/xuanwu_rooftop.zip',
            type: 'Shapefile ZIP',
            description: 'Zipped rooftop vector data used as the PyGeoModel model input.'
        },
        {
            name: 'Live rooftop PV task output',
            path: 'outputs/live-rooftop-pv/<run-id>/downloads',
            type: 'Generated OpenGMS output',
            description: 'Downloaded files returned by the current PyGeoModel/OpenGMS rooftop PV task.'
        }
    ],
    expectedResults: [
        'A Folium map previews the Xuanwu rooftop polygons.',
        'A Plotly histogram summarizes rooftop area distribution.',
        'A live model output shapefile is downloaded and recorded with the OpenGMS task metadata.',
        'A heatmap and printed statistics summarize rooftop PV potential and CO2 reduction from the live model output.'
    ]
};

const URBAN_M2M_CASE = {
    source: LOCAL_CASE_SOURCE,
    sourceId: URBAN_M2M_CASE_SLUG,
    slug: URBAN_M2M_CASE_SLUG,
    title: 'Suzhou Urban Expansion Simulation with UrbanM2M',
    summary: 'Run a live OpenGMS UrbanM2M experiment to simulate and validate Suzhou urban expansion from 2010 to 2013.',
    description: 'A research-question-driven OpenGeoLab case that inspects Suzhou historical rasters, invokes the live UrbanM2M model, and validates downloaded simulation outputs against observed 2013 urban land.',
    domain: 'Urban Expansion',
    tags: ['Urban Expansion', 'UrbanM2M', 'OpenGMS', 'PyGeoModel', 'Land Use', 'Raster Simulation', 'Suzhou'],
    authors: ['Zhoums396', 'OpenGeoLab'],
    authorLine: 'Zhoums396 / OpenGeoLab',
    timeLabel: '2026/06/03',
    runtimeImageId: 'opengms-geoviz',
    coreNotebook: 'main.ipynb',
    coverFileName: 'cover.svg',
    projectDir: path.join(CASE_SEED_ROOT, URBAN_M2M_CASE_SLUG, 'project'),
    coverPath: path.join(CASE_SEED_ROOT, URBAN_M2M_CASE_SLUG, 'cover.svg'),
    projectDataBindings: [],
    steps: [
        'Open main.ipynb in the Interactive GeoViz runtime.',
        'Load the Suzhou study area and inspect historical urban land rasters.',
        'Configure the UrbanM2M OpenGMS model parameters with explicit local input paths.',
        'Submit a fresh OpenGMS UrbanM2M task and download the returned simulation and probability rasters.',
        'Compare the live UrbanM2M outputs with observed 2013 urban land and summarize accuracy.'
    ],
    datasets: [
        {
            name: 'UrbanM2M model input package',
            path: 'data/Suzhou.zip',
            type: 'GeoTIFF ZIP',
            description: 'Packaged range, restriction, historical land-use, and spatial variable rasters used by UrbanM2M.'
        },
        {
            name: 'Suzhou masked historical land-use rasters',
            path: 'data/Suzhou-Masked/year',
            type: 'GeoTIFF time series',
            description: 'Observed urban land rasters from 2000 to 2017 clipped to the study region.'
        },
        {
            name: 'Live UrbanM2M task outputs',
            path: 'outputs/live-urban-m2m/<run-id>/downloads',
            type: 'Generated OpenGMS output',
            description: 'Downloaded simulation and probability files returned by the current UrbanM2M task.'
        }
    ],
    expectedResults: [
        'Maps compare Suzhou observed urban land in 2010 and 2013.',
        'The notebook records the UrbanM2M PyGeoModel parameters and model identifier.',
        'Simulation maps show 2013 urban expansion and transition probability from live UrbanM2M outputs.',
        'Validation statistics report Precision, Recall, and F1-score for the effective model area.'
    ]
};

function normalizeManifestList(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
}

function loadCuratedCaseSeedSpecs() {
    if (!fs.existsSync(CASE_SEED_ROOT)) return [];

    return fs.readdirSync(CASE_SEED_ROOT, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => {
            const slug = entry.name;
            if (slug === NANJING_ROOFTOP_CASE_SLUG || slug === URBAN_M2M_CASE_SLUG) {
                return null;
            }

            const seedDir = path.join(CASE_SEED_ROOT, slug);
            const manifestPath = path.join(seedDir, 'case.json');
            if (!fs.existsSync(manifestPath)) return null;

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const coreNotebook = manifest.coreNotebook || 'main.ipynb';
            const coverFileName = manifest.coverFileName || 'cover.svg';

            return {
                source: manifest.source || CURATED_CASE_SOURCE,
                sourceId: manifest.sourceId || slug,
                slug,
                title: manifest.title || slug,
                summary: manifest.summary || manifest.description || '',
                description: manifest.description || manifest.summary || '',
                domain: manifest.domain || 'Geospatial Analysis',
                tags: normalizeManifestList(manifest.tags),
                authors: normalizeManifestList(manifest.authors),
                authorLine: manifest.authorLine || normalizeManifestList(manifest.authors).join(', '),
                timeLabel: manifest.timeLabel || '',
                runtimeImageId: manifest.runtimeImageId || 'opengms-geoviz',
                coreNotebook,
                coverFileName,
                projectDir: path.join(seedDir, 'project'),
                coverPath: path.join(seedDir, coverFileName),
                projectDataBindings: normalizeManifestList(manifest.projectDataBindings),
                steps: normalizeManifestList(manifest.steps),
                datasets: normalizeManifestList(manifest.datasets),
                expectedResults: normalizeManifestList(manifest.expectedResults)
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.slug.localeCompare(b.slug));
}

function getLocalCaseSeedSpecs() {
    return [
        NANJING_ROOFTOP_CASE,
        URBAN_M2M_CASE,
        ...loadCuratedCaseSeedSpecs()
    ];
}

function resolveUserDataDir(userDataDir = process.env.USER_DATA_DIR || path.join(__dirname, '..', 'jupyter-data')) {
    return path.isAbsolute(userDataDir)
        ? userDataDir
        : path.join(__dirname, '..', userDataDir);
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function getIsoDate(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatCaseDataset(dataset = {}) {
    const name = dataset.name || dataset.path || 'Dataset';
    const type = dataset.type ? ` · ${dataset.type}` : '';
    const location = dataset.path ? ` (${dataset.path})` : '';
    return `${name}${type}${location}`;
}

function buildWorkbenchCaseBinding(binding, syncedAt) {
    const timestamp = getIsoDate(syncedAt);
    const normalized = cloneJson(binding);

    return {
        ...normalized,
        source: normalized.source || 'case',
        bindingType: normalized.bindingType || 'bundled-case-data',
        status: normalized.status || 'ready',
        mode: normalized.mode || 'readonly',
        localPath: normalized.localPath || normalized.mountPath,
        materialized: normalized.materialized !== false,
        materializedAt: normalized.materializedAt || timestamp,
        addedAt: normalized.addedAt || timestamp,
        downloadable: false,
        url: '',
        error: normalized.error || '',
        sourceAvailable: true
    };
}

function buildWorkbenchCaseProjectMeta(seed, { owner = DEFAULT_WORKBENCH_CASE_OWNER, syncedAt = new Date() } = {}) {
    const timestamp = getIsoDate(syncedAt);
    const runtimeMeta = buildProjectRuntimeMeta(seed.runtimeImageId);

    return {
        name: seed.slug,
        description: seed.description || seed.summary || '',
        isPublic: true,
        isCase: true,
        createdAt: timestamp,
        createdBy: owner,
        updatedAt: timestamp,
        ...runtimeMeta,
        case: {
            title: seed.title,
            summary: seed.summary || seed.description || '',
            scenario: seed.domain || '',
            coreNotebook: seed.coreNotebook,
            environment: runtimeMeta.runtime?.label || seed.runtimeImageId || '',
            tags: Array.isArray(seed.tags) ? [...seed.tags] : [],
            datasets: Array.isArray(seed.datasets) ? seed.datasets.map(formatCaseDataset) : [],
            steps: Array.isArray(seed.steps) ? [...seed.steps] : [],
            results: Array.isArray(seed.expectedResults) ? [...seed.expectedResults] : []
        },
        dataBindings: Array.isArray(seed.projectDataBindings)
            ? seed.projectDataBindings.map(binding => buildWorkbenchCaseBinding(binding, timestamp))
            : [],
        seed: {
            source: seed.source || LOCAL_CASE_SOURCE,
            sourceId: seed.sourceId,
            slug: seed.slug,
            syncedAt: timestamp
        }
    };
}

function countProjectFiles(projectDir) {
    if (!fs.existsSync(projectDir)) {
        return { fileCount: 0, notebookCount: 0 };
    }

    const files = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name.startsWith('.')) continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else {
                files.push(fullPath);
            }
        }
    };
    walk(projectDir);

    return {
        fileCount: files.length,
        notebookCount: files.filter(file => file.toLowerCase().endsWith('.ipynb')).length
    };
}

function buildLocalCaseRecord(seed, order, syncedAt = new Date()) {
    const publishedAt = syncedAt instanceof Date ? syncedAt : new Date(syncedAt);
    const { fileCount, notebookCount } = countProjectFiles(seed.projectDir);

    return {
        source: seed.source || LOCAL_CASE_SOURCE,
        sourceId: seed.sourceId,
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        description: seed.description,
        tags: seed.tags,
        domain: seed.domain,
        authors: seed.authors,
        authorLine: seed.authorLine,
        publishedAt,
        timeLabel: seed.timeLabel,
        coverImageUrl: seed.coverFileName ? `/api/case-assets/${seed.slug}/${seed.coverFileName}` : '',
        runtimeImageId: seed.runtimeImageId,
        coreNotebook: seed.coreNotebook,
        notebookCount,
        fileCount,
        steps: seed.steps,
        datasets: seed.datasets,
        expectedResults: seed.expectedResults,
        content: '',
        projectDataBindings: seed.projectDataBindings,
        order,
        visible: true,
        status: 'published',
        updatedAt: publishedAt,
        syncedAt: publishedAt
    };
}

function writeSeedManifest(seed, caseDir, syncedAt) {
    const manifest = {
        source: seed.source || LOCAL_CASE_SOURCE,
        sourceId: seed.sourceId,
        slug: seed.slug,
        title: seed.title,
        importedAt: syncedAt.toISOString(),
        notebookFileName: seed.coreNotebook,
        projectDataBindings: seed.projectDataBindings
    };
    fs.writeFileSync(path.join(caseDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
}

function copySeedToCaseLibrary(seed, syncedAt = new Date()) {
    const caseDir = getCaseDirectory(seed.slug);
    const targetProjectDir = getCaseProjectDirectory(seed.slug);

    if (!fs.existsSync(seed.projectDir)) {
        throw new Error(`Case seed project directory is missing: ${seed.projectDir}`);
    }

    fs.mkdirSync(CASE_LIBRARY_DIR, { recursive: true });
    fs.rmSync(caseDir, { recursive: true, force: true });
    fs.mkdirSync(caseDir, { recursive: true });
    fs.cpSync(seed.projectDir, targetProjectDir, { recursive: true });

    if (seed.coverPath && fs.existsSync(seed.coverPath) && seed.coverFileName) {
        fs.copyFileSync(seed.coverPath, path.join(caseDir, seed.coverFileName));
    }

    writeSeedManifest(seed, caseDir, syncedAt);
    return { caseDir, targetProjectDir };
}

function copySeedToWorkbenchCaseProject(seed, {
    owner = process.env.OPENGEOLAB_CASE_SEED_OWNER || DEFAULT_WORKBENCH_CASE_OWNER,
    userDataDir = resolveUserDataDir(),
    syncedAt = new Date()
} = {}) {
    if (!fs.existsSync(seed.projectDir)) {
        throw new Error(`Case seed project directory is missing: ${seed.projectDir}`);
    }

    const ownerDir = path.join(userDataDir, owner);
    const targetProjectDir = path.join(ownerDir, seed.slug);
    const meta = buildWorkbenchCaseProjectMeta(seed, { owner, syncedAt });

    fs.mkdirSync(ownerDir, { recursive: true });
    fs.rmSync(targetProjectDir, { recursive: true, force: true });
    fs.cpSync(seed.projectDir, targetProjectDir, { recursive: true });
    fs.writeFileSync(path.join(targetProjectDir, '.project.json'), JSON.stringify(meta, null, 2));

    return {
        owner,
        projectName: seed.slug,
        targetProjectDir,
        meta
    };
}

async function cleanupSystemCaseSeedArtifacts({ casesCollection, syncedAt = new Date() } = {}) {
    const seeds = getLocalCaseSeedSpecs();
    const sourceIds = seeds.map(seed => seed.sourceId);
    let deletedRecords = 0;

    if (casesCollection && typeof casesCollection.deleteMany === 'function') {
        const result = await casesCollection.deleteMany({
            source: LOCAL_CASE_SOURCE,
            sourceId: { $in: sourceIds }
        });
        deletedRecords = result.deletedCount || 0;
    }

    for (const seed of seeds) {
        fs.rmSync(getCaseDirectory(seed.slug), { recursive: true, force: true });
    }

    return {
        deletedRecords,
        deletedSourceIds: sourceIds,
        syncedAt: getIsoDate(syncedAt)
    };
}

async function syncLocalCaseSeeds({
    owner = process.env.OPENGEOLAB_CASE_SEED_OWNER || DEFAULT_WORKBENCH_CASE_OWNER,
    userDataDir = resolveUserDataDir(),
    casesCollection,
    syncedAt = new Date()
} = {}) {
    const seeds = getLocalCaseSeedSpecs();
    const cases = seeds.map(seed => copySeedToWorkbenchCaseProject(seed, {
        owner,
        userDataDir,
        syncedAt
    }));

    const cleanup = await cleanupSystemCaseSeedArtifacts({ casesCollection, syncedAt });

    return { cases, cleanup, owner, userDataDir, syncedAt };
}

module.exports = {
    buildWorkbenchCaseProjectMeta,
    buildLocalCaseRecord,
    copySeedToCaseLibrary,
    copySeedToWorkbenchCaseProject,
    cleanupSystemCaseSeedArtifacts,
    DEFAULT_WORKBENCH_CASE_OWNER,
    getLocalCaseSeedSpecs,
    LOCAL_CASE_SOURCE,
    CURATED_CASE_SOURCE,
    NANJING_ROOFTOP_CASE_SLUG,
    URBAN_M2M_CASE_SLUG,
    resolveUserDataDir,
    syncLocalCaseSeeds
};
