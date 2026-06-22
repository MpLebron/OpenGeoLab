const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { getUserByUsername } = require('../db/users');
const { resolveProjectRuntime } = require('./jupyterRuntime');
const { summarizeProjectFiles } = require('./projectFileSummary');
const { findProjectThumbnail } = require('./projectThumbnail');

const DEFAULT_NOTEBOOK_PREVIEW_MAX_BUFFER = 96 * 1024 * 1024;

const NOTEBOOK_EXTENSIONS = new Set(['.ipynb']);
const CODE_EXTENSIONS = new Set([
    '.py', '.r', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs',
    '.sh', '.bash', '.zsh', '.sql', '.jl', '.m', '.css', '.scss', '.less'
]);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.qmd']);
const TABLE_EXTENSIONS = new Set(['.csv', '.tsv']);
const JSON_EXTENSIONS = new Set(['.json', '.jsonl', '.ndjson']);
const GEOJSON_EXTENSIONS = new Set(['.geojson', '.topojson']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const PDF_EXTENSIONS = new Set(['.pdf']);
const ARCHIVE_EXTENSIONS = new Set(['.zip']);
const TEXT_EXTENSIONS = new Set([
    '.txt', '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf',
    '.log', '.prj', '.wkt', '.sld', '.cpg'
]);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg']);

function resolveUserDataDir(userDataDir = process.env.USER_DATA_DIR || path.join(__dirname, '..', 'jupyter-data')) {
    return path.isAbsolute(userDataDir)
        ? userDataDir
        : path.join(__dirname, '..', userDataDir);
}

function getProjectMeta(projectDir) {
    const metaPath = path.join(projectDir, '.project.json');
    if (!fs.existsSync(metaPath)) {
        return { name: path.basename(projectDir) };
    }

    try {
        return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch (error) {
        return { name: path.basename(projectDir), metaError: error.message };
    }
}

function getProjectId(meta = {}) {
    return String(meta.projectId || meta.workspaceId || meta.uuid || meta.id || '').trim();
}

function normalizeCaseText(value, maxLength = 2000) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

function normalizeCaseList(value, maxItems = 20, maxLength = 120) {
    let rawList = [];
    if (Array.isArray(value)) {
        rawList = value;
    } else if (typeof value === 'string') {
        rawList = value.split(/\r?\n|,|;/g);
    }

    return rawList
        .map(item => normalizeCaseText(String(item), maxLength))
        .filter(Boolean)
        .slice(0, maxItems);
}

function sanitizeCaseMeta(rawMeta = {}) {
    return {
        title: normalizeCaseText(rawMeta.title, 120),
        summary: normalizeCaseText(rawMeta.summary, 1000),
        scenario: normalizeCaseText(rawMeta.scenario, 300),
        coreNotebook: normalizeCaseText(rawMeta.coreNotebook, 180),
        environment: normalizeCaseText(rawMeta.environment, 120),
        coverImage: normalizeCaseText(rawMeta.coverImage, 600),
        tags: normalizeCaseList(rawMeta.tags, 12, 40),
        datasets: normalizeCaseList(rawMeta.datasets, 20, 120),
        steps: normalizeCaseList(rawMeta.steps, 20, 300),
        results: normalizeCaseList(rawMeta.results, 20, 300)
    };
}

function getCaseMeta(meta = {}) {
    if (!meta.case || typeof meta.case !== 'object') return null;
    return sanitizeCaseMeta(meta.case);
}

function getRuntimeFields(meta = {}) {
    const runtimeResult = resolveProjectRuntime(meta);
    if (!runtimeResult.ok) {
        return {
            runtime: null,
            runtimeImageId: runtimeResult.imageId,
            runtimeSource: runtimeResult.runtimeSource,
            runtimeError: {
                code: runtimeResult.code,
                message: runtimeResult.message
            }
        };
    }

    return {
        runtime: runtimeResult.runtime,
        runtimeImageId: runtimeResult.runtimeImageId,
        runtimeSource: runtimeResult.runtimeSource
    };
}

function getPreviewInfo(fileName, entryType = 'file') {
    if (entryType === 'folder') {
        return {
            extension: '',
            previewKind: 'folder',
            previewSupported: false,
            previewReason: '文件夹暂不支持直接预览'
        };
    }

    const extension = path.extname(String(fileName || '')).toLowerCase();
    if (!extension) {
        return {
            extension: '',
            previewKind: 'unsupported',
            previewSupported: false,
            previewReason: '缺少可识别的文件后缀，暂不支持在线预览'
        };
    }

    if (NOTEBOOK_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'notebook', previewSupported: true, previewReason: '' };
    }
    if (IMAGE_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'image', previewSupported: true, previewReason: '' };
    }
    if (PDF_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'pdf', previewSupported: true, previewReason: '' };
    }
    if (HTML_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'html', previewSupported: true, previewReason: '' };
    }
    if (MARKDOWN_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'markdown', previewSupported: true, previewReason: '' };
    }
    if (GEOJSON_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'geojson', previewSupported: true, previewReason: '' };
    }
    if (TABLE_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'table', previewSupported: true, previewReason: '' };
    }
    if (JSON_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'json', previewSupported: true, previewReason: '' };
    }
    if (CODE_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'code', previewSupported: true, previewReason: '' };
    }
    if (TEXT_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'text', previewSupported: true, previewReason: '' };
    }
    if (ARCHIVE_EXTENSIONS.has(extension)) {
        return { extension, previewKind: 'archive', previewSupported: true, previewReason: '' };
    }

    return {
        extension,
        previewKind: 'unsupported',
        previewSupported: false,
        previewReason: '该类文件暂不支持在线预览'
    };
}

