const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { MOCK_MY_DATA } = require('../config/mockMyData');

const FORMAT_LABELS = {
    tif: 'GeoTIFF',
    tiff: 'GeoTIFF',
    geotiff: 'GeoTIFF',
    nc: 'NetCDF',
    h5: 'HDF5',
    hdf5: 'HDF5',
    geojson: 'GeoJSON',
    json: 'JSON',
    csv: 'CSV',
    txt: 'Plain Text',
    md: 'Markdown',
    shp: 'Shapefile',
    gpkg: 'GeoPackage'
};

function toPosixPath(value) {
    return String(value || '').replace(/\\/g, '/');
}

function ensureDataPath(value) {
    const clean = toPosixPath(value).trim();
    if (!clean || clean === '/') return '/';
    return clean.startsWith('/') ? clean : `/${clean}`;
}

function joinDisplayPath(parentPath, name) {
    const cleanName = String(name || '').trim();
    const cleanParent = ensureDataPath(parentPath || '/');
    if (cleanParent === '/') return `/${cleanName}`;
    return `${cleanParent}/${cleanName}`;
}

function getExtension(name, fallbackType = '') {
    const ext = path.extname(String(name || '')).replace(/^\./, '').toLowerCase();
    if (ext) return ext;
    const type = String(fallbackType || '').toLowerCase();
    return type === 'folder' ? '' : type;
}

function inferFormatLabel(type) {
    const cleanType = String(type || '').replace(/^\./, '').toLowerCase();
    return FORMAT_LABELS[cleanType] || (cleanType ? cleanType.toUpperCase() : 'File');
}

function inferKind(item = {}) {
    if (item.kind === 'folder' || item.type === 'folder') return 'folder';
    return 'file';
}

function normalizeMyDataList(rawList = []) {
    const rawItems = Array.isArray(rawList) ? rawList : [];
    const byId = new Map(rawItems.map(item => [String(item.id), item]));
    const pathCache = new Map();

    const resolveItemPath = (item) => {
        if (!item) return '/';
        const key = String(item.id || item.name || Math.random());
        if (pathCache.has(key)) return pathCache.get(key);

        let resolvedPath = item.path ? ensureDataPath(item.path) : '';
        if (!resolvedPath) {
            const parent = item.parentId ? byId.get(String(item.parentId)) : null;
            const parentPath = parent ? resolveItemPath(parent) : '/';
            resolvedPath = joinDisplayPath(parentPath, item.name || item.filename || 'Untitled');
        }

        if (inferKind(item) === 'file') {
            const itemName = item.name || item.filename || 'Untitled';
            const currentBase = path.posix.basename(resolvedPath);
            if (resolvedPath === '/' || currentBase !== itemName) {
                resolvedPath = joinDisplayPath(resolvedPath, itemName);
            }
        }

        pathCache.set(key, resolvedPath);
        return resolvedPath;
    };

    return rawItems.map(item => {
        const kind = inferKind(item);
        const name = item.name || item.filename || 'Untitled';
        const itemPath = resolveItemPath(item);
        const extension = kind === 'folder' ? '' : getExtension(name, item.type || item.extension);
        const type = kind === 'folder' ? 'folder' : (extension || item.type || 'unknown');
        const metadata = {
            ...(item.metadata || {}),
            formatLabel: item.metadata?.formatLabel || (kind === 'folder' ? 'Folder' : inferFormatLabel(type))
        };

        return {
            ...item,
            id: item.id,
            name,
            filename: item.filename || name,
            kind,
            type,
            extension,
            path: itemPath,
            parentId: item.parentId || null,
            source: item.source || (item.forked ? 'forked' : 'user'),
            downloadable: typeof item.downloadable === 'boolean' ? item.downloadable : Boolean(item.url),
            metadata
        };
    });
}

