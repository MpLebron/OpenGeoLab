#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'output', 'geospatial-case-research');

const SEARCH_QUERIES = [
    'geospatial notebook data',
    'geospatial jupyter notebook',
    'geopandas notebook data',
    'rasterio notebook data',
    'xarray climate notebook',
    'earth observation notebook',
    'remote sensing notebook data',
    'satellite imagery notebook',
    'hydrology notebook data',
    'watershed notebook data',
    'flood notebook data',
    'terrain analysis notebook',
    'land use notebook data',
    'land cover notebook data',
    'urban planning notebook geospatial',
    'spatial analysis notebook data',
    'pysal notebook data',
    'osmnx notebook data',
    'stac notebook data',
    'sentinel notebook data',
    'landsat notebook data',
    'climate risk notebook',
    'environmental modeling notebook',
    'groundwater notebook data',
    'water resources notebook data',
    'hydromt notebook data',
    'wflow hydrology notebook',
    'sfincs flood notebook',
    'pywatershed notebook data',
    'whitebox geospatial notebook',
    'whitebox tools notebook hydrology',
    'pangeo geoscience notebook',
    'pangeo gallery notebook',
    'project pythia notebook geoscience',
    'cybergis notebook geospatial',
    'open data cube notebook data',
    'datacube notebook remote sensing',
    'urban mobility osmnx notebook data',
    'network analysis osmnx notebook data',
    'spatial econometrics pysal notebook',
    'point cloud lidar notebook data',
    'geology notebook data',
    'geoscience notebook data',
    'meteorology notebook xarray',
    'oceanography notebook data',
    'soil moisture notebook remote sensing',
    'wildfire remote sensing notebook',
    'landslide susceptibility notebook',
    'air quality geospatial notebook',
    'ecosystem remote sensing notebook',
    'topic:geospatial notebook',
    'topic:remote-sensing notebook',
    'topic:earth-observation notebook',
    'topic:hydrology notebook',
    'topic:gis notebook'
];

const GEO_TERMS = [
    'geospatial', 'gis', 'geographic', 'geography', 'earth observation', 'remote sensing',
    'satellite', 'raster', 'vector', 'geopandas', 'rasterio', 'xarray', 'rioxarray',
    'stac', 'hydrology', 'watershed', 'flood', 'terrain', 'dem', 'climate',
    'environmental', 'land use', 'land cover', 'urban', 'spatial', 'network',
    'accessibility', 'water', 'groundwater', 'soil', 'ndvi', 'modis', 'landsat',
    'sentinel', 'lidar', 'point cloud', 'pysal', 'osmnx', 'folium', 'leafmap'
];

const DATA_DIR_RE = /(^|\/)(data|dataset|datasets|input|inputs|sample[-_]?data|examples?\/data|resources?|raw|processed)(\/|$)/i;
const OUTPUT_DIR_RE = /(^|\/)(output|outputs|result|results|figures?|plots?|maps?|report|reports?)(\/|$)/i;
const NOTEBOOK_RE = /\.ipynb$/i;
const SCRIPT_RE = /\.(py|r|R|jl|qmd|Rmd)$/;
const DATA_FILE_RE = /\.(csv|tsv|json|geojson|gpkg|shp|shx|dbf|prj|tif|tiff|nc|grib|grib2|h5|hdf|hdf5|parquet|feather|zip|gz|bz2|7z|asc|las|laz|sqlite|db)$/i;
const OUTPUT_FILE_RE = /\.(png|jpg|jpeg|webp|svg|html|pdf|csv|geojson|tif|tiff|nc)$/i;
const ENV_FILE_RE = /(^|\/)(environment\.ya?ml|requirements\.txt|pyproject\.toml|poetry\.lock|Pipfile|Pipfile\.lock|Dockerfile|docker-compose\.ya?ml|binder\/|runtime\.txt|install\.R|renv\.lock|DESCRIPTION|setup\.py|setup\.cfg|package\.json|conda-lock\.ya?ml)$/i;
const RUN_FILE_RE = /(^|\/)(Makefile|Snakefile|dvc\.yaml|params\.ya?ml|config\.ya?ml|workflow\/|workflows\/|scripts?\/run|run\.(sh|py|R)|main\.(py|R))$/i;
const TESTY_RE = /(^|\/)(test|tests|testing|toy|dummy|hello-world|template)(\/|$)/i;