const TREE_PREVIEW_ORDER = {
    folder: 0,
    notebook: 1,
    code: 2,
    markdown: 3,
    table: 4,
    geojson: 5,
    json: 6,
    text: 7,
    image: 8,
    pdf: 9,
    html: 10,
    archive: 11,
    unsupported: 12
};

function compareTreeEntries(a, b) {
    const aOrder = TREE_PREVIEW_ORDER[a.previewKind] ?? 99;
    const bOrder = TREE_PREVIEW_ORDER[b.previewKind] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });
}

function listProjectTree(projectDir, relativeDir = '') {
    const currentDir = relativeDir ? path.join(projectDir, relativeDir) : projectDir;
    if (!fs.existsSync(currentDir)) return [];

    return fs.readdirSync(currentDir, { withFileTypes: true })
        .filter(item => !item.name.startsWith('.'))
        .map(item => {
            const entryType = item.isDirectory() ? 'folder' : 'file';
            const relativePath = relativeDir ? path.posix.join(relativeDir, item.name) : item.name;
            const fullPath = path.join(currentDir, item.name);
            const stats = fs.statSync(fullPath);
            const preview = getPreviewInfo(item.name, entryType);
            const node = {
                name: item.name,
                path: relativePath,
                type: entryType,
                size: stats.size,
                modifiedAt: stats.mtime,
                ...preview
            };

            if (entryType === 'folder') {
                node.children = listProjectTree(projectDir, relativePath);
            }

            return node;
        })
        .sort(compareTreeEntries);
}

function flattenProjectTree(nodes = []) {
    return nodes.flatMap(node => (
        node.type === 'folder'
            ? [node, ...flattenProjectTree(node.children || [])]
            : [node]
    ));
}

function encodePublicFilePath(relativePath = '') {
    return String(relativePath || '')
        .split('/')
        .filter(Boolean)
        .map(segment => encodeURIComponent(segment))
        .join('/');
}

function normalizeBaseUrl(value = '') {
    return String(value || '').trim().replace(/\/+$/, '');
}

function isOpenGmsAvatarUrl(avatarUrl) {
    const source = String(avatarUrl || '').trim();
    if (!source) return false;

    const allowedPrefixes = [
        normalizeBaseUrl(process.env.OPENGMS_AVATAR_BASE_URL),
        normalizeBaseUrl(process.env.OPENGMS_USER_SERVER_URL)
    ].filter(Boolean);

    return allowedPrefixes.some(prefix => source === prefix || source.startsWith(`${prefix}/`));
}

