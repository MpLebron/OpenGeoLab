const fs = require('fs');
const path = require('path');

const STARTER_TEMPLATE_IDS = new Set([
    'blank',
    'python-notebook',
    'geospatial-notebook'
]);

function normalizeStarterTemplate(value) {
    return STARTER_TEMPLATE_IDS.has(value) ? value : 'blank';
}

function createNotebook(cells) {
    return {
        cells,
        metadata: {
            kernelspec: {
                display_name: 'Python 3',
                language: 'python',
                name: 'python3'
            },
            language_info: {
                name: 'python',
                pygments_lexer: 'ipython3'
            }
        },
        nbformat: 4,
        nbformat_minor: 5
    };
}

function markdownCell(source) {
    return {
        cell_type: 'markdown',
        metadata: {},
        source: Array.isArray(source) ? source : [source]
    };
}

function codeCell(source) {
    return {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: Array.isArray(source) ? source : [source]
    };
}

function buildPythonNotebook(projectName) {
    return createNotebook([
        markdownCell([
            `# ${projectName}\n`,
            '\n',
            'A reproducible OpenGMS Jupyter workspace for scientific analysis.\n'
        ]),
        codeCell([
            'import pandas as pd\n',
            'import numpy as np\n',
            '\n',
            'print("Workspace ready")\n'
        ])
    ]);
}

function buildGeospatialNotebook(projectName) {
    return createNotebook([
        markdownCell([
            `# ${projectName}\n`,
            '\n',
            'Starter outline for geospatial modeling with vector, raster, and gridded data.\n'
        ]),
        codeCell([
            'import geopandas as gpd\n',
            'import rasterio\n',
            'import xarray as xr\n',
            '\n',
            'print("Geospatial workspace ready")\n'
        ]),
        markdownCell([
            '## Suggested workflow\n',
            '\n',
            '1. Attach project data from My Data.\n',
            '2. Inspect coordinate reference systems and spatial coverage.\n',
            '3. Run analysis cells and save derived outputs.\n'
        ])
    ]);
}

function buildStarterNotebook(templateId, projectName) {
    if (templateId === 'python-notebook') {
        return buildPythonNotebook(projectName);
    }

    if (templateId === 'geospatial-notebook') {
        return buildGeospatialNotebook(projectName);
    }

    return null;
}

function initializeProjectStarter(projectDir, starterTemplate, options = {}) {
    const normalizedTemplate = normalizeStarterTemplate(starterTemplate);
    const projectName = options.projectName || path.basename(projectDir);
    const notebook = buildStarterNotebook(normalizedTemplate, projectName);
    const createdFiles = [];

    if (notebook) {
        fs.writeFileSync(
            path.join(projectDir, 'main.ipynb'),
            JSON.stringify(notebook, null, 2)
        );
        createdFiles.push('main.ipynb');
    }

    return {
        starterTemplate: normalizedTemplate,
        createdFiles
    };
}

module.exports = {
    initializeProjectStarter,
    normalizeStarterTemplate
};
