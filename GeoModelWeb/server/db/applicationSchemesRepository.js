const { ObjectId } = require('mongodb');
const { getDatabase } = require('./database');

const SCHEMES_COLLECTION = 'application_schemes';
const DETAILS_COLLECTION = 'application_scheme_details';

function getApplicationSchemesCollection() {
    return getDatabase().collection(SCHEMES_COLLECTION);
}

function getApplicationSchemeDetailsCollection() {
    return getDatabase().collection(DETAILS_COLLECTION);
}

function buildIdentifierFilter(identifier) {
    const value = String(identifier || '').trim();
    const alternatives = [
        { id: value },
        { sourceId: value }
    ];

    if (ObjectId.isValid(value)) {
        alternatives.push({ _id: new ObjectId(value) });
    }

    return {
        visible: { $ne: false },
        $or: alternatives
    };
}

function normalizeLinks(links = {}) {
    return {
        code: links.code || '',
        demo: links.demo || '',
        paper: links.paper || '',
        video: links.video || ''
    };
}

function mapApplicationSchemeSummaryResponse(doc) {
    return {
        id: doc.id || doc.sourceId || String(doc._id),
        title: doc.title || 'Untitled application',
        description: doc.description || '',
        tags: Array.isArray(doc.tags) ? doc.tags.filter(Boolean) : [],
        category: doc.category || '',
        author: doc.author || '',
        time: doc.time || '',
        createdAt: doc.sourceCreatedAt || doc.createdAt || null,
        updatedAt: doc.sourceUpdatedAt || doc.updatedAt || null,
        coverImageUrl: doc.coverImageUrl || '',
        links: normalizeLinks(doc.links),
        sourceId: doc.sourceId || '',
        detailSyncedAt: doc.detailSyncedAt || null
    };
}

function mapApplicationSchemeDetailResponse(summaryDoc, detailDoc = {}) {
    const summary = mapApplicationSchemeSummaryResponse(summaryDoc);

    return {
        ...summary,
        content: detailDoc.content || summaryDoc.content || '',
        detailSyncStatus: detailDoc.detailSyncStatus || summaryDoc.detailSyncStatus || 'unknown',
        syncedAt: detailDoc.syncedAt || summaryDoc.syncedAt || null,
        source: summaryDoc.source || 'opengmp'
    };
}

async function listApplicationSchemes({ page = 1, limit = 20 } = {}) {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const filter = { visible: { $ne: false } };
    const skip = (safePage - 1) * safeLimit;
    const collection = getApplicationSchemesCollection();

    const [total, schemes] = await Promise.all([
        collection.countDocuments(filter),
        collection
            .find(filter)
            .sort({ sortDate: -1, sourceCreatedAt: -1, title: 1 })
            .skip(skip)
            .limit(safeLimit)
            .toArray()
    ]);

    return {
        total,
        page: safePage,
        limit: safeLimit,
        data: schemes.map(mapApplicationSchemeSummaryResponse)
    };
}

async function getApplicationSchemeDetail(identifier) {
    const summaryDoc = await getApplicationSchemesCollection().findOne(buildIdentifierFilter(identifier));

    if (!summaryDoc) {
        return null;
    }

    const detailDoc = await getApplicationSchemeDetailsCollection().findOne({
        source: summaryDoc.source || 'opengmp',
        sourceId: summaryDoc.sourceId,
        visible: { $ne: false }
    });

    return mapApplicationSchemeDetailResponse(summaryDoc, detailDoc || {});
}

async function upsertApplicationSchemeRecords({ summaries, details, sourceIds, syncedAt }) {
    const schemesCollection = getApplicationSchemesCollection();
    const detailsCollection = getApplicationSchemeDetailsCollection();

    if (summaries.length > 0) {
        await schemesCollection.bulkWrite(summaries.map(summary => ({
            updateOne: {
                filter: { source: summary.source, sourceId: summary.sourceId },
                update: {
                    $set: summary,
                    $unset: { content: '', rawContent: '' },
                    $setOnInsert: { localCreatedAt: syncedAt }
                },
                upsert: true
            }
        })));
    }

    if (details.length > 0) {
        await detailsCollection.bulkWrite(details.map(detail => ({
            updateOne: {
                filter: { source: detail.source, sourceId: detail.sourceId },
                update: {
                    $set: detail,
                    $setOnInsert: { localCreatedAt: syncedAt }
                },
                upsert: true
            }
        })));
    }

    if (sourceIds.length > 0) {
        await Promise.all([
            schemesCollection.updateMany(
                { source: 'opengmp', sourceId: { $nin: sourceIds } },
                { $set: { visible: false, hiddenAt: syncedAt } }
            ),
            detailsCollection.updateMany(
                { source: 'opengmp', sourceId: { $nin: sourceIds } },
                { $set: { visible: false, hiddenAt: syncedAt } }
            )
        ]);
    }
}

module.exports = {
    DETAILS_COLLECTION,
    SCHEMES_COLLECTION,
    getApplicationSchemeDetail,
    getApplicationSchemeDetailsCollection,
    getApplicationSchemesCollection,
    listApplicationSchemes,
    mapApplicationSchemeSummaryResponse,
    upsertApplicationSchemeRecords
};
