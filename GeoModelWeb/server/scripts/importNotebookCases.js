require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const axios = require('axios');
const { initDatabase, closeDatabase } = require('../db/database');
const { getCaseDirectory, getCaseProjectDirectory } = require('../config/cases');
const { upsertCaseRecords } = require('../db/casesRepository');

const SOURCE = 'opengmp-notebook';
const OPENGMP_NODE_HOST = 'https://geomodeling.njnu.edu.cn/OpenGMPNodeBack';
const OPENGMP_JUPYTER_HOST = 'https://geomodeling.njnu.edu.cn/OpenGMPJupyter';
const PAGE_SIZE = 20;
const DEFAULT_IMPORT_LIMIT = 24;

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map(item => normalizeText(item)).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(/,|;|\r?\n/g).map(item => item.trim()).filter(Boolean);
    }
    return [];
}

function slugify(title, sourceId) {
    const stem = String(title || '')
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const suffix = String(sourceId || '').slice(-6) || 'case';
    return `${stem || 'case'}-${suffix}`.slice(0, 72);
}

function normalizeRemoteCoverUrl(coverUrl) {
    const rawValue = normalizeText(coverUrl);
    if (!rawValue) {
        return '';
    }

    try {
        const parsed = new URL(rawValue, OPENGMP_NODE_HOST);
        if (parsed.pathname.startsWith('/store/')) {
            return `${OPENGMP_NODE_HOST}${parsed.pathname}`;
        }
        return parsed.toString();
    } catch (error) {
        if (rawValue.startsWith('/store/')) {
            return `${OPENGMP_NODE_HOST}${rawValue}`;
        }
        return rawValue;
    }
}

function buildNotebookUrl(filename) {
    return `${OPENGMP_JUPYTER_HOST}/files/${encodeURIComponent(filename)}`;
}

function buildCoverFilename(remoteCoverUrl) {
    try {
        const pathname = new URL(remoteCoverUrl).pathname;
        const extension = path.extname(pathname) || '.png';
        return `cover${extension}`;
    } catch (error) {
        return 'cover.png';
    }
}

async function downloadFile(url, targetPath) {
    const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 30000,
        validateStatus: status => status >= 200 && status < 400
    });
    await pipeline(response.data, fs.createWriteStream(targetPath));
}

async function fetchNotebookPage(page) {
    const response = await axios.get(`${OPENGMP_NODE_HOST}/api/notebook/getNotebook`, {
        params: {
            page,
            limit: PAGE_SIZE
        },
        timeout: 30000
    });

    return response.data || {};
}

async function fetchNotebookSummaries(limit) {
    const summaries = [];
    let page = 1;

    while (summaries.length < limit) {
        const payload = await fetchNotebookPage(page);
        const notebooks = Array.isArray(payload.notebooks) ? payload.notebooks : [];
        if (!notebooks.length) {
            break;
        }

        summaries.push(...notebooks);
        if (notebooks.length < PAGE_SIZE) {
            break;
        }
        page += 1;
    }

    return summaries.slice(0, limit);
}

async function fetchNotebookDetail(sourceId) {
    const response = await axios.get(`${OPENGMP_NODE_HOST}/api/notebook/getNotebookById`, {
        params: { id: sourceId },
        timeout: 30000
    });

    return response.data?.notebook || null;
}

function createGenericSteps(notebookName) {
    return [
        'Fork this case into your own workspace.',
        'Start the Jupyter runtime for the forked project.',
        `Open ${notebookName || 'the notebook'} and run the cells from top to bottom.`
    ];
}

function createGenericResults() {
    return [
        'The notebook should open inside your personal Jupyter project.',
        'Outputs and intermediate files remain isolated inside your forked workspace.'
    ];
}

