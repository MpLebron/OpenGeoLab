const { ObjectId } = require('mongodb');
const { getDatabase } = require('./database');

const CASES_COLLECTION = 'cases';

function getCasesCollection() {
    return getDatabase().collection(CASES_COLLECTION);
}

function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCaseIdentifierFilter(identifier) {
    const value = String(identifier || '').trim();
    const alternatives = [
        { slug: value },
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

function mapCaseSummary(doc) {
    return {
        id: String(doc._id),
        slug: doc.slug,
        title: doc.title || 'Untitled case',
        summary: doc.summary || '',
        description: doc.description || '',
        tags: Array.isArray(doc.tags) ? doc.tags.filter(Boolean) : [],
        domain: doc.domain || '',
        coverImageUrl: doc.coverImageUrl || '',
        authors: Array.isArray(doc.authors) ? doc.authors.filter(Boolean) : [],
        authorLine: doc.authorLine || '',
        publishedAt: doc.publishedAt || null,
        timeLabel: doc.timeLabel || '',
        notebookCount: Number(doc.notebookCount) || 0,
        fileCount: Number(doc.fileCount) || 0,
        runtimeImageId: doc.runtimeImageId || 'geomodel-jupyter',
        coreNotebook: doc.coreNotebook || '',
        source: doc.source || 'local',
        sourceId: doc.sourceId || '',
        updatedAt: doc.updatedAt || null
    };
}

function mapCaseDetail(doc) {
    return {
        ...mapCaseSummary(doc),
        steps: Array.isArray(doc.steps) ? doc.steps.filter(Boolean) : [],
        datasets: Array.isArray(doc.datasets) ? doc.datasets.filter(Boolean) : [],
        expectedResults: Array.isArray(doc.expectedResults) ? doc.expectedResults.filter(Boolean) : [],
        content: doc.content || '',
        status: doc.status || 'published'
    };
}

async function listCases({ page = 1, limit = 24, query = '', domain = '' } = {}) {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 120);
    const filter = { visible: { $ne: false } };

    const normalizedQuery = String(query || '').trim();
    if (normalizedQuery) {
        const regex = new RegExp(escapeRegex(normalizedQuery), 'i');
        filter.$or = [
            { title: regex },
            { summary: regex },
            { description: regex },
            { tags: regex },
            { domain: regex },
            { authorLine: regex }
        ];
    }

    const normalizedDomain = String(domain || '').trim();
    if (normalizedDomain) {
        filter.domain = normalizedDomain;
    }

    const skip = (safePage - 1) * safeLimit;
    const collection = getCasesCollection();

    const [total, cases] = await Promise.all([
        collection.countDocuments(filter),
        collection
            .find(filter)
            .sort({ order: 1, publishedAt: -1, updatedAt: -1, title: 1 })
            .skip(skip)
            .limit(safeLimit)
            .toArray()
    ]);

    return {
        total,
        page: safePage,
        limit: safeLimit,
        data: cases.map(mapCaseSummary)
    };
}

async function getCaseByIdentifier(identifier) {
    const doc = await getCasesCollection().findOne(buildCaseIdentifierFilter(identifier));
    return doc ? mapCaseDetail(doc) : null;
}

async function getCaseDocumentByIdentifier(identifier) {
    return getCasesCollection().findOne(buildCaseIdentifierFilter(identifier));
}

async function upsertCaseRecords({ cases, source, sourceIds, syncedAt }) {
    const collection = getCasesCollection();

    if (cases.length > 0) {
        await collection.bulkWrite(cases.map(item => ({
            updateOne: {
                filter: { source: item.source, sourceId: item.sourceId },
                update: {
                    $set: item,
                    $setOnInsert: { localCreatedAt: syncedAt }
                },
                upsert: true
            }
        })));
    }

    if (source && Array.isArray(sourceIds) && sourceIds.length > 0) {
        await collection.updateMany(
            { source, sourceId: { $nin: sourceIds } },
            { $set: { visible: false, hiddenAt: syncedAt } }
        );
    }
}

module.exports = {
    CASES_COLLECTION,
    getCaseByIdentifier,
    getCaseDocumentByIdentifier,
    getCasesCollection,
    listCases,
    mapCaseDetail,
    mapCaseSummary,
    upsertCaseRecords
};