function seedMockMyDataIfEmpty(dataList = [], { enabled = true } = {}) {
    if (!enabled || (Array.isArray(dataList) && dataList.length > 0)) {
        return dataList;
    }

    return normalizeMyDataList(MOCK_MY_DATA.map(item => ({ ...item })));
}

function findMyDataItem(dataList, dataId) {
    return normalizeMyDataList(dataList).find(item => String(item.id) === String(dataId));
}

function getSafeDownloadFilename(item = {}) {
    const rawName = String(item.name || item.filename || 'download').trim() || 'download';
    return rawName
        .replace(/[\r\n]+/g, ' ')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, ' ')
        .trim() || 'download';
}

function buildDownloadContentDisposition(filename = 'download') {
    const safeName = getSafeDownloadFilename({ name: filename });
    const extension = path.extname(safeName);
    const asciiBase = safeName
        .replace(/[^\x20-\x7E]+/g, '_')
        .replace(/["\\]/g, '_')
        .trim();
    const asciiFallback = asciiBase && asciiBase !== extension
        ? asciiBase
        : `download${extension || ''}`;
    const encoded = encodeURIComponent(safeName)
        .replace(/['()]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/\*/g, '%2A');

    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

function normalizeUploadDestinationPath(rawPath = '/') {
    const clean = toPosixPath(rawPath || '/').trim();
    if (!clean || clean === '/') return '/';
    if (!clean.startsWith('/') || clean.includes('\0')) return null;

    const segments = clean.split('/').filter(Boolean);
    if (segments.some(segment => segment === '..')) return null;

    const normalized = path.posix.normalize(clean);
    return normalized.startsWith('/') ? normalized : null;
}

function resolveMyDataUploadDestination(dataList = [], payload = {}) {
    const normalizedData = normalizeMyDataList(dataList);
    const dataPath = normalizeUploadDestinationPath(payload.path || '/');
    if (!dataPath) {
        return {
            ok: false,
            status: 400,
            code: 'invalid_data_path',
            message: 'Upload destination path must start with / and stay inside My Data'
        };
    }

    const requestedParentId = payload.parentId ? String(payload.parentId) : '';
    let parentId = '';

    if (dataPath === '/') {
        if (requestedParentId) {
            return {
                ok: false,
                status: 400,
                code: 'parent_path_mismatch',
                message: 'Upload parentId does not match the destination path'
            };
        }
    } else {
        const folder = normalizedData.find(item => (
            inferKind(item) === 'folder' &&
            item.path === dataPath
        ));

        if (!folder) {
            return {
                ok: false,
                status: 400,
                code: 'upload_path_not_found',
                message: 'Upload destination folder was not found'
            };
        }

        if (requestedParentId && requestedParentId !== String(folder.id)) {
            return {
                ok: false,
                status: 400,
                code: 'parent_path_mismatch',
                message: 'Upload parentId does not match the destination path'
            };
        }

        parentId = String(folder.id);
    }

    const name = String(payload.name || payload.filename || '').trim();
    const filename = String(payload.filename || name).trim();
    const duplicate = normalizedData.some(item => (
        inferKind(item) === 'file' &&
        String(item.parentId || '') === parentId &&
        (item.name === name || item.filename === filename)
    ));

    if (duplicate) {
        return {
            ok: false,
            status: 409,
            code: 'file_name_exists',
            message: 'A file with the same name already exists in this folder'
        };
    }

    return {
        ok: true,
        dataPath,
        parentId: parentId || null,
        dataList: normalizedData
    };
}

function slugSegment(value, fallback = 'assets') {
    const clean = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return clean || fallback;
}

function safeFilename(value) {
    return String(value || 'dataset')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/^_+|_+$/g, '') || 'dataset';
}

function sanitizeProjectDataMountPath(rawMountPath) {
    const raw = toPosixPath(rawMountPath || '').trim();
    if (!raw) {
        throw new Error('Project data mount path is required');
    }

    if (raw.startsWith('/') || raw.includes('\0')) {
        throw new Error('Project data mount path must stay inside data/');
    }

    const normalized = path.posix.normalize(raw);
    if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
        throw new Error('Project data mount path must stay inside data/');
    }

    const withPrefix = normalized === 'data' || normalized.startsWith('data/')
        ? normalized
        : path.posix.join('data', normalized);

    if (withPrefix === 'data' || withPrefix.startsWith('data/')) {
        return withPrefix;
    }

    throw new Error('Project data mount path must stay inside data/');
}

function defaultMountPathForDataItem(item) {
    const firstPathSegment = ensureDataPath(item.path || '/')
        .split('/')
        .filter(Boolean)[0];
    const domain = slugSegment(item.metadata?.domain || firstPathSegment || item.type || 'assets');
    return sanitizeProjectDataMountPath(path.posix.join('data', domain, safeFilename(item.name)));
}

function buildBindingId(dataId) {
    return `binding-${String(dataId || '').replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
}

function ensureProjectDataBindings(meta = {}) {
    if (!Array.isArray(meta.dataBindings)) {
        meta.dataBindings = [];
    }
    return meta.dataBindings;
}

function createProjectDataBinding(meta = {}, dataList = [], payload = {}) {
    const bindings = ensureProjectDataBindings(meta);
    const dataId = payload.dataId;
    if (!dataId) {
        return {
            ok: false,
            status: 400,
            code: 'data_id_required',
            message: 'dataId is required'
        };
    }

    const item = findMyDataItem(dataList, dataId);
    if (!item) {
        return {
            ok: false,
            status: 404,
            code: 'data_not_found',
            message: 'My Data item was not found'
        };
    }

    if (item.kind === 'folder') {
        return {
            ok: false,
            status: 400,
            code: 'folder_binding_not_supported',
            message: 'Folders cannot be attached as Project Data in this version'
        };
    }

    if (bindings.some(binding => String(binding.dataId) === String(dataId))) {
        return {
            ok: false,
            status: 409,
            code: 'data_binding_exists',
            message: 'This data asset is already attached to the project'
        };
    }

    let mountPath;
    try {
        mountPath = sanitizeProjectDataMountPath(payload.mountPath || defaultMountPathForDataItem(item));
    } catch (error) {
        return {
            ok: false,
            status: 400,
            code: 'invalid_mount_path',
            message: error.message
        };
    }

    const now = new Date().toISOString();
    const binding = {
        id: payload.id || buildBindingId(dataId),
        dataId: item.id,
        name: item.name,
        sourcePath: item.path,
        mountPath,
        mode: 'readonly',
        bindingType: 'reference',
        status: 'ready',
        addedAt: payload.addedAt || now,
        metadata: item.metadata || {},
        source: item.source || 'user',
        downloadable: Boolean(item.downloadable),
        url: item.url || '',
        materialized: false,
        localPath: '',
        materializedAt: '',
        error: ''
    };

    bindings.push(binding);
    return { ok: true, binding, bindings };
}

function isBundledCaseDataBinding(binding = {}) {
    return binding.source === 'case' || binding.bindingType === 'bundled-case-data';
}

function removeProjectDataBinding(meta = {}, bindingId) {
    const bindings = ensureProjectDataBindings(meta);
    const index = bindings.findIndex(binding => String(binding.id) === String(bindingId));
    if (index === -1) {
        return {
            ok: false,
            status: 404,
            code: 'data_binding_not_found',
            message: 'Project Data binding was not found'
        };
    }

    const [binding] = bindings.splice(index, 1);
    return { ok: true, binding, bindings };
}

function resolveBundledCaseDataBinding(binding = {}, options = {}) {
    const localPath = binding.localPath || binding.mountPath || '';
    let sourceAvailable = true;
    let error = binding.error || '';

    if (options.projectDir) {
        try {
            const resolved = resolveProjectDataLocalPath(options.projectDir, localPath);
            sourceAvailable = fs.existsSync(resolved.targetPath);
            if (!sourceAvailable) {
                error = 'Bundled case data file is missing from this project';
            }
        } catch (pathError) {
            sourceAvailable = false;
            error = pathError.message;
        }
    }

    const metadata = binding.metadata || {};
    const name = binding.name || path.posix.basename(localPath) || binding.id || 'case-data';
    const extension = getExtension(name, metadata.formatLabel || '');
    const status = sourceAvailable ? (binding.status || 'ready') : 'source_missing';

    return {
        ...binding,
        dataId: binding.dataId || binding.id,
        name,
        sourcePath: binding.sourcePath || `case://${localPath}`,
        metadata,
        downloadable: Boolean(binding.downloadable),
        url: binding.url || '',
        source: 'case',
        bindingType: binding.bindingType || 'bundled-case-data',
        mode: binding.mode || 'readonly',
        sourceAvailable,
        status,
        materialized: sourceAvailable && binding.materialized !== false,
        localPath,
        materializedAt: binding.materializedAt || '',
        error: sourceAvailable ? '' : error,
        sourceItem: {
            id: binding.dataId || binding.id,
            name,
            filename: name,
            kind: 'file',
            type: extension || 'zip',
            extension,
            path: binding.sourcePath || localPath,
            source: 'case',
            downloadable: false,
            size: Number(metadata.size || 0),
            metadata
        }
    };
}

function resolveProjectDataBindings(meta = {}, dataList = [], options = {}) {
    const normalizedData = normalizeMyDataList(dataList);
    const byId = new Map(normalizedData.map(item => [String(item.id), item]));
    const bindings = Array.isArray(meta.dataBindings) ? meta.dataBindings : [];

    return bindings.map(binding => {
        if (isBundledCaseDataBinding(binding)) {
            return resolveBundledCaseDataBinding(binding, options);
        }

        const sourceItem = byId.get(String(binding.dataId));
        if (!sourceItem) {
            return {
                ...binding,
                sourceAvailable: false,
                status: 'source_missing',
                sourceItem: null
            };
        }

        return {
            ...binding,
            name: binding.name || sourceItem.name,
            sourcePath: binding.sourcePath || sourceItem.path,
            metadata: {
                ...(sourceItem.metadata || {}),
                ...(binding.metadata || {})
            },
            downloadable: Boolean(sourceItem.downloadable),
            url: sourceItem.url || binding.url || '',
            sourceAvailable: true,
            status: binding.status || 'ready',
            materialized: Boolean(binding.materialized),
            localPath: binding.localPath || '',
            materializedAt: binding.materializedAt || '',
            error: binding.error || '',
            sourceItem
        };
    });
}

function buildProjectDataManifest(projectDir, meta = {}, dataList = []) {
    const bindings = resolveProjectDataBindings(meta, dataList, { projectDir }).map(binding => ({
        id: binding.id,
        dataId: binding.dataId,
        name: binding.name,
        sourcePath: binding.sourcePath,
        mountPath: binding.mountPath,
        mode: binding.mode || 'readonly',
        bindingType: binding.bindingType || 'reference',
        status: binding.status,
        sourceAvailable: Boolean(binding.sourceAvailable),
        materialized: Boolean(binding.materialized),
        localPath: binding.localPath || '',
        materializedAt: binding.materializedAt || '',
        error: binding.error || '',
        downloadable: Boolean(binding.downloadable),
        url: binding.url || '',
        metadata: binding.metadata || {}
    }));

    return {
        version: 1,
        projectName: meta.name || path.basename(projectDir || ''),
        generatedAt: new Date().toISOString(),
        bindings
    };
}

function writeProjectDataManifest(projectDir, meta = {}, dataList = []) {
    const bindingsDir = path.join(projectDir, 'data', '_bindings');
    fs.mkdirSync(bindingsDir, { recursive: true });

    const manifest = buildProjectDataManifest(projectDir, meta, dataList);
    fs.writeFileSync(
        path.join(bindingsDir, 'project-data.json'),
        JSON.stringify(manifest, null, 2)
    );

    return manifest;
}

function resolveProjectDataLocalPath(projectDir, mountPath) {
    const safeMountPath = sanitizeProjectDataMountPath(mountPath);
    const projectRoot = path.resolve(projectDir || '');
    const dataRoot = path.resolve(projectRoot, 'data');
    const targetPath = path.resolve(projectRoot, safeMountPath);

    if (targetPath !== dataRoot && !targetPath.startsWith(`${dataRoot}${path.sep}`)) {
        throw new Error('Project data local path must stay inside data/');
    }

    return {
        mountPath: safeMountPath.replace(/\\/g, '/'),
        targetPath
    };
}

async function materializeProjectDataBinding(projectDir, binding = {}, options = {}) {
    const updateBinding = (patch) => Object.assign(binding, patch);

    if (binding.sourceAvailable === false || binding.status === 'source_missing') {
        updateBinding({
            materialized: false,
            localPath: '',
            error: 'The source data asset is no longer available'
        });
        return {
            ok: false,
            status: 404,
            code: 'source_missing',
            message: binding.error,
            binding
        };
    }

    if (!binding.downloadable || !binding.url) {
        updateBinding({
            materialized: false,
            localPath: '',
            error: 'This data asset does not have a downloadable source'
        });
        return {
            ok: false,
            status: 400,
            code: 'download_unavailable',
            message: binding.error,
            binding
        };
    }

    let resolved;
    try {
        resolved = resolveProjectDataLocalPath(projectDir, binding.mountPath);
    } catch (error) {
        updateBinding({
            materialized: false,
            localPath: '',
            error: error.message
        });
        return {
            ok: false,
            status: 400,
            code: 'invalid_mount_path',
            message: error.message,
            binding
        };
    }

    const fetchStream = options.fetchStream;
    if (typeof fetchStream !== 'function') {
        updateBinding({
            materialized: false,
            localPath: '',
            error: 'No data download stream provider was configured'
        });
        return {
            ok: false,
            status: 500,
            code: 'download_provider_missing',
            message: binding.error,
            binding
        };
    }

    const tempPath = `${resolved.targetPath}.tmp-${process.pid}-${Date.now()}`;
    try {
        fs.mkdirSync(path.dirname(resolved.targetPath), { recursive: true });
        const sourceStream = await fetchStream(binding.url, binding);
        await pipeline(sourceStream, fs.createWriteStream(tempPath));
        fs.renameSync(tempPath, resolved.targetPath);

        updateBinding({
            materialized: true,
            localPath: resolved.mountPath,
            materializedAt: typeof options.now === 'function' ? options.now() : new Date().toISOString(),
            error: '',
            status: binding.status === 'source_missing' ? 'ready' : (binding.status || 'ready')
        });

        return {
            ok: true,
            binding
        };
    } catch (error) {
        try {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        } catch (cleanupError) {
            // Best effort cleanup only.
        }

        updateBinding({
            materialized: false,
            localPath: '',
            error: error.message || 'Project Data materialization failed'
        });

        return {
            ok: false,
            status: 502,
            code: 'materialize_failed',
            message: binding.error,
            binding
        };
    }
}

module.exports = {
    buildDownloadContentDisposition,
    buildProjectDataManifest,
    createProjectDataBinding,
    findMyDataItem,
    getSafeDownloadFilename,
    isBundledCaseDataBinding,
    materializeProjectDataBinding,
    normalizeMyDataList,
    removeProjectDataBinding,
    resolveProjectDataLocalPath,
    resolveMyDataUploadDestination,
    resolveProjectDataBindings,
    sanitizeProjectDataMountPath,
    seedMockMyDataIfEmpty,
    writeProjectDataManifest
};