function buildOwnerAvatarUrl(user) {
    const avatarUrl = String(user?.avatarUrl || '').trim();
    if (!avatarUrl) return null;
    if (/^https:\/\//i.test(avatarUrl) && !isOpenGmsAvatarUrl(avatarUrl)) return avatarUrl;
    return `/api/auth/avatar/${encodeURIComponent(String(user.id))}`;
}

function buildOwnerProfile(username, user) {
    if (!user) {
        return { username, displayName: username, avatarUrl: null };
    }

    return {
        username: user.username || username,
        displayName: user.displayName || user.username || username,
        avatarUrl: buildOwnerAvatarUrl(user)
    };
}

async function attachOwnerProfiles(projects, { loadOwner = getUserByUsername } = {}) {
    const owners = Array.from(new Set(projects.map(project => project.owner).filter(Boolean)));
    const profiles = new Map();

    await Promise.all(owners.map(async owner => {
        try {
            const user = await loadOwner(owner);
            profiles.set(owner, buildOwnerProfile(owner, user));
        } catch (error) {
            profiles.set(owner, buildOwnerProfile(owner, null));
        }
    }));

    return projects.map(project => ({
        ...project,
        ownerProfile: profiles.get(project.owner) || project.ownerProfile || buildOwnerProfile(project.owner, null)
    }));
}

function isPublicCaseMeta(meta = {}) {
    return meta.isPublic === true && meta.isCase === true && Boolean(getProjectId(meta));
}

function buildThumbnail(projectId, projectDir) {
    const thumbnail = findProjectThumbnail(projectDir);
    if (!thumbnail) return null;

    return {
        name: thumbnail.name,
        path: thumbnail.path,
        size: thumbnail.size,
        downloadPath: `/api/cases/${encodeURIComponent(projectId)}/files/${encodePublicFilePath(thumbnail.path)}/preview`
    };
}

function buildPublicCaseSummary(project) {
    const { owner, projectName, projectDir, meta } = project || {};
    const projectId = getProjectId(meta);
    if (!owner || !projectName || !projectDir || !isPublicCaseMeta(meta)) return null;

    const caseMeta = getCaseMeta(meta);
    const fileSummary = summarizeProjectFiles(projectDir);

    return {
        projectId,
        id: projectId,
        slug: projectId,
        name: projectName,
        projectName,
        title: caseMeta?.title || meta.name || projectName,
        summary: caseMeta?.summary || meta.description || '',
        description: meta.description || caseMeta?.summary || '',
        domain: caseMeta?.scenario || '',
        tags: Array.isArray(caseMeta?.tags) ? caseMeta.tags : [],
        owner,
        ownerProfile: buildOwnerProfile(owner, null),
        ...fileSummary,
        ...getRuntimeFields(meta),
        isPublic: true,
        isCase: true,
        caseTitle: caseMeta?.title || '',
        case: caseMeta,
        coverImageUrl: '',
        thumbnail: buildThumbnail(projectId, projectDir),
        dataBindingCount: Array.isArray(meta.dataBindings) ? meta.dataBindings.length : 0,
        publicationType: 'case',
        updatedAt: fileSummary.modifiedAt,
        publishedAt: meta.createdAt || fileSummary.createdAt,
        timeLabel: fileSummary.modifiedAt instanceof Date
            ? fileSummary.modifiedAt.toLocaleDateString('en-US')
            : ''
    };
}

function collectPublicCaseProjects({ userDataDir = resolveUserDataDir() } = {}) {
    const root = userDataDir;
    const projects = [];
    if (!fs.existsSync(root)) return projects;

    for (const userEntry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!userEntry.isDirectory()) continue;
        const owner = userEntry.name;
        const ownerDir = path.join(root, owner);

        for (const projectEntry of fs.readdirSync(ownerDir, { withFileTypes: true })) {
            if (!projectEntry.isDirectory() || projectEntry.name.startsWith('.') || projectEntry.name === '__pycache__') {
                continue;
            }

            const projectName = projectEntry.name;
            const projectDir = path.join(ownerDir, projectName);
            const meta = getProjectMeta(projectDir);
            if (!isPublicCaseMeta(meta)) continue;

            projects.push({ owner, projectName, projectDir, meta, projectId: getProjectId(meta) });
        }
    }

    return projects;
}

