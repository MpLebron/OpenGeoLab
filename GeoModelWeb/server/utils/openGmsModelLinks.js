const OPEN_GMS_MODEL_ITEM_BASE_URL = 'https://geomodeling.njnu.edu.cn/modelItem';

function cleanString(value) {
    const text = String(value || '').trim();
    return text || '';
}

function cleanStringOrNull(value) {
    return cleanString(value) || null;
}

function toArray(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function buildOpenGmsModelExternalUrl(modelItemId) {
    const cleanId = cleanString(modelItemId);
    if (!cleanId) return null;
    return `${OPEN_GMS_MODEL_ITEM_BASE_URL}/${encodeURIComponent(cleanId)}/`;
}

function getOpenGmsModelItemId(model = {}) {
    const directId = cleanString(model.modelItemId || model.modelItemID || model.modelItem?.id);
    if (directId) return directId;

    const relatedItems = toArray(model.relatedModelItems);
    if (relatedItems.length) return cleanString(relatedItems[0]) || null;

    return null;
}

function normalizeOpenGmsModelFavorite(model = {}, options = {}) {
    const modelItemId = getOpenGmsModelItemId(model);
    const externalUrl = cleanString(model.externalUrl) || buildOpenGmsModelExternalUrl(modelItemId);

    const normalized = {
        id: cleanString(model.id || model.md5 || model.name),
        md5: cleanStringOrNull(model.md5),
        modelItemId,
        externalUrl: externalUrl || null,
        name: cleanString(model.name) || 'Untitled model',
        description: cleanString(model.description || model.overview),
        author: cleanString(model.author || model.authorEmail) || 'OpenGeoLab',
        tags: toArray(model.tags),
        status: cleanStringOrNull(model.status),
        deploy: Boolean(model.deploy),
        online: Boolean(model.online),
        healthText: cleanStringOrNull(model.healthText),
        viewCount: toNumber(model.viewCount),
        invokeCount: toNumber(model.invokeCount),
        shareCount: toNumber(model.shareCount),
        thumbsUpCount: toNumber(model.thumbsUpCount),
        createTime: cleanStringOrNull(model.createTime),
        lastModifyTime: cleanStringOrNull(model.lastModifyTime)
    };

    const addedAt = cleanString(model.addedAt || options.addedAt);
    if (addedAt) normalized.addedAt = addedAt;

    return normalized;
}

module.exports = {
    OPEN_GMS_MODEL_ITEM_BASE_URL,
    buildOpenGmsModelExternalUrl,
    getOpenGmsModelItemId,
    normalizeOpenGmsModelFavorite
};
