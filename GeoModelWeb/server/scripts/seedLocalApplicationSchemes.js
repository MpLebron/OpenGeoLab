require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { APPLICATION_COVER_DIR } = require('../config/applicationSchemes');
const { initDatabase, closeDatabase } = require('../db/database');
const {
    getApplicationSchemeDetailsCollection,
    getApplicationSchemesCollection
} = require('../db/applicationSchemesRepository');

const SEED_DIR = path.join(__dirname, '..', 'application-seeds');
const DEFAULT_SOURCE = 'local';

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeTags(value) {
    return Array.isArray(value)
        ? value.map(item => normalizeText(item)).filter(Boolean)
        : [];
}

function normalizeLinks(links = {}) {
    return {
        code: normalizeText(links.code),
        demo: normalizeText(links.demo),
        case: normalizeText(links.case),
        paper: normalizeText(links.paper),
        video: normalizeText(links.video)
    };
}

function toDate(value, fallback = null) {
    if (!value) return fallback;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date;
}

function loadSeedFiles(seedDir = SEED_DIR) {
    if (!fs.existsSync(seedDir)) {
        return [];
    }

    return fs.readdirSync(seedDir)
        .filter(filename => filename.endsWith('.json'))
        .sort()
        .map(filename => {
            const filePath = path.join(seedDir, filename);
            return {
                filePath,
                data: JSON.parse(fs.readFileSync(filePath, 'utf8'))
            };
        });
}

function copyApplicationAsset(assetPath, seedFilePath) {
    const normalizedAssetPath = normalizeText(assetPath);
    if (!normalizedAssetPath) {
        return '';
    }

    const sourcePath = path.resolve(path.dirname(seedFilePath), normalizedAssetPath);
    const filename = path.basename(normalizedAssetPath);
    const destinationPath = path.join(APPLICATION_COVER_DIR, filename);

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Application asset not found: ${sourcePath}`);
    }

    fs.mkdirSync(APPLICATION_COVER_DIR, { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);

    return `/api/application-covers/${filename}`;
}

function copyCoverAsset(seed, seedFilePath) {
    return copyApplicationAsset(seed.coverAsset, seedFilePath);
}

function copyExtraAssets(seed, seedFilePath) {
    if (!Array.isArray(seed.extraAssets)) {
        return [];
    }

    return seed.extraAssets
        .map(assetPath => copyApplicationAsset(assetPath, seedFilePath))
        .filter(Boolean);
}

function buildApplicationSeedRecords(seed, syncedAt = new Date()) {
    const source = normalizeText(seed.source) || DEFAULT_SOURCE;
    const sourceId = normalizeText(seed.sourceId || seed.id);

    if (!sourceId) {
        throw new Error('Application seed is missing sourceId.');
    }

    const id = normalizeText(seed.id) || sourceId;
    const sourceCreatedAt = toDate(seed.createdAt, syncedAt);
    const sourceUpdatedAt = toDate(seed.updatedAt, sourceCreatedAt);
    const sortDate = toDate(seed.sortDate, sourceUpdatedAt);
    const links = normalizeLinks(seed.links);

    const summary = {
        source,
        sourceId,
        id,
        title: normalizeText(seed.title) || 'Untitled application',
        description: normalizeText(seed.description),
        tags: normalizeTags(seed.tags),
        category: normalizeText(seed.category),
        author: normalizeText(seed.author),
        time: normalizeText(seed.time),
        coverImageUrl: normalizeText(seed.coverImageUrl),
        links,
        sourceCreatedAt,
        sourceUpdatedAt,
        sortDate,
        syncedAt,
        detailSyncedAt: syncedAt,
        detailSyncStatus: 'seeded',
        visible: seed.visible !== false
    };

    const detail = {
        source,
        sourceId,
        id,
        content: normalizeText(seed.content),
        rawContent: normalizeText(seed.content),
        detailSyncStatus: 'seeded',
        sourceCreatedAt,
        sourceUpdatedAt,
        syncedAt,
        visible: seed.visible !== false
    };

    return { summary, detail };
}

async function seedLocalApplicationSchemes({ seedDir = SEED_DIR } = {}) {
    const syncedAt = new Date();
    const seeds = loadSeedFiles(seedDir);

    if (!seeds.length) {
        console.log(`No local application seeds found in ${seedDir}`);
        return { count: 0 };
    }

    const records = seeds.map(({ filePath, data }) => {
        const record = buildApplicationSeedRecords(data, syncedAt);
        const copiedCoverUrl = copyCoverAsset(data, filePath);
        if (copiedCoverUrl) {
            record.summary.coverImageUrl = copiedCoverUrl;
        }
        copyExtraAssets(data, filePath);
        return { filePath, ...record };
    });

    const schemesCollection = getApplicationSchemesCollection();
    const detailsCollection = getApplicationSchemeDetailsCollection();

    await Promise.all([
        schemesCollection.bulkWrite(records.map(({ summary }) => ({
            updateOne: {
                filter: { source: summary.source, sourceId: summary.sourceId },
                update: {
                    $set: summary,
                    $setOnInsert: { localCreatedAt: syncedAt }
                },
                upsert: true
            }
        }))),
        detailsCollection.bulkWrite(records.map(({ detail }) => ({
            updateOne: {
                filter: { source: detail.source, sourceId: detail.sourceId },
                update: {
                    $set: detail,
                    $setOnInsert: { localCreatedAt: syncedAt }
                },
                upsert: true
            }
        })))
    ]);

    records.forEach(({ summary, filePath }) => {
        console.log(`Seeded ${summary.source}/${summary.sourceId}: ${summary.title} (${filePath})`);
    });

    return { count: records.length };
}

async function main() {
    try {
        await initDatabase();
        const result = await seedLocalApplicationSchemes();
        console.log(`Seeded ${result.count} local application scheme(s).`);
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('[seedLocalApplicationSchemes] Failed:', error);
        process.exitCode = 1;
    });
}

module.exports = {
    buildApplicationSeedRecords,
    copyApplicationAsset,
    copyCoverAsset,
    copyExtraAssets,
    loadSeedFiles,
    seedLocalApplicationSchemes
};