async function listPublicCaseSummaries(options = {}) {
    const summaries = collectPublicCaseProjects(options)
        .map(buildPublicCaseSummary)
        .filter(Boolean)
        .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    return attachOwnerProfiles(summaries, options);
}

function findPublicCaseByProjectId(projectId, options = {}) {
    const normalizedProjectId = String(projectId || '').trim();
    if (!normalizedProjectId) return null;
    return collectPublicCaseProjects(options)
        .find(project => project.projectId === normalizedProjectId) || null;
}

function findPublicCaseByOwnerProject(owner, projectName, options = {}) {
    const normalizedOwner = String(owner || '').trim();
    const normalizedProjectName = String(projectName || '').trim();
    if (!normalizedOwner || !normalizedProjectName) return null;

    const root = options.userDataDir || resolveUserDataDir();
    const projectDir = path.join(root, normalizedOwner, normalizedProjectName);
    if (!fs.existsSync(projectDir)) return null;

    const meta = getProjectMeta(projectDir);
    if (!isPublicCaseMeta(meta)) return null;

    return {
        owner: normalizedOwner,
        projectName: normalizedProjectName,
        projectDir,
        meta,
        projectId: getProjectId(meta)
    };
}

function buildPublicCaseDetail(project) {
    const summary = buildPublicCaseSummary(project);
    if (!summary) return null;

    const fileTree = listProjectTree(project.projectDir);
    const files = flattenProjectTree(fileTree);

    return {
        ...summary,
        files,
        fileTree,
        forkedFrom: project.meta.forkedFrom || null,
        sourceCase: project.meta.sourceCase || null
    };
}

function normalizePublicFilePath(filePath) {
    if (Array.isArray(filePath)) return filePath.join('/');
    return String(filePath || '');
}

function resolvePublicCaseFile(projectId, filePath, options = {}) {
    const project = findPublicCaseByProjectId(projectId, options);
    if (!project) {
        return { error: 'Case project not found', status: 404 };
    }

    const resolvedProjectDir = path.resolve(project.projectDir);
    const decodedPath = decodeURIComponent(normalizePublicFilePath(filePath));
    const fullPath = path.resolve(project.projectDir, decodedPath);

    if (fullPath !== resolvedProjectDir && !fullPath.startsWith(`${resolvedProjectDir}${path.sep}`)) {
        return { error: 'Access denied', status: 403 };
    }

    if (!fs.existsSync(fullPath)) {
        return { error: 'File not found', status: 404 };
    }

    return {
        ...project,
        resolvedProjectDir,
        decodedPath,
        fullPath
    };
}

function renderNotebookPreviewHtml(filePath, options = {}) {
    const maxBuffer = Number.parseInt(
        options.maxBuffer || process.env.NOTEBOOK_PREVIEW_MAX_BUFFER || `${DEFAULT_NOTEBOOK_PREVIEW_MAX_BUFFER}`,
        10
    );

    return new Promise((resolve, reject) => {
        execFile(
            'jupyter',
            ['nbconvert', '--to', 'html', '--template', 'lab', '--stdout', filePath],
            {
                maxBuffer: Number.isFinite(maxBuffer) ? maxBuffer : DEFAULT_NOTEBOOK_PREVIEW_MAX_BUFFER,
                env: {
                    ...process.env,
                    PYTHONIOENCODING: 'utf-8'
                }
            },
            (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(stderr || error.message || 'Notebook preview render failed'));
                    return;
                }
                resolve(stdout);
            }
        );
    });
}

module.exports = {
    buildPublicCaseDetail,
    buildPublicCaseSummary,
    collectPublicCaseProjects,
    findPublicCaseByOwnerProject,
    findPublicCaseByProjectId,
    getCaseMeta,
    getPreviewInfo,
    getProjectId,
    getProjectMeta,
    isPublicCaseMeta,
    listProjectTree,
    listPublicCaseSummaries,
    renderNotebookPreviewHtml,
    resolvePublicCaseFile,
    resolveUserDataDir
};
