const {
    findOgmsModelRaw,
    recordOgmsModelSyncRun,
    upsertOgmsModel
} = require('../db/ogmsModelsRepository');
const {
    normalizeOgmsModelDocument,
    parseOgmsXmlMdlToJSON
} = require('../utils/ogmsModelCatalog');

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_DETAIL_CONCURRENCY = 12;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SHANGHAI_THREE_AM_UTC_HOUR = 19;

let schedulerState = {
    started: false,
    timer: null,
    clearTimeoutFn: null
};

function createOgmsModelSyncService({
    db,
    httpClient,
    deployedModelUrl,
    pageSize = DEFAULT_PAGE_SIZE,
    detailConcurrency = DEFAULT_DETAIL_CONCURRENCY,
    now = () => new Date(),
    logger = console
}) {
    if (!db) {
        throw new Error('MongoDB database is required for OGMS model sync');
    }
    if (!httpClient) {
        throw new Error('HTTP client is required for OGMS model sync');
    }
    if (!deployedModelUrl) {
        throw new Error('OpenGMS deployed model URL is required for OGMS model sync');
    }

    async function fetchDeployedModelPage(page) {
        const response = await httpClient.post(
            deployedModelUrl,
            {
                asc: false,
                page,
                pageSize,
                searchText: '',
                sortField: 'viewCount'
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const payload = response.data?.data || {};
        return {
            total: Number(payload.total) || 0,
            content: Array.isArray(payload.content) ? payload.content : []
        };
    }

    async function fetchAllDeployedModels() {
        const firstPage = await fetchDeployedModelPage(1);
        const totalPages = Math.max(1, Math.ceil(firstPage.total / pageSize));
        const items = [...firstPage.content];

        for (let page = 2; page <= totalPages; page += 1) {
            const payload = await fetchDeployedModelPage(page);
            items.push(...payload.content);
        }

        return {
            total: firstPage.total || items.length,
            items
        };
    }

    async function fetchModelDetailByMd5(md5) {
        const response = await httpClient.get(`/computableModel/ModelInfoAndClassifications_pid/${encodeURIComponent(md5)}`);
        const detail = response.data?.data;
        if (!detail) {
            throw new Error(`OpenGMS model detail not found for md5 ${md5}`);
        }
        return detail;
    }

    async function syncOneModel(listItem, syncedAt) {
        const md5 = cleanString(listItem.md5);
        if (!md5) {
            throw new Error(`Model ${listItem.name || listItem.id || 'unknown'} has no md5`);
        }

        const existing = await findOgmsModelRaw(db, listItem);
        if (!shouldRefreshOgmsModel(existing, listItem)) {
            return { skipped: true };
        }

        const detail = await fetchModelDetailByMd5(md5);
        let mdlJson = { inputs: [] };
        let parseError = null;

        if (typeof detail.mdl === 'string' && detail.mdl.trim()) {
            try {
                mdlJson = await parseOgmsXmlMdlToJSON(detail.mdl);
            } catch (error) {
                parseError = error;
                logger.warn(`Failed to parse OGMS model MDL for ${detail.name || listItem.name}: ${error.message}`);
            }
        } else if (detail.mdl && typeof detail.mdl === 'object') {
            mdlJson = detail.mdl.inputs ? detail.mdl : { inputs: [] };
        }

        const doc = normalizeOgmsModelDocument({
            listItem,
            detail,
            mdlJson,
            parseError,
            syncedAt
        });
        await upsertOgmsModel(db, doc);
        return { skipped: false, parseError };
    }

    async function syncOgmsModels({ reason = 'daily' } = {}) {
        const startedAt = now().toISOString();
        const errors = [];
        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;
        let total = 0;

        logger.info(`[OGMS model sync] Starting ${reason} sync`);

        try {
            const { total: remoteTotal, items } = await fetchAllDeployedModels();
            total = remoteTotal || items.length;

            await mapInBatches(items, detailConcurrency, async item => {
                try {
                    const result = await syncOneModel(item, now().toISOString());
                    if (result.skipped) {
                        skippedCount += 1;
                    } else {
                        successCount += 1;
                    }
                } catch (error) {
                    failureCount += 1;
                    errors.push({
                        id: item.id || null,
                        md5: item.md5 || null,
                        name: item.name || null,
                        message: error.message
                    });
                    logger.warn(`Failed to sync OGMS model ${item.name || item.md5}: ${error.message}`);
                }
            });

            const finishedAt = now().toISOString();
            const run = {
                source: 'opengms',
                reason,
                status: failureCount > 0 ? 'partial' : 'success',
                startedAt,
                finishedAt,
                total,
                successCount,
                failureCount,
                skippedCount,
                errors: errors.slice(0, 50)
            };
            await recordOgmsModelSyncRun(db, run);
            logger.info(`[OGMS model sync] Finished ${reason} sync: ${successCount} updated, ${skippedCount} skipped, ${failureCount} failed`);
            return run;
        } catch (error) {
            const finishedAt = now().toISOString();
            const run = {
                source: 'opengms',
                reason,
                status: 'failed',
                startedAt,
                finishedAt,
                total,
                successCount,
                failureCount: failureCount || 1,
                skippedCount,
                errors: [{ message: error.message }]
            };
            await recordOgmsModelSyncRun(db, run);
            logger.error(`[OGMS model sync] Failed ${reason} sync: ${error.message}`);
            throw error;
        }
    }

    return {
        fetchAllDeployedModels,
        fetchModelDetailByMd5,
        syncOgmsModels
    };
}

function shouldRefreshOgmsModel(existing, listItem = {}) {
    if (!existing) return true;
    if (!existing.mdlRaw) return true;
    if (existing.parameterParseStatus === 'failed' || existing.syncError) return true;

    const remoteModifyTime = cleanString(listItem.lastModifyTime);
    if (remoteModifyTime && remoteModifyTime !== cleanString(existing.lastModifyTime)) {
        return true;
    }

    const remoteMd5 = cleanString(listItem.md5);
    if (remoteMd5 && remoteMd5 !== cleanString(existing.md5)) {
        return true;
    }

    return false;
}

function startOgmsModelDailySync({
    countModels,
    syncService,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    nowFn = () => new Date(),
    logger = console
}) {
    if (schedulerState.started) {
        return { started: false };
    }

    schedulerState.started = true;
    schedulerState.clearTimeoutFn = clearTimeoutFn;

    const scheduleNext = () => {
        if (!schedulerState.started) return;
        const delay = getDelayUntilNextShanghaiThreeAm(nowFn());
        schedulerState.timer = setTimeoutFn(async () => {
            try {
                await syncService.syncOgmsModels({ reason: 'daily' });
            } catch (error) {
                logger.warn(`[OGMS model sync] Daily sync failed: ${error.message}`);
            } finally {
                scheduleNext();
            }
        }, delay);
    };

    scheduleNext();

    Promise.resolve().then(async () => {
        try {
            const count = await countModels();
            if (count === 0) {
                await syncService.syncOgmsModels({ reason: 'startup-empty' });
            }
        } catch (error) {
            logger.warn(`[OGMS model sync] Startup sync check failed: ${error.message}`);
        }
    });

    return { started: true };
}

function resetOgmsModelDailySyncScheduler() {
    if (schedulerState.timer && schedulerState.clearTimeoutFn) {
        schedulerState.clearTimeoutFn(schedulerState.timer);
    }
    schedulerState = {
        started: false,
        timer: null,
        clearTimeoutFn: null
    };
}

function getDelayUntilNextShanghaiThreeAm(now = new Date()) {
    const nowMs = now.getTime();
    let targetMs = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        SHANGHAI_THREE_AM_UTC_HOUR,
        0,
        0,
        0
    );

    if (targetMs <= nowMs) {
        targetMs += ONE_DAY_MS;
    }

    return targetMs - nowMs;
}

async function mapInBatches(items, batchSize, mapper) {
    for (let index = 0; index < items.length; index += batchSize) {
        const batch = items.slice(index, index + batchSize);
        await Promise.all(batch.map(mapper));
    }
}

function cleanString(value) {
    return String(value || '').trim();
}

module.exports = {
    createOgmsModelSyncService,
    getDelayUntilNextShanghaiThreeAm,
    resetOgmsModelDailySyncScheduler,
    shouldRefreshOgmsModel,
    startOgmsModelDailySync
};