function parseArgs(argv) {
    const args = {
        perQuery: 25,
        pages: 1,
        minScore: 42,
        outDir: DEFAULT_OUTPUT_DIR,
        maxRepos: 240,
        searchDelayMs: 2200,
        analyzeDelayMs: 80
    };

    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];
        if (arg === '--per-query' && next) {
            args.perQuery = Number(next);
            i += 1;
        } else if (arg === '--pages' && next) {
            args.pages = Number(next);
            i += 1;
        } else if (arg === '--min-score' && next) {
            args.minScore = Number(next);
            i += 1;
        } else if (arg === '--max-repos' && next) {
            args.maxRepos = Number(next);
            i += 1;
        } else if (arg === '--search-delay-ms' && next) {
            args.searchDelayMs = Number(next);
            i += 1;
        } else if (arg === '--analyze-delay-ms' && next) {
            args.analyzeDelayMs = Number(next);
            i += 1;
        } else if (arg === '--out' && next) {
            args.outDir = path.resolve(next);
            i += 1;
        }
    }

    args.perQuery = Math.max(1, Math.min(100, args.perQuery || 25));
    args.pages = Math.max(1, Math.min(4, args.pages || 1));
    args.minScore = Math.max(0, Math.min(100, args.minScore || 42));
    args.maxRepos = Math.max(10, args.maxRepos || 240);
    args.searchDelayMs = Math.max(0, args.searchDelayMs || 0);
    args.analyzeDelayMs = Math.max(0, args.analyzeDelayMs || 0);
    return args;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function githubHeaders() {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    return {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'OpenGeoLab-case-research',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

async function githubGet(url, params = {}) {
    const res = await axios.get(url, {
        baseURL: 'https://api.github.com',
        headers: githubHeaders(),
        params,
        timeout: 30000,
        validateStatus: status => status >= 200 && status < 500
    });

    if (res.status >= 400) {
        const detail = typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data || '');
        throw new Error(`GitHub API ${res.status} for ${url}: ${detail.slice(0, 240)}`);
    }
    return res.data;
}

function uniqueStrings(values) {
    return [...new Set(values.filter(Boolean))];
}

function lowerText(value) {
    return String(value || '').toLowerCase();
}

function countTermHits(text, terms) {
    const haystack = lowerText(text);
    return terms.filter(term => haystack.includes(term)).length;
}

function shortList(values, limit = 8) {
    return values.slice(0, limit);
}

function pathName(filePath) {
    return filePath.split('/').pop() || filePath;
}

function pickPaths(paths, matcher, limit = 12) {
    return shortList(paths.filter(matcher), limit);
}

function sizeLabel(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let idx = 0;
    while (value >= 1024 && idx < units.length - 1) {
        value /= 1024;
        idx += 1;
    }
    return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function scoreRepo({ repo, readmeText, treePaths, license }) {
    const joinedPaths = treePaths.join('\n');
    const textBundle = [
        repo.full_name,
        repo.description,
        (repo.topics || []).join(' '),
        readmeText.slice(0, 20000),
        joinedPaths.slice(0, 20000)
    ].join('\n');

    const notebooks = treePaths.filter(p => NOTEBOOK_RE.test(p));
    const scripts = treePaths.filter(p => SCRIPT_RE.test(p));
    const envFiles = pickPaths(treePaths, p => ENV_FILE_RE.test(p), 20);
    const runFiles = pickPaths(treePaths, p => RUN_FILE_RE.test(p), 20);
    const dataFiles = pickPaths(treePaths, p => DATA_DIR_RE.test(p) && DATA_FILE_RE.test(p), 24);
    const dataDirs = uniqueStrings(treePaths
        .filter(p => DATA_DIR_RE.test(p))
        .map(p => p.split('/').slice(0, 2).join('/'))
    ).slice(0, 12);
    const outputFiles = pickPaths(treePaths, p => OUTPUT_DIR_RE.test(p) && OUTPUT_FILE_RE.test(p), 20);
    const likelyTests = treePaths.filter(p => TESTY_RE.test(p)).length;
    const readmeLower = lowerText(readmeText);
    const readmeRunSignals = [
        'reproduc', 'workflow', 'notebook', 'environment', 'conda', 'requirements',
        'docker', 'binder', 'data', 'dataset', 'run ', 'execute', 'tutorial',
        'case study', 'analysis', 'model'
    ].filter(term => readmeLower.includes(term));
    const externalDataSignals = [
        'zenodo', 'figshare', 'kaggle', 'earthdata', 'gee', 'google earth engine',
        'stac', 'opentopography', 'hydroshare', 'download', 'doi.org'
    ].filter(term => readmeLower.includes(term));

    const geoHits = countTermHits(textBundle, GEO_TERMS);
    let score = 0;

    score += Math.min(22, geoHits * 2.2);
    score += notebooks.length > 0 ? Math.min(16, 8 + notebooks.length * 1.5) : 0;
    score += scripts.length > 0 ? Math.min(7, scripts.length * 0.8) : 0;
    score += dataFiles.length > 0 ? Math.min(20, 8 + dataFiles.length * 1.2) : (dataDirs.length > 0 ? 5 : 0);
    score += envFiles.length > 0 ? Math.min(12, 5 + envFiles.length * 1.5) : 0;
    score += runFiles.length > 0 ? Math.min(7, 3 + runFiles.length) : 0;
    score += outputFiles.length > 0 ? Math.min(8, 4 + outputFiles.length * 0.8) : 0;
    score += Math.min(10, readmeRunSignals.length * 1.2);
    score += externalDataSignals.length > 0 && dataFiles.length === 0 ? 3 : 0;
    score += license ? 4 : 0;
    score += Math.min(5, Math.log10((repo.stargazers_count || 0) + 1) * 2);
    score += repo.archived ? -18 : 0;
    score += likelyTests > treePaths.length * 0.25 ? -8 : 0;
    score += notebooks.length === 0 && scripts.length === 0 ? -12 : 0;
    score += dataFiles.length === 0 && externalDataSignals.length === 0 ? -10 : 0;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let caseFit = 'low';
    if (score >= 70 && notebooks.length > 0 && (dataFiles.length > 0 || externalDataSignals.length > 0) && envFiles.length > 0) {
        caseFit = 'high';
    } else if (score >= 55 && notebooks.length > 0 && (dataFiles.length > 0 || externalDataSignals.length > 0)) {
        caseFit = 'medium';
    }

    const blockers = [];
    if (repo.archived) blockers.push('repository is archived');
    if (notebooks.length === 0) blockers.push('no Jupyter notebooks detected');
    if (dataFiles.length === 0 && externalDataSignals.length === 0) blockers.push('no bundled or referenced data evidence');
    if (envFiles.length === 0) blockers.push('no explicit runtime/environment file detected');
    if (!license) blockers.push('license not detected');

    return {
        score,
        caseFit,
        needsManualDataAudit: dataFiles.length === 0 || externalDataSignals.length > 0,
        blockers,
        evidence: {
            geoHits,
            notebookCount: notebooks.length,
            notebooks: shortList(notebooks, 10),
            scriptCount: scripts.length,
            scripts: shortList(scripts, 10),
            environmentFiles: envFiles,
            runFiles,
            dataDirs,
            dataFiles,
            outputFiles,
            readmeRunSignals,
            externalDataSignals,
            license: license || '',
            treeFileCount: treePaths.length,
            likelyTestPathCount: likelyTests
        }
    };
}

async function fetchReadme(owner, repo) {
    try {
        const data = await githubGet(`/repos/${owner}/${repo}/readme`);
        if (!data?.content) return '';
        return Buffer.from(data.content, data.encoding || 'base64').toString('utf8');
    } catch (error) {
        return '';
    }
}

async function fetchLicense(owner, repo) {
    try {
        const data = await githubGet(`/repos/${owner}/${repo}/license`);
        return data?.license?.spdx_id || data?.license?.name || '';
    } catch (error) {
        return '';
    }
}

async function fetchTreePaths(owner, repo, branch) {
    const encodedBranch = encodeURIComponent(branch || 'main');
    try {
        const data = await githubGet(`/repos/${owner}/${repo}/git/trees/${encodedBranch}`, { recursive: 1 });
        if (!Array.isArray(data.tree)) return [];
        return data.tree
            .filter(item => item.type === 'blob')
            .map(item => item.path)
            .filter(Boolean);
    } catch (error) {
        return [];
    }
}

async function searchRepositories(query, perPage, pages) {
    const collected = [];
    for (let page = 1; page <= pages; page += 1) {
        const data = await githubGet('/search/repositories', {
            q: `${query} archived:false`,
            sort: 'stars',
            order: 'desc',
            per_page: perPage,
            page
        });
        collected.push(...(data.items || []));
    }
    return collected;
}

function repoSummary(repo) {
    return {
        id: repo.id,
        fullName: repo.full_name,
        owner: repo.owner?.login,
        name: repo.name,
        htmlUrl: repo.html_url,
        description: repo.description || '',
        topics: repo.topics || [],
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        openIssues: repo.open_issues_count || 0,
        defaultBranch: repo.default_branch || 'main',
        language: repo.language || '',
        sizeKb: repo.size || 0,
        sizeLabel: sizeLabel((repo.size || 0) * 1024),
        archived: Boolean(repo.archived),
        pushedAt: repo.pushed_at || '',
        updatedAt: repo.updated_at || '',
        createdAt: repo.created_at || ''
    };
}

async function analyzeRepo(repo) {
    const owner = repo.owner?.login;
    const name = repo.name;
    const [readmeText, license, treePaths] = await Promise.all([
        fetchReadme(owner, name),
        fetchLicense(owner, name),
        fetchTreePaths(owner, name, repo.default_branch)
    ]);
    const scoring = scoreRepo({ repo, readmeText, treePaths, license });

    return {
        ...repoSummary(repo),
        ...scoring,
        readmeExcerpt: readmeText
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 420)
    };
}

function markdownReport({ generatedAt, args, candidates, allCandidates }) {
    const auditReady = candidates.filter(item => (
        item.caseFit !== 'low' ||
        (
            item.score >= 48 &&
            item.evidence.notebookCount > 0 &&
            (item.evidence.dataFiles.length > 0 || item.evidence.externalDataSignals.length > 0)
        )
    ));
    const lines = [];
    lines.push('# Geospatial Case Candidate Research');
    lines.push('');
    lines.push(`Generated at: ${generatedAt}`);
    lines.push('');
    lines.push('## Scope');
    lines.push('');
    lines.push('- Source searched in this run: GitHub repositories.');
    lines.push('- Screening intent: find geospatial, earth-science, environmental, hydrology, remote-sensing, climate, urban, and spatial modeling projects that may become OpenGeoLab reproducible cases.');
    lines.push('- This is an evidence-based candidate list, not final acceptance. Each high-score repo still needs manual execution/data/license audit before being added to Case Library.');
    lines.push('');
    lines.push('## Run Settings');
    lines.push('');
    lines.push(`- Search queries: ${SEARCH_QUERIES.length}`);
    lines.push(`- Per query: ${args.perQuery}`);
    lines.push(`- Pages per query: ${args.pages}`);
    lines.push(`- Repositories analyzed: ${allCandidates.length}`);
    lines.push(`- Candidates passing min score ${args.minScore}: ${candidates.length}`);
    lines.push(`- Candidates recommended for manual reproducibility audit: ${auditReady.length}`);
    lines.push('');
    lines.push('## Recommended Manual Audit Queue');
    lines.push('');
    lines.push('| Rank | Score | Fit | Repository | Stars | Evidence | Manual audit |');
    lines.push('|---:|---:|---|---|---:|---|---|');
    auditReady.slice(0, 150).forEach((item, idx) => {
        const evidence = [
            `${item.evidence.notebookCount} notebooks`,
            `${item.evidence.dataFiles.length} data files`,
            `${item.evidence.environmentFiles.length} env files`,
            `${item.evidence.outputFiles.length} outputs`
        ].join('; ');
        const audit = item.needsManualDataAudit ? 'data/download audit needed' : 'bundled data evidence';
        lines.push(`| ${idx + 1} | ${item.score} | ${item.caseFit} | [${item.fullName}](${item.htmlUrl}) | ${item.stars} | ${evidence} | ${audit} |`);
    });
    lines.push('');
    lines.push('## Top Candidate Details');
    lines.push('');
    auditReady.slice(0, 50).forEach((item, idx) => {
        lines.push(`### ${idx + 1}. ${item.fullName}`);
        lines.push('');
        lines.push(`- URL: ${item.htmlUrl}`);
        lines.push(`- Score/Fit: ${item.score} / ${item.caseFit}`);
        lines.push(`- Description: ${item.description || 'No description'}`);
        lines.push(`- Topics: ${(item.topics || []).join(', ') || 'none'}`);
        lines.push(`- License: ${item.evidence.license || 'not detected'}`);
        lines.push(`- Size: ${item.sizeLabel}; Language: ${item.language || 'unknown'}; Updated: ${item.pushedAt || item.updatedAt || 'unknown'}`);
        lines.push(`- Notebooks: ${item.evidence.notebooks.join('; ') || 'none detected'}`);
        lines.push(`- Data evidence: ${item.evidence.dataFiles.join('; ') || item.evidence.externalDataSignals.join(', ') || 'none detected'}`);
        lines.push(`- Environment evidence: ${item.evidence.environmentFiles.join('; ') || 'none detected'}`);
        lines.push(`- Output evidence: ${item.evidence.outputFiles.join('; ') || 'none detected'}`);
        if (item.blockers.length) lines.push(`- Blockers to resolve: ${item.blockers.join('; ')}`);
        lines.push('');
    });
    return `${lines.join('\n')}\n`;
}

async function main() {
    const args = parseArgs(process.argv);
    fs.mkdirSync(args.outDir, { recursive: true });

    const repoMap = new Map();
    for (const query of SEARCH_QUERIES) {
        process.stderr.write(`[search] ${query}\n`);
        try {
            const repos = await searchRepositories(query, args.perQuery, args.pages);
            for (const repo of repos) {
                if (!repoMap.has(repo.full_name)) {
                    repoMap.set(repo.full_name, repo);
                }
            }
        } catch (error) {
            process.stderr.write(`[warn] query failed: ${query}: ${error.message}\n`);
        }
        if (args.searchDelayMs) {
            await sleep(args.searchDelayMs);
        }
    }

    const repos = [...repoMap.values()]
        .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        .slice(0, args.maxRepos);

    const analyzed = [];
    for (let idx = 0; idx < repos.length; idx += 1) {
        const repo = repos[idx];
        process.stderr.write(`[analyze ${idx + 1}/${repos.length}] ${repo.full_name}\n`);
        try {
            analyzed.push(await analyzeRepo(repo));
        } catch (error) {
            process.stderr.write(`[warn] analyze failed: ${repo.full_name}: ${error.message}\n`);
        }
        if (args.analyzeDelayMs) {
            await sleep(args.analyzeDelayMs);
        }
    }

    const allCandidates = analyzed
        .sort((a, b) => b.score - a.score || b.stars - a.stars);
    const candidates = allCandidates
        .filter(item => item.score >= args.minScore)
        .sort((a, b) => {
            const fitRank = { high: 2, medium: 1, low: 0 };
            return (fitRank[b.caseFit] - fitRank[a.caseFit]) || b.score - a.score || b.stars - a.stars;
        });

    const generatedAt = new Date().toISOString();
    const result = {
        generatedAt,
        source: 'github',
        queries: SEARCH_QUERIES,
        settings: args,
        totals: {
            uniqueRepos: repoMap.size,
            analyzed: analyzed.length,
            passingMinScore: candidates.length,
            highFit: candidates.filter(item => item.caseFit === 'high').length,
            mediumFit: candidates.filter(item => item.caseFit === 'medium').length
        },
        candidates,
        allCandidates
    };

    const jsonPath = path.join(args.outDir, 'github-geospatial-candidates.json');
    const mdPath = path.join(args.outDir, 'github-geospatial-candidates.md');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
    fs.writeFileSync(mdPath, markdownReport({ generatedAt, args, candidates, allCandidates }), 'utf8');

    console.log(JSON.stringify({
        generatedAt,
        jsonPath,
        mdPath,
        totals: result.totals,
        top: candidates.slice(0, 10).map(item => ({
            score: item.score,
            fit: item.caseFit,
            repo: item.fullName,
            url: item.htmlUrl,
            notebooks: item.evidence.notebookCount,
            dataFiles: item.evidence.dataFiles.length,
            envFiles: item.evidence.environmentFiles.length
        }))
    }, null, 2));
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
}