async function importCase(detail, order, syncedAt) {
    const sourceId = normalizeText(detail._id);
    const slug = slugify(detail.title, sourceId);
    const caseDir = getCaseDirectory(slug);
    const projectDir = getCaseProjectDirectory(slug);

    fs.mkdirSync(projectDir, { recursive: true });

    const notebookFileName = normalizeText(detail.notebookFileURL);
    if (!notebookFileName) {
        throw new Error(`Notebook file is missing for ${sourceId}`);
    }

    const notebookTargetPath = path.join(projectDir, notebookFileName);
    if (!fs.existsSync(notebookTargetPath)) {
        await downloadFile(buildNotebookUrl(notebookFileName), notebookTargetPath);
    }

    let coverImageUrl = '';
    const remoteCoverUrl = normalizeRemoteCoverUrl(detail.coverImgURL);
    if (remoteCoverUrl) {
        const coverFilename = buildCoverFilename(remoteCoverUrl);
        const coverTargetPath = path.join(caseDir, coverFilename);
        if (!fs.existsSync(coverTargetPath)) {
            try {
                await downloadFile(remoteCoverUrl, coverTargetPath);
            } catch (error) {
                console.warn(`[Cases] Failed to download cover for ${sourceId}: ${error.message}`);
            }
        }
        if (fs.existsSync(coverTargetPath)) {
            coverImageUrl = `/api/case-assets/${slug}/${coverFilename}`;
        }
    }

    const tags = normalizeList(detail.tags).slice(0, 8);
    const publishedAt = normalizeDate(detail.updatedAt) || normalizeDate(detail.createdAt) || syncedAt;
    const authorLine = normalizeText(detail.author);
    const authors = authorLine ? [authorLine] : [];

    const manifest = {
        source: SOURCE,
        sourceId,
        slug,
        title: normalizeText(detail.title) || 'Untitled case',
        importedAt: syncedAt.toISOString(),
        notebookFileName
    };
    fs.writeFileSync(path.join(caseDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    return {
        source: SOURCE,
        sourceId,
        slug,
        title: normalizeText(detail.title) || 'Untitled case',
        summary: normalizeText(detail.description),
        description: normalizeText(detail.description),
        tags,
        domain: normalizeText(detail.category),
        authors,
        authorLine,
        publishedAt,
        timeLabel: normalizeText(detail.time),
        coverImageUrl,
        runtimeImageId: 'geomodel-jupyter',
        coreNotebook: notebookFileName,
        notebookCount: 1,
        fileCount: 1,
        steps: createGenericSteps(notebookFileName),
        datasets: [],
        expectedResults: createGenericResults(),
        content: '',
        order,
        visible: true,
        status: 'published',
        updatedAt: publishedAt,
        syncedAt
    };
}

async function importNotebookCases(limit) {
    const syncedAt = new Date();
    const summaries = await fetchNotebookSummaries(limit);

    if (!summaries.length) {
        console.log('No remote notebooks were returned.');
        return;
    }

    const caseRecords = [];
    const sourceIds = [];

    for (let index = 0; index < summaries.length; index += 1) {
        const sourceId = normalizeText(summaries[index]._id);
        if (!sourceId) {
            continue;
        }

        const detail = (await fetchNotebookDetail(sourceId)) || summaries[index];
        const record = await importCase(detail, index + 1, syncedAt);
        caseRecords.push(record);
        sourceIds.push(sourceId);
        console.log(`Imported case ${record.slug}: ${record.title}`);
    }

    await upsertCaseRecords({
        cases: caseRecords,
        source: SOURCE,
        sourceIds,
        syncedAt
    });

    console.log(`Imported ${caseRecords.length} notebook cases into local MongoDB.`);
}

async function main() {
    const rawLimit = process.argv.find(arg => arg.startsWith('--limit=')) || '';
    const limit = Math.max(parseInt(rawLimit.split('=')[1], 10) || DEFAULT_IMPORT_LIMIT, 1);

    try {
        await initDatabase();
        await importNotebookCases(limit);
    } finally {
        await closeDatabase();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
