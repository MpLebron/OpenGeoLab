const xml2js = require('xml2js');

const OPEN_GMS_COMPUTABLE_MODEL_BASE_URL = 'https://geomodeling.njnu.edu.cn/computableModel';
const OPEN_GMS_MODEL_ITEM_BASE_URL = 'https://geomodeling.njnu.edu.cn/modelItem';

const OGMS_MODEL_TAG_NAME_MAP = {
    'a24cba2b-9ce1-44de-ac68-8ec36a535d0e': 'Land regions',
    '75aee2b7-b39a-4cd0-9223-3b7ce755e457': 'Ocean regions',
    '1bf4f381-6bd8-4716-91ab-5a56e51bd2f9': 'Frozen regions',
    '8f4d4fca-4d09-49b4-b6f7-5021bc57d0e5': 'Atmospheric regions',
    'd33a1ebe-b2f5-4ed3-9c76-78cfb61c23ee': 'Space-earth regions',
    'd3ba6e0b-78ec-4fe8-9985-4d5708f28e3e': 'Solid-earth regions',
    '808e74a4-41c6-4558-a850-4daec1f199df': 'Development activities',
    '40534cf8-039a-4a0a-8db9-7c9bff484190': 'Social activities',
    'cf9cd106-b873-4a8a-9336-dd72398fc769': 'Economic activities',
    '14130969-fda6-41ea-aa32-0af43104840b': 'Global scale',
    'e56c1254-70b8-4ff4-b461-b8fa3039944e': 'Regional scale',
    'afa99af9-4224-4fac-a81f-47a7fb663dba': 'Geoinformation analysis',
    'f20411a5-2f55-4ee9-9590-c2ec826b8bd5': 'Remote sensing analysis',
    '1c876281-a032-4575-8eba-f1a8fb4560d8': 'Geostatistical analysis',
    'c6fcc899-8ca4-4269-a21e-a39d38c034a6': 'Intelligent computation analysis',
    '1d564d0f-51c6-40ca-bd75-3f9489ccf1d6': 'Physical process calculation',
    '63266a14-d7f9-44cb-8204-c877eaddcaa1': 'Chemical process calculation',
    '6d1efa2c-830d-4546-b759-c66806c4facc': 'Biological process calculation',
    '6952d5b2-cb0f-4ba7-96fd-5761dd566344': 'Human-activity calculation'
};

function cleanString(value) {
    return String(value || '').trim();
}

