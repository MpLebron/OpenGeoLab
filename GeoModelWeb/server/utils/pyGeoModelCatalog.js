const fs = require('fs');
const path = require('path');

const DEFAULT_CATALOG_PATH = path.join(__dirname, '..', 'data', 'computeModel.json');
const DEFAULT_REGISTRY_PATH = path.join(__dirname, '..', 'data', 'modellist_2070.csv');
const DEFAULT_TRANSLATIONS_PATH = path.join(__dirname, '..', 'data', 'description_translations_en.json');

let catalogCache = null;

function loadPyGeoModelCatalog(options = {}) {
    const catalogPath = options.catalogPath || DEFAULT_CATALOG_PATH;
    const registryPath = options.registryPath || DEFAULT_REGISTRY_PATH;
    const translationsPath = options.translationsPath || DEFAULT_TRANSLATIONS_PATH;
    const cacheKey = `${catalogPath}:${registryPath}:${translationsPath}`;

    if (catalogCache?.key === cacheKey) {
        return catalogCache.value;
    }

    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const translations = readJsonIfExists(translationsPath);
    const registry = fs.existsSync(registryPath) ? readExecutableRegistry(registryPath) : null;
    const entries = Object.entries(catalog)
        .map(([name, raw]) => normalizePyGeoModelRecord(name, raw, registry, translations))
        .filter(Boolean);
    const models = entries.sort(comparePyGeoModelSummaries);

    const value = {
        source: 'pygeomodel',
        total: models.length,
        models,
        rawCatalog: catalog,
        registry,
        translations
    };
    catalogCache = { key: cacheKey, value };
    return value;
}

function listPyGeoModelModels(options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 20);
    const query = String(options.query || '').trim().toLowerCase();
    const domain = String(options.domain || 'all').trim().toLowerCase();
    const catalog = loadPyGeoModelCatalog(options);

    let models = catalog.models;
    if (query) {
        models = models
            .map(model => ({ model, score: scorePyGeoModelSummary(model, query) }))
            .filter(item => item.score > 0)
            .sort((a, b) => compareScoredPyGeoModelSummaries(a, b))
            .map(item => item.model);
    }

    if (domain && domain !== 'all') {
        models = models.filter(model => model.tags.some(tag => String(tag).toLowerCase() === domain));
    }

    const total = models.length;
    const startIndex = (page - 1) * limit;
    return {
        source: catalog.source,
        total,
        page,
        limit,
        data: models.slice(startIndex, startIndex + limit)
    };
}

