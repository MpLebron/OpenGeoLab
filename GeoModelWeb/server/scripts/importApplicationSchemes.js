require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const axios = require('axios');
const { initDatabase, closeDatabase } = require('../db/database');
const { APPLICATION_COVER_DIR } = require('../config/applicationSchemes');
const { upsertApplicationSchemeRecords } = require('../db/applicationSchemesRepository');

const SOURCE = 'opengmp';
const OPENGMP_NODE_HOST = 'https://geomodeling.njnu.edu.cn/OpenGMPNodeBack';
const PAGE_SIZE = 20;

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeTags(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => normalizeText(item))
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
    }

    return [];
}

function toDate(value) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function resolveSortDate(record, fallbackDate) {
    return (
        toDate(record.updatedAt) ||
        toDate(record.createdAt) ||
        toDate(record.time) ||
        fallbackDate
    );
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

function findExistingLocalCover(sourceId) {
    if (!fs.existsSync(APPLICATION_COVER_DIR)) {
        return '';
    }

    const prefix = `${sourceId}-`;
    const match = fs.readdirSync(APPLICATION_COVER_DIR).find(filename => filename.startsWith(prefix));
    return match ? `/api/application-covers/${match}` : '';
}

function buildCoverFilename(sourceId, remoteCoverUrl) {
    try {
        const pathname = new URL(remoteCoverUrl).pathname;
        const extension = path.extname(pathname) || '.png';
        const stem = path.basename(pathname, extension).slice(-12) || 'cover';
        return `${sourceId}-${stem}${extension}`;
    } catch (error) {
        return `${sourceId}-cover.png`;
    }
}

async function downloadCover(remoteCoverUrl, sourceId) {
    const existingCover = findExistingLocalCover(sourceId);
    if (existingCover) {
        return existingCover;
    }

    const normalizedUrl = normalizeRemoteCoverUrl(remoteCoverUrl);
    if (!normalizedUrl) {
        return '';
    }

    fs.mkdirSync(APPLICATION_COVER_DIR, { recursive: true });

    const filename = buildCoverFilename(sourceId, normalizedUrl);
    const absolutePath = path.join(APPLICATION_COVER_DIR, filename);

    if (!fs.existsSync(absolutePath)) {
        const response = await axios.get(normalizedUrl, {
            responseType: 'stream',
            timeout: 30000
        });

        await pipeline(response.data, fs.createWriteStream(absolutePath));
    }

    return `/api/application-covers/${filename}`;
}

async function fetchSchemePage(page) {
    const response = await axios.get(`${OPENGMP_NODE_HOST}/api/scheme/getSchemes`, {
        params: {
            page,
            limit: PAGE_SIZE
        },
        timeout: 30000
    });

    return response.data || {};
}

async function fetchAllSchemeSummaries() {
    const firstPage = await fetchSchemePage(1);
    const total = Math.max(Number(firstPage.total) || 0, 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const summaries = Array.isArray(firstPage.schemes) ? [...firstPage.schemes] : [];

    for (let page = 2; page <= totalPages; page += 1) {
        const payload = await fetchSchemePage(page);
        if (Array.isArray(payload.schemes)) {
            summaries.push(...payload.schemes);
        }
    }

    return summaries;
}

async function fetchSchemeDetail(sourceId) {
    const response = await axios.get(`${OPENGMP_NODE_HOST}/api/scheme/getSchemeById`, {
        params: { id: sourceId },
        timeout: 30000
    });

    return response.data?.scheme || null;
}

function buildSummaryRecord(detail, localCoverUrl, syncedAt) {
    const sourceId = normalizeText(detail._id);
    const createdAt = toDate(detail.createdAt);
    const updatedAt = toDate(detail.updatedAt);
    const sortDate = resolveSortDate(detail, syncedAt);

    return {
        source: SOURCE,
        sourceId,
        id: sourceId,
        title: normalizeText(detail.title) || 'Untitled application',
        description: normalizeText(detail.description),
        tags: normalizeTags(detail.tags),
        category: normalizeText(detail.category),
        author: normalizeText(detail.author),
        time: normalizeText(detail.time),
        coverImageUrl: localCoverUrl,
        links: {
            code: normalizeText(detail.codeLink),
            demo: normalizeText(detail.demoLink),
            paper: normalizeText(detail.paperLink),
            video: normalizeText(detail.videoLink)
        },
        sourceCreatedAt: createdAt,
        sourceUpdatedAt: updatedAt,
        sortDate,
        syncedAt,
        detailSyncedAt: syncedAt,
        detailSyncStatus: 'synced',
        visible: true
    };
}

function buildDetailRecord(detail, syncedAt) {
    const sourceId = normalizeText(detail._id);

    return {
        source: SOURCE,
        sourceId,
        id: sourceId,
        content: normalizeText(detail.content),
        rawContent: normalizeText(detail.content),
        detailSyncStatus: 'synced',
        sourceCreatedAt: toDate(detail.createdAt),
        sourceUpdatedAt: toDate(detail.updatedAt),
        syncedAt,
        visible: true
    };
}

async function importApplicationSchemes() {
    const syncedAt = new Date();
    const summaries = await fetchAllSchemeSummaries();

    if (!summaries.length) {
        console.log('No remote application schemes were returned.');
        return;
    }

    const summaryRecords = [];
    const detailRecords = [];
    const sourceIds = [];

    for (const summary of summaries) {
        const sourceId = normalizeText(summary._id);
        if (!sourceId) {
            continue;
        }

        const detail = (await fetchSchemeDetail(sourceId)) || summary;
        const localCoverUrl = await downloadCover(detail.coverImgURL || summary.coverImgURL, sourceId);

        summaryRecords.push(buildSummaryRecord(detail, localCoverUrl, syncedAt));
        detailRecords.push(buildDetailRecord(detail, syncedAt));
        sourceIds.push(sourceId);

        console.log(`Imported ${sourceId}: ${normalizeText(detail.title)}`);
    }

    await upsertApplicationSchemeRecords({
        summaries: summaryRecords,
        details: detailRecords,
        sourceIds,
        syncedAt
    });

    console.log(`Imported ${summaryRecords.length} application schemes into local MongoDB.`);
}

async function main() {
    try {
        await initDatabase();
        await importApplicationSchemes();
    } finally {
        await closeDatabase();
    }
}

main().catch(error => {
    console.error('Failed to import local application schemes:', error);
    process.exit(1);
});
