const {
    toOgmsModelDetail,
    toOgmsModelSummary
} = require('../utils/ogmsModelCatalog');

const OGMS_MODELS_COLLECTION = 'ogms_models';
const OGMS_MODEL_SYNC_RUNS_COLLECTION = 'ogms_model_sync_runs';

function getOgmsModelsCollection(db) {
    return db.collection(OGMS_MODELS_COLLECTION);
}

function getOgmsModelSyncRunsCollection(db) {
    return db.collection(OGMS_MODEL_SYNC_RUNS_COLLECTION);
}

async function countOgmsModels(db) {
    return getOgmsModelsCollection(db).countDocuments({ source: 'opengms' });
}

async function countCompletedOgmsModelSyncRuns(db) {
    return getOgmsModelSyncRunsCollection(db).countDocuments({
        source: 'opengms',
        status: { $in: ['success', 'partial'] }
    });
}

async function listOgmsModels(db, options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 20);
    const query = buildOgmsModelQuery(options);
    const collection = getOgmsModelsCollection(db);
    const total = await collection.countDocuments(query);
    const data = await collection
        .find(query)
        .sort({ lastModifyTime: -1, viewCount: -1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

    return {
        source: 'db',
        total,
        page,
        limit,
        data: data.map(toOgmsModelSummary)
    };
}

async function getOgmsModelFacets(db, options = {}) {
    const query = buildOgmsModelQuery({
        ...options,
        domain: 'all'
    });
    const docs = await getOgmsModelsCollection(db).find(query).toArray();
    const counts = new Map();

    docs.forEach(doc => {
        (Array.isArray(doc.tags) ? doc.tags : []).forEach(tag => {
            const label = String(tag || '').trim();
            if (!label) return;
            counts.set(label, (counts.get(label) || 0) + 1);
        });
    });

    const domains = Array.from(counts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

    return {
        total: docs.length,
        domains: domains.slice(0, 8)
    };
}

async function findOgmsModelDetail(db, identifier) {
    const needle = cleanString(identifier);
    if (!needle) return null;

    const exact = new RegExp(`^${escapeRegExp(needle)}$`, 'i');
    const doc = await getOgmsModelsCollection(db).findOne({
        $and: [
            { source: 'opengms' },
            {
                $or: [
                    { sourceId: needle },
                    { id: needle },
                    { model_id: needle },
                    { md5: needle },
                    { name: exact },
                    { displayName: exact },
                    { display_name: exact }
                ]
            }
        ]
    });

    return doc ? toOgmsModelDetail(doc) : null;
}

async function findOgmsModelRaw(db, item = {}) {
    const sourceId = cleanString(item.sourceId || item.id);
    const md5 = cleanString(item.md5);
    const clauses = [];

    if (sourceId) clauses.push({ sourceId });
    if (md5) clauses.push({ md5 });
    if (clauses.length === 0) return null;

    return getOgmsModelsCollection(db).findOne({
        $and: [
            { source: 'opengms' },
            { $or: clauses }
        ]
    });
}

async function upsertOgmsModel(db, doc) {
    const filter = doc.sourceId
        ? { source: 'opengms', sourceId: doc.sourceId }
        : { source: 'opengms', md5: doc.md5 };

    return getOgmsModelsCollection(db).updateOne(
        filter,
        { $set: doc },
        { upsert: true }
    );
}

async function recordOgmsModelSyncRun(db, run) {
    return getOgmsModelSyncRunsCollection(db).insertOne(run);
}

function buildOgmsModelQuery(options = {}) {
    const search = cleanString(options.query || options.search);
    const domain = cleanString(options.domain || 'all');
    const online = Boolean(options.online);
    const publicOnly = Boolean(options.publicOnly);
    const institutionalOnly = Boolean(options.institutionalOnly);
    const registryFilter = options.registryFilter || null;
    const and = [{ source: 'opengms' }];

    if (registryFilter) {
        const registryClauses = [];
        if (Array.isArray(registryFilter.ids) && registryFilter.ids.length > 0) {
            registryClauses.push(
                { sourceId: { $in: registryFilter.ids } },
                { id: { $in: registryFilter.ids } },
                { model_id: { $in: registryFilter.ids } }
            );
        }
        if (Array.isArray(registryFilter.md5s) && registryFilter.md5s.length > 0) {
            registryClauses.push({ md5: { $in: registryFilter.md5s } });
        }
        if (Array.isArray(registryFilter.names) && registryFilter.names.length > 0) {
            registryClauses.push({ name: { $in: registryFilter.names } });
        }
        if (Array.isArray(registryFilter.displayNames) && registryFilter.displayNames.length > 0) {
            registryClauses.push(
                { displayName: { $in: registryFilter.displayNames } },
                { display_name: { $in: registryFilter.displayNames } }
            );
        }
        if (registryClauses.length > 0) {
            and.push({ $or: registryClauses });
        }
    }

    if (search) {
        const pattern = new RegExp(escapeRegExp(search), 'i');
        and.push({
            $or: [
                { name: pattern },
                { displayName: pattern },
                { display_name: pattern },
                { description: pattern },
                { author: pattern },
                { md5: pattern },
                { sourceId: pattern },
                { tags: pattern }
            ]
        });
    }

    if (domain && domain !== 'all') {
        and.push({ tags: domain });
    }

    if (online) {
        and.push({ online: true });
    }

    if (publicOnly) {
        and.push({
            $or: [
                { status: /public/i },
                { status: /catalog/i }
            ]
        });
    }

    if (institutionalOnly) {
        and.push({
            $or: [
                { status: /institutional/i },
                { status: /private/i }
            ]
        });
    }

    return and.length === 1 ? and[0] : { $and: and };
}

function cleanString(value) {
    return String(value || '').trim();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    OGMS_MODELS_COLLECTION,
    OGMS_MODEL_SYNC_RUNS_COLLECTION,
    buildOgmsModelQuery,
    countCompletedOgmsModelSyncRuns,
    countOgmsModels,
    findOgmsModelDetail,
    findOgmsModelRaw,
    getOgmsModelFacets,
    getOgmsModelsCollection,
    listOgmsModels,
    recordOgmsModelSyncRun,
    upsertOgmsModel
};