function buildPyGeoModelFacetCounts(options = {}) {
    const catalog = loadPyGeoModelCatalog(options);
    const counts = new Map();
    catalog.models.forEach(model => {
        (model.tags || []).forEach(tag => {
            const label = String(tag || '').trim();
            if (!label) return;
            counts.set(label, (counts.get(label) || 0) + 1);
        });
    });

    return Array.from(counts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildPyGeoModelRegistryFilter(options = {}) {
    const catalog = loadPyGeoModelCatalog(options);
    const ids = new Set();
    const md5s = new Set();
    const names = new Set();
    const displayNames = new Set();

    catalog.models.forEach(model => {
        [
            model.id,
            model.model_id
        ].forEach(value => {
            const cleaned = cleanValue(value);
            if (cleaned) ids.add(cleaned);
        });

        const md5 = cleanValue(model.md5);
        if (md5) md5s.add(md5);

        const name = cleanValue(model.name);
        if (name) names.add(name);

        [
            model.displayName,
            model.display_name
        ].forEach(value => {
            const cleaned = cleanValue(value);
            if (cleaned) displayNames.add(cleaned);
        });
    });

    return {
        source: catalog.source,
        total: catalog.models.length,
        ids: Array.from(ids),
        md5s: Array.from(md5s),
        names: Array.from(names),
        displayNames: Array.from(displayNames)
    };
}

function getPyGeoModelModelDetail(identifier, options = {}) {
    const catalog = loadPyGeoModelCatalog(options);
    const summary = findPyGeoModelSummary(catalog.models, identifier);
    if (!summary) {
        return null;
    }

    const raw = catalog.rawCatalog?.[summary.name];
    if (!raw) {
        return null;
    }

    const normalized = normalizePyGeoModelRecord(summary.name, raw, catalog.registry, catalog.translations);
    if (!normalized) {
        return null;
    }

    const mdlRoot = unwrapMdlRoot(raw);
    const inputs = normalizePyGeoModelMdlInputs(mdlRoot);

    return {
        ...normalized,
        mdl: { inputs },
        mdlJson: { inputs },
        source: 'pygeomodel',
        detailSource: 'pygeomodel-catalog'
    };
}

function normalizePyGeoModelRecord(name, raw, registry, translations) {
    const rawMd5 = String(raw?.md5 || '').trim();
    const rawId = String(raw?._id || raw?.id || '').trim();
    const rawName = String(name || '').trim();
    const registryEntry = findRegistryEntry(registry, rawMd5, rawId, rawName);
    if (registry && !registryEntry) {
        return null;
    }

    const displayName = registryEntry?.displayName || raw.display_name_en || rawName;
    const description = raw.description || translations?.[rawName] || 'No description available';
    const tagsEn = normalizeTagList(raw.normalTagsEn);
    const tagsRaw = normalizeTagList(raw.normalTags);
    const readableRawTags = tagsRaw.filter(tag => !looksLikeOpaqueId(tag));
    const tags = tagsEn.length > 0
        ? tagsEn
        : (readableRawTags.length > 0 ? readableRawTags : inferTagsFromMdlPath(raw));

    return {
        id: rawId || rawName,
        model_id: rawId || rawName,
        name: rawName,
        displayName,
        display_name: displayName,
        description,
        author: raw.author || 'Unknown',
        tags,
        tagsRaw,
        tagsEn,
        md5: rawMd5,
        registryOrder: registryEntry?.order || 0,
        registry_order: registryEntry?.order || 0,
        status: 'PyGeoModel',
        source: 'pygeomodel',
        externalUrl: raw.externalUrl || '',
        modelItemUrl: raw.modelItemUrl || ''
    };
}

function findPyGeoModelSummary(models, identifier) {
    const needle = cleanValue(identifier).toLowerCase();
    if (!needle) return null;

    return models.find(model => cleanValue(model.name).toLowerCase() === needle)
        || models.find(model => cleanValue(model.displayName).toLowerCase() === needle)
        || models.find(model => cleanValue(model.display_name).toLowerCase() === needle)
        || models.find(model => cleanValue(model.id).toLowerCase() === needle)
        || models.find(model => cleanValue(model.model_id).toLowerCase() === needle)
        || models.find(model => cleanValue(model.md5).toLowerCase() === needle)
        || null;
}

function unwrapMdlRoot(raw) {
    return raw?.mdlJson?.mdl || raw?.mdlJson || raw?.mdl || null;
}

function normalizePyGeoModelMdlInputs(mdlRoot) {
    if (!mdlRoot) return [];
    if (Array.isArray(mdlRoot.inputs)) return normalizeExistingInputs(mdlRoot.inputs);

    const inputs = normalizeInputsFromStates(mdlRoot.states || mdlRoot.States || mdlRoot.State);
    if (inputs.length > 0) return dedupeInputs(inputs);

    return dedupeInputs(normalizeInputsFromDataItems(mdlRoot.DataItems || mdlRoot.dataItems));
}

function normalizeExistingInputs(inputs) {
    return inputs
        .map(input => ({
            statename: input.statename || input.stateName || input.state || 'Input',
            event: input.event || input.eventName || input.name || 'input',
            url: input.url || '',
            suffix: input.suffix || '',
            optional: normalizeOptional(input.optional),
            text: input.text || input.description || input.desc || input.event || input.name || 'Input parameter',
            children: arrayify(input.children).map(child => ({
                eventName: child.eventName || child.name || child.text || '',
                value: child.value || '',
                dataType: child.dataType || child.type || '',
                description: child.description || child.desc || ''
            })).filter(child => child.eventName)
        }))
        .filter(input => input.event);
}

function normalizeInputsFromStates(statesValue) {
    const inputs = [];
    for (const state of arrayify(statesValue)) {
        const stateName = state?.name || state?.stateName || 'Input';
        const events = arrayify(state?.event || state?.events || state?.Event);
        for (const event of events) {
            const eventType = cleanValue(event?.eventType || event?.type).toLowerCase();
            if (eventType && eventType !== 'response') {
                continue;
            }

            const dataItems = flattenArray(event?.data || event?.Data || event?.ResponseParameter || []);
            if (dataItems.length === 0) {
                const eventName = event?.eventName || event?.name || 'input';
                inputs.push({
                    statename: stateName,
                    event: eventName,
                    url: '',
                    suffix: '',
                    optional: normalizeOptional(event?.optional),
                    text: event?.eventDesc || event?.description || eventName,
                    children: []
                });
                continue;
            }

            for (const dataItem of dataItems) {
                inputs.push(...normalizeDataItemAsInputs(dataItem, stateName, event));
            }
        }
    }
    return inputs;
}

function normalizeInputsFromDataItems(dataItemsValue) {
    const inputs = [];
    for (const dataItem of flattenArray(dataItemsValue)) {
        const itemName = cleanValue(dataItem?.text || dataItem?.name || dataItem?.eventName);
        if (!itemName || /^output/i.test(itemName)) {
            continue;
        }
        inputs.push(...normalizeDataItemAsInputs(dataItem, 'Input', {
            eventName: itemName,
            eventDesc: dataItem?.desc || itemName,
            optional: false
        }));
    }
    return inputs;
}

function normalizeDataItemAsInputs(dataItem, stateName, event) {
    const itemName = cleanValue(dataItem?.text || dataItem?.name || event?.eventName || event?.name || 'input');
    const itemDescription = dataItem?.desc || dataItem?.description || event?.eventDesc || event?.description || itemName;
    const itemType = cleanValue(dataItem?.dataType || dataItem?.type).toLowerCase();
    const nodes = normalizeUdxNodes(dataItem?.nodes || dataItem?.UdxDeclaration || dataItem?.udxDeclaration);

    if (itemType === 'external' || nodes.length === 0) {
        return [{
            statename: stateName,
            event: itemName,
            url: '',
            suffix: '',
            optional: normalizeOptional(event?.optional || dataItem?.optional),
            text: itemDescription,
            children: []
        }];
    }

    return nodes.map(node => ({
        statename: stateName,
        event: itemName,
        url: '',
        suffix: '',
        optional: normalizeOptional(event?.optional || dataItem?.optional),
        text: node.desc || node.description || itemDescription,
        children: [{
            eventName: node.text || node.name,
            value: '',
            dataType: node.dataType || node.type || '',
            description: node.desc || node.description || ''
        }]
    })).filter(input => input.children[0]?.eventName);
}

function normalizeUdxNodes(value) {
    const directNodes = flattenArray(value);
    if (directNodes.length > 0 && directNodes.some(node => node?.text || node?.name)) {
        return directNodes;
    }

    const nested = value?.UdxNode || value?.UDXNode;
    return flattenArray(nested)
        .flatMap(node => flattenArray(node?.UdxNode || node?.UDXNode || node))
        .filter(node => node?.text || node?.name);
}

function dedupeInputs(inputs) {
    const seen = new Set();
    return inputs.filter(input => {
        const childNames = (input.children || []).map(child => child.eventName).join(',');
        const key = `${input.statename}:${input.event}:${childNames}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function normalizeOptional(value) {
    if (value === true) return true;
    if (value === false) return false;
    const text = cleanValue(value).toLowerCase();
    return text === 'true' || text === '1' || text === 'yes';
}

function arrayify(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function flattenArray(value) {
    return arrayify(value).flatMap(item => Array.isArray(item) ? flattenArray(item) : [item]).filter(Boolean);
}

function findRegistryEntry(registry, md5, modelId, name) {
    if (!registry) {
        return { order: 0, displayName: '' };
    }
    return registry.byMd5.get(md5) || registry.byId.get(modelId) || registry.byName.get(name) || null;
}

function readExecutableRegistry(registryPath) {
    const rows = parseCsv(fs.readFileSync(registryPath, 'utf8'));
    const registry = {
        byMd5: new Map(),
        byId: new Map(),
        byName: new Map()
    };

    rows.forEach((row, index) => {
        const order = index + 1;
        const displayName = cleanValue(row.display_name_en || row['英文显示名称'] || row['英文名称']);
        const entry = { order, displayName };
        const md5 = cleanValue(row.MD5);
        const modelId = cleanValue(row['模型UID']);
        const name = cleanValue(row['名称']);

        if (md5) registry.byMd5.set(md5, entry);
        if (modelId) registry.byId.set(modelId, entry);
        if (name) registry.byName.set(name, entry);
    });

    return registry;
}

function scorePyGeoModelSummary(model, query) {
    const haystack = [
        model.name,
        model.displayName,
        model.description,
        model.author,
        ...(model.tags || []),
        ...(model.tagsRaw || []),
        ...(model.tagsEn || [])
    ].join(' ').toLowerCase();

    if (!haystack.includes(query)) {
        return 0;
    }

    let score = 1;
    if (String(model.displayName || '').toLowerCase().includes(query)) score += 25;
    if (String(model.name || '').toLowerCase().includes(query)) score += 20;
    if (String(model.description || '').toLowerCase().includes(query)) score += 10;
    if ([...(model.tags || []), ...(model.tagsRaw || []), ...(model.tagsEn || [])].some(tag => String(tag).toLowerCase().includes(query))) {
        score += 5;
    }
    return score;
}

function compareScoredPyGeoModelSummaries(left, right) {
    if (right.score !== left.score) return right.score - left.score;
    return comparePyGeoModelSummaries(left.model, right.model);
}

function comparePyGeoModelSummaries(left, right) {
    const orderDiff = (right.registryOrder || 0) - (left.registryOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    const displayDiff = String(left.displayName || left.name).localeCompare(String(right.displayName || right.name));
    if (displayDiff !== 0) return displayDiff;
    return String(left.name).localeCompare(String(right.name));
}

function normalizeTagList(value) {
    return Array.isArray(value)
        ? value.map(item => String(item || '').trim()).filter(Boolean)
        : [];
}

function inferTagsFromMdlPath(raw) {
    const pathValue = raw?.mdlJson?.mdl?.path;
    if (!pathValue) return [];
    return String(pathValue)
        .split('/')
        .map(item => item.trim())
        .filter(item => item && !/categories$/i.test(item) && !/perspective$/i.test(item))
        .slice(-2);
}

function looksLikeOpaqueId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
}

function readJsonIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return null;
    }
}

function parseCsv(text) {
    const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
    if (rows.length === 0) return [];
    const headers = rows[0].map((header, index) => cleanValue(index === 0 ? header.replace(/^\uFEFF/, '') : header));
    return rows.slice(1)
        .filter(row => row.some(value => cleanValue(value)))
        .map(row => Object.fromEntries(headers.map((header, index) => [header, cleanValue(row[index])])));
}

function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];

        if (char === '"') {
            if (quoted && next === '"') {
                cell += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
            continue;
        }

        if (char === ',' && !quoted) {
            row.push(cell);
            cell = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') {
                index += 1;
            }
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            continue;
        }

        cell += char;
    }

    if (cell || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}

function cleanValue(value) {
    return String(value || '').trim();
}

function clearPyGeoModelCatalogCache() {
    catalogCache = null;
}

module.exports = {
    loadPyGeoModelCatalog,
    listPyGeoModelModels,
    getPyGeoModelModelDetail,
    buildPyGeoModelRegistryFilter,
    buildPyGeoModelFacetCounts,
    clearPyGeoModelCatalogCache
};