function cleanStringOrNull(value) {
    return cleanString(value) || null;
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function arrayify(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function flattenArray(value) {
    return arrayify(value).flatMap(item => Array.isArray(item) ? flattenArray(item) : [item]).filter(Boolean);
}

function normalizeOptional(value) {
    if (value === true) return true;
    if (value === false) return false;
    const text = cleanString(value).toLowerCase();
    return text === 'true' || text === '1' || text === 'yes';
}

function buildOpenGmsComputableModelUrl(sourceId) {
    const id = cleanString(sourceId);
    return id ? `${OPEN_GMS_COMPUTABLE_MODEL_BASE_URL}/${encodeURIComponent(id)}` : null;
}

function buildOpenGmsModelItemUrl(modelItemId) {
    const id = cleanString(modelItemId);
    return id ? `${OPEN_GMS_MODEL_ITEM_BASE_URL}/${encodeURIComponent(id)}/` : null;
}

function mapOgmsModelTags(itemClassifications) {
    return arrayify(itemClassifications)
        .map(tag => OGMS_MODEL_TAG_NAME_MAP[String(tag)] || cleanString(tag))
        .filter(Boolean);
}

async function parseOgmsXmlMdlToJSON(xmlContent) {
    const text = cleanString(xmlContent);
    if (!text) {
        return { inputs: [] };
    }

    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    const result = await parser.parseStringPromise(text);
    return { inputs: normalizeInputsFromParsedMdl(result) };
}

function normalizeInputsFromParsedMdl(parsedMdl) {
    const behavior = parsedMdl?.ModelClass?.Behavior || parsedMdl?.mdl?.ModelClass?.Behavior || parsedMdl?.Behavior;
    const states = behavior?.StateGroup?.States?.State || behavior?.StateGroup?.State || parsedMdl?.ModelClass?.State;
    const datasets = behavior?.RelatedDatasets?.DatasetItem || behavior?.RelatedDatasets?.Dataset || [];
    const datasetList = arrayify(datasets);
    const inputs = [];

    for (const state of arrayify(states)) {
        const stateName = cleanString(state?.name || state?.stateName) || 'Input';
        for (const event of arrayify(state?.Event || state?.event || state?.events)) {
            const eventType = cleanString(event?.type || event?.eventType).toLowerCase();
            if (eventType && eventType !== 'response') {
                continue;
            }

            const responseParameters = flattenArray(event?.ResponseParameter || event?.responseParameter || event?.data || []);
            if (responseParameters.length === 0) {
                inputs.push(normalizeFileInput(stateName, event));
                continue;
            }

            for (const responseParameter of responseParameters) {
                const datasetRef = cleanString(responseParameter?.datasetReference || responseParameter?.DatasetReference || responseParameter?.name);
                const dataset = datasetList.find(item => cleanString(item?.name) === datasetRef);
                const datasetType = cleanString(dataset?.type || responseParameter?.type).toLowerCase();
                const nodes = normalizeUdxNodes(dataset?.UdxDeclaration || dataset?.udxDeclaration);

                if (datasetType === 'internal' && nodes.length > 0) {
                    inputs.push(normalizeInternalInput(stateName, event, nodes));
                } else {
                    inputs.push(normalizeFileInput(stateName, event, dataset));
                }
            }
        }
    }

    return dedupeInputs(inputs);
}

function normalizeFileInput(stateName, event, dataset = {}) {
    const eventName = cleanString(event?.name || event?.eventName || dataset?.name) || 'input';
    return {
        statename: stateName,
        event: eventName,
        url: '',
        suffix: '',
        optional: normalizeOptional(event?.optional),
        text: cleanString(event?.description || event?.eventDesc || dataset?.description || dataset?.desc) || eventName,
        children: []
    };
}

function normalizeInternalInput(stateName, event, nodes) {
    const eventName = cleanString(event?.name || event?.eventName) || 'input';
    return {
        statename: stateName,
        event: eventName,
        url: '',
        suffix: '',
        optional: normalizeOptional(event?.optional),
        text: cleanString(event?.description || event?.eventDesc) || eventName,
        children: nodes
            .map(node => ({
                eventName: cleanString(node?.name || node?.text),
                value: '',
                dataType: cleanString(node?.type || node?.dataType || node?.kernelType),
                description: cleanString(node?.description || node?.desc)
            }))
            .filter(child => child.eventName)
    };
}

function normalizeUdxNodes(value) {
    const directNodes = flattenArray(value);
    const namedDirectNodes = directNodes.filter(node => node?.name || node?.text);
    if (namedDirectNodes.length > 0) {
        const nestedChildren = namedDirectNodes.flatMap(node => flattenArray(node?.UdxNode || node?.UDXNode));
        const namedNested = nestedChildren.filter(node => node?.name || node?.text);
        return namedNested.length > 0 ? namedNested : namedDirectNodes;
    }

    const nested = value?.UdxNode || value?.UDXNode;
    return flattenArray(nested)
        .flatMap(node => flattenArray(node?.UdxNode || node?.UDXNode || node))
        .filter(node => node?.name || node?.text);
}

function dedupeInputs(inputs) {
    const seen = new Set();
    return inputs.filter(input => {
        const childNames = (input.children || []).map(child => child.eventName).join(',');
        const key = `${input.statename}:${input.event}:${childNames}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return Boolean(input.event);
    });
}

function normalizeOgmsModelDocument({
    listItem = {},
    detail = {},
    mdlJson = null,
    parseError = null,
    syncedAt = new Date().toISOString()
} = {}) {
    const sourceId = cleanString(detail.id || listItem.id || listItem.sourceId || detail.sourceId);
    const md5 = cleanString(detail.md5 || listItem.md5);
    const name = cleanString(detail.name || listItem.name) || 'Untitled model';
    const displayName = cleanString(detail.displayName || detail.display_name || listItem.displayName || listItem.display_name) || name;
    const mdlRaw = typeof detail.mdl === 'string' ? detail.mdl : cleanString(detail.mdlRaw);
    const inputs = Array.isArray(mdlJson?.inputs) ? mdlJson.inputs : [];
    const relatedModelItems = arrayify(detail.relatedModelItems || listItem.relatedModelItems);
    const status = cleanStringOrNull(detail.status || listItem.status);

    return {
        source: 'opengms',
        sourceId: sourceId || md5 || name,
        id: sourceId || md5 || name,
        model_id: sourceId || md5 || name,
        md5: md5 || null,
        name,
        displayName,
        display_name: displayName,
        description: cleanString(detail.overview || detail.description || listItem.description) || 'No description available',
        author: cleanString(detail.author || detail.authorEmail || listItem.author || listItem.authorEmail) || 'Unknown',
        tags: mapOgmsModelTags(detail.tags || detail.itemClassifications || listItem.tags || listItem.itemClassifications),
        tagsRaw: arrayify(detail.itemClassifications || listItem.itemClassifications).map(cleanString).filter(Boolean),
        status,
        deploy: Boolean(detail.deploy ?? listItem.deploy),
        online: Boolean(detail.checkedModel?.online ?? detail.online ?? listItem.online),
        healthText: cleanStringOrNull(detail.checkedModel?.msg || detail.healthText || listItem.healthText),
        viewCount: toNumber(listItem.viewCount || detail.viewCount),
        invokeCount: toNumber(detail.invokeCount || listItem.invokeCount),
        shareCount: toNumber(detail.shareCount || listItem.shareCount),
        thumbsUpCount: toNumber(detail.thumbsUpCount || listItem.thumbsUpCount),
        createTime: cleanStringOrNull(detail.createTime || listItem.createTime),
        lastModifyTime: cleanStringOrNull(detail.lastModifyTime || listItem.lastModifyTime),
        relatedModelItems,
        externalUrl: cleanStringOrNull(detail.externalUrl || listItem.externalUrl) || buildOpenGmsComputableModelUrl(sourceId),
        mdlRaw: mdlRaw || null,
        mdlJson: mdlJson || { inputs: [] },
        mdl: mdlJson || { inputs: [] },
        normalizedInputs: inputs,
        parameterParseStatus: parseError ? 'failed' : 'parsed',
        syncError: parseError ? `MDL parse failed: ${parseError.message}` : null,
        lastSyncedAt: syncedAt,
        updatedAt: syncedAt
    };
}

function toOgmsModelSummary(doc = {}) {
    const relatedModelItems = Array.isArray(doc.relatedModelItems)
        ? doc.relatedModelItems.map(cleanString).filter(Boolean)
        : [];
    const modelItemId = cleanStringOrNull(doc.modelItemId || doc.modelItemID || relatedModelItems[0]);

    return {
        id: doc.sourceId || doc.id || doc.md5 || doc.name,
        model_id: doc.sourceId || doc.model_id || doc.id || doc.md5 || doc.name,
        sourceId: doc.sourceId || null,
        modelItemId,
        modelItemUrl: buildOpenGmsModelItemUrl(modelItemId),
        md5: doc.md5 || null,
        name: doc.name,
        displayName: doc.displayName || doc.display_name || doc.name,
        display_name: doc.display_name || doc.displayName || doc.name,
        description: doc.description || 'No description available',
        author: doc.author || 'Unknown',
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        status: doc.status || null,
        deploy: Boolean(doc.deploy),
        online: Boolean(doc.online),
        healthText: doc.healthText || null,
        viewCount: toNumber(doc.viewCount),
        invokeCount: toNumber(doc.invokeCount),
        shareCount: toNumber(doc.shareCount),
        thumbsUpCount: toNumber(doc.thumbsUpCount),
        createTime: doc.createTime || null,
        lastModifyTime: doc.lastModifyTime || null,
        relatedModelItems,
        externalUrl: doc.externalUrl || buildOpenGmsComputableModelUrl(doc.sourceId),
        source: 'db'
    };
}

function toOgmsModelDetail(doc = {}) {
    return {
        ...toOgmsModelSummary(doc),
        mdl: doc.mdl || doc.mdlJson || { inputs: doc.normalizedInputs || [] },
        mdlJson: doc.mdlJson || { inputs: doc.normalizedInputs || [] },
        normalizedInputs: Array.isArray(doc.normalizedInputs) ? doc.normalizedInputs : [],
        parameterParseStatus: doc.parameterParseStatus || 'parsed',
        syncError: doc.syncError || null,
        detailSource: 'opengms-db'
    };
}

module.exports = {
    OPEN_GMS_COMPUTABLE_MODEL_BASE_URL,
    OPEN_GMS_MODEL_ITEM_BASE_URL,
    buildOpenGmsComputableModelUrl,
    buildOpenGmsModelItemUrl,
    mapOgmsModelTags,
    normalizeOgmsModelDocument,
    parseOgmsXmlMdlToJSON,
    toOgmsModelDetail,
    toOgmsModelSummary
};
