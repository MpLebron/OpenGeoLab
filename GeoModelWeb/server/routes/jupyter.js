/**
 * Jupyter Management Routes (Docker Mode)
 * 使用 Docker 容器部署 JupyterLab
 */
const express = require('express');
const { exec, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();
const { getUserByUsername } = require('../db/users');
const {
    DEFAULT_IMAGE,
    getRuntimeCatalog,
    buildDockerBuildCommand,
    inspectRuntimeCatalogImage,
    buildProjectRuntimeMeta,
    resolveProjectRuntime,
    checkDockerDaemon,
    inspectRuntimeReadiness,
    buildDockerCommandEnv,
    buildOpenGmsCredentialEnv
} = require('../utils/jupyterRuntime');
const {
    dockerContainerExists,
    isDockerContainerRunning,
    removeDockerContainer
} = require('../utils/dockerContainerState');
const { normalizeOpenGmsModelFavorite } = require('../utils/openGmsModelLinks');
const { summarizeProjectFiles } = require('../utils/projectFileSummary');
const { findProjectThumbnail } = require('../utils/projectThumbnail');
const {
    buildJupyterBasePath,
    buildJupyterLaunchUrl,
    buildJupyterServerId,
    buildLoopbackDockerPortBinding,
    defaultJupyterGatewayRegistry,
    normalizePublicOrigin
} = require('../utils/jupyterGateway');
const {
    buildDownloadContentDisposition,
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
    seedMockMyDataIfEmpty,
    writeProjectDataManifest
} = require('../utils/myDataLibrary');
const { initializeProjectStarter } = require('../utils/projectStarterTemplates');

// 文件上传配置
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

function cleanupTempUpload(file) {
    if (!file || !file.path) return;
    try {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    } catch (error) {
        console.warn('[Upload Data] Failed to clean temporary file:', error.message);
    }
}

// 数据服务器配置
const DATA_SERVER_URL = process.env.DATA_SERVER_URL || 'http://221.224.35.86:38083/data';
const API_TOKEN = process.env.API_TOKEN || process.env.OGMS_TOKEN || '';
const OGMS_PORTAL_URL = process.env.OGMS_PORTAL_URL || 'http://222.192.7.75';
const NOTEBOOK_PREVIEW_MAX_BUFFER = Number.parseInt(
    process.env.NOTEBOOK_PREVIEW_MAX_BUFFER || `${96 * 1024 * 1024}`,
    10
);

// 配置
const JUPYTER_BASE_PORT = 8888;
const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || process.env.BACKEND_URL || '';
const JUPYTER_PUBLIC_BASE_PATH = process.env.JUPYTER_PUBLIC_BASE_PATH || '/jupyter';
const JUPYTER_BIND_HOST = process.env.JUPYTER_BIND_HOST || '127.0.0.1';
let USER_DATA_DIR = process.env.USER_DATA_DIR || path.join(__dirname, '..', 'jupyter-data');
if (!path.isAbsolute(USER_DATA_DIR)) {
    USER_DATA_DIR = path.join(__dirname, '..', USER_DATA_DIR);
}

// GeoModel 扩展路径
const GEOMODEL_EXTENSION_DIR = path.join(__dirname, '..', 'docker');
const GEOMODEL_EXTENSION_WHL = 'jupyterlab_geomodel-0.1.0-py3-none-any.whl';

// 用户 Jupyter 容器信息存储
const jupyterContainers = new Map();

// 确保用户数据目录存在
if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

// 生成随机 token
function generateToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 48; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function shellQuote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function redactDockerCommand(command) {
    return String(command).replace(
        /(-e\s+(?:OGMS_TOKEN|OPENGMS_ROOF_PV_TOKEN|PYGEOMODEL_[A-Z0-9_]*API_KEY|PYGEOMODEL_CONSENSUS_API_KEY)=)'[^']*'/g,
        '$1[redacted]'
    );
}

// 执行 Docker 命令
function runDockerCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { env: buildDockerCommandEnv() }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stderr });
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// 检查 Docker 是否可用
async function checkDockerAvailable() {
    const dockerStatus = await checkDockerDaemon(runDockerCommand);
    return dockerStatus.ok;
}

// 检查容器是否在运行
async function isContainerRunning(containerName) {
    return isDockerContainerRunning(containerName, runDockerCommand);
}

// 检查容器是否存在，包括已经退出但仍占用名称的容器
async function containerExists(containerName) {
    return dockerContainerExists(containerName, runDockerCommand);
}

async function removeContainer(containerName, options = {}) {
    return removeDockerContainer(containerName, runDockerCommand, options);
}

// 获取容器的端口映射
async function getContainerPort(containerName) {
    try {
        const result = await runDockerCommand(`docker port ${containerName} 8888`);
        const match = result.match(/:(\d+)/);
        return match ? parseInt(match[1]) : null;
    } catch (e) {
        return null;
    }
}

// 查找可用端口
async function findAvailablePort(startPort) {
    const net = require('net');
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

// 生成容器名称（基于用户和项目）
function getContainerName(username, projectName) {
    if (projectName) {
        return `jupyter-${username}-${projectName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    return `jupyter-${username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function sanitizeContainerNameSegment(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function findDirectoryByContainerSegment(parentDir, segment) {
    try {
        if (!segment || !fs.existsSync(parentDir)) return '';
        const entries = fs.readdirSync(parentDir, { withFileTypes: true });
        const match = entries.find(entry => (
            entry.isDirectory() && sanitizeContainerNameSegment(entry.name) === segment
        ));
        return match?.name || '';
    } catch (error) {
        return '';
    }
}

function parseWorkspaceInfoFromContainerName(containerName = '') {
    const match = String(containerName || '').match(/^jupyter-([^-]+)-(.+)$/i);
    if (!match) {
        return null;
    }

    const userSegment = match[1];
    const projectSegment = match[2];
    const userName = findDirectoryByContainerSegment(USER_DATA_DIR, userSegment) || userSegment;
    const projectName = findDirectoryByContainerSegment(
        path.join(USER_DATA_DIR, userName),
        projectSegment
    ) || projectSegment;

    return {
        containerName,
        userName,
        username: userName,
        projectName
    };
}

function getProjectWorkspaceId(meta = {}) {
    return String(meta.workspaceId || meta.projectId || meta.uuid || meta.id || '').trim();
}

function ensureProjectWorkspaceId(projectPath, meta = {}) {
    const existingWorkspaceId = getProjectWorkspaceId(meta);
    if (existingWorkspaceId) {
        if (!meta.projectId) {
            meta.projectId = existingWorkspaceId;
            saveProjectMeta(projectPath, meta);
        }
        return existingWorkspaceId;
    }

    const projectId = crypto.randomUUID();
    meta.projectId = projectId;
    saveProjectMeta(projectPath, meta);
    return projectId;
}

function resolveUserProject(username, projectIdentifier = '') {
    const userDir = path.join(USER_DATA_DIR, username);
    const identifier = String(projectIdentifier || '').trim();
    if (!identifier || !fs.existsSync(userDir)) {
        return null;
    }

    const directProjectDir = path.join(userDir, identifier);
    if (fs.existsSync(directProjectDir) && fs.statSync(directProjectDir).isDirectory()) {
        const meta = getProjectMeta(directProjectDir);
        return {
            projectName: identifier,
            projectDir: directProjectDir,
            meta,
            projectId: ensureProjectWorkspaceId(directProjectDir, meta)
        };
    }

    const projectEntries = fs.readdirSync(userDir, { withFileTypes: true });
    for (const entry of projectEntries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === '__pycache__') {
            continue;
        }

        const projectDir = path.join(userDir, entry.name);
        const meta = getProjectMeta(projectDir);
        const projectId = getProjectWorkspaceId(meta);
        if (projectId !== identifier) continue;

        return {
            projectName: entry.name,
            projectDir,
            meta,
            projectId: ensureProjectWorkspaceId(projectDir, meta)
        };
    }

    return null;
}

function findProjectByWorkspaceId(workspaceId = '') {
    const normalizedWorkspaceId = String(workspaceId || '').trim();
    if (!normalizedWorkspaceId || !fs.existsSync(USER_DATA_DIR)) {
        return null;
    }

    const userEntries = fs.readdirSync(USER_DATA_DIR, { withFileTypes: true });
    for (const userEntry of userEntries) {
        if (!userEntry.isDirectory()) continue;

        const userName = userEntry.name;
        const userDir = path.join(USER_DATA_DIR, userName);
        const projectEntries = fs.readdirSync(userDir, { withFileTypes: true });
        for (const projectEntry of projectEntries) {
            if (!projectEntry.isDirectory()) continue;

            const projectName = projectEntry.name;
            const projectDir = path.join(userDir, projectName);
            const meta = getProjectMeta(projectDir);
            if (getProjectWorkspaceId(meta) !== normalizedWorkspaceId) continue;

            return {
                userName,
                username: userName,
                projectName,
                projectDir,
                meta,
                containerName: getContainerName(userName, projectName)
            };
        }
    }

    return null;
}

async function fetchProjectDataDownloadStream(url) {
    const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 30000,
        maxRedirects: 5
    });
    return response.data;
}

async function materializeProjectDataForJupyter(projectDir, meta, dataList, { onlyBindingId = '' } = {}) {
    const bindings = Array.isArray(meta.dataBindings) ? meta.dataBindings : [];
    const bindingById = new Map(bindings.map(binding => [String(binding.id), binding]));
    const resolvedBindings = resolveProjectDataBindings(meta, dataList, { projectDir });
    const warnings = [];

    for (const resolvedBinding of resolvedBindings) {
        if (onlyBindingId && String(resolvedBinding.id) !== String(onlyBindingId)) {
            continue;
        }

        const targetBinding = bindingById.get(String(resolvedBinding.id));
        if (!targetBinding) {
            continue;
        }

        Object.assign(targetBinding, {
            name: resolvedBinding.name,
            sourcePath: resolvedBinding.sourcePath,
            metadata: resolvedBinding.metadata || targetBinding.metadata || {},
            downloadable: Boolean(resolvedBinding.downloadable),
            url: resolvedBinding.url || '',
            sourceAvailable: Boolean(resolvedBinding.sourceAvailable)
        });

        if (isBundledCaseDataBinding(resolvedBinding)) {
            Object.assign(targetBinding, {
                bindingType: resolvedBinding.bindingType,
                source: 'case',
                materialized: Boolean(resolvedBinding.materialized),
                localPath: resolvedBinding.localPath || resolvedBinding.mountPath,
                materializedAt: resolvedBinding.materializedAt || targetBinding.materializedAt || '',
                error: resolvedBinding.error || '',
                status: resolvedBinding.status || 'ready'
            });

            if (!resolvedBinding.sourceAvailable) {
                warnings.push({
                    bindingId: targetBinding.id,
                    code: 'source_missing',
                    message: targetBinding.error || 'Bundled case data file is missing from this project'
                });
            }
            continue;
        }

        if (!resolvedBinding.sourceAvailable) {
            Object.assign(targetBinding, {
                materialized: false,
                localPath: '',
                error: 'The source data asset is no longer available',
                status: 'source_missing'
            });
            warnings.push({
                bindingId: targetBinding.id,
                code: 'source_missing',
                message: targetBinding.error
            });
            continue;
        }

        if (!resolvedBinding.downloadable || !resolvedBinding.url) {
            Object.assign(targetBinding, {
                materialized: false,
                localPath: '',
                error: 'This data asset does not have a downloadable source'
            });
            if (onlyBindingId) {
                warnings.push({
                    bindingId: targetBinding.id,
                    code: 'download_unavailable',
                    message: targetBinding.error
                });
            }
            continue;
        }

        let localFileExists = false;
        try {
            const localPath = targetBinding.localPath || targetBinding.mountPath;
            const resolvedLocal = resolveProjectDataLocalPath(projectDir, localPath);
            localFileExists = fs.existsSync(resolvedLocal.targetPath);
            if (localFileExists && targetBinding.materialized) {
                targetBinding.localPath = resolvedLocal.mountPath;
                targetBinding.error = '';
                continue;
            }
        } catch (error) {
            // Fall through to materialization, which will report the invalid mount path.
        }

        const result = await materializeProjectDataBinding(projectDir, targetBinding, {
            fetchStream: fetchProjectDataDownloadStream
        });

        if (!result.ok) {
            warnings.push({
                bindingId: targetBinding.id,
                code: result.code,
                message: result.message
            });
        }
    }

    const manifest = writeProjectDataManifest(projectDir, meta, dataList);
    return { manifest, warnings };
}

/**
 * GET /api/jupyter/status
 * 获取当前项目的 Jupyter 状态
 */
router.get('/status', async (req, res) => {
    const userId = req.user.userId;
    const username = req.user.username;
    const { projectName } = req.query;

    if (!projectName) {
        return res.json({
            status: 'stopped',
            message: 'No project specified'
        });
    }

    const resolvedProject = resolveUserProject(username, projectName);
    const canonicalProjectName = resolvedProject?.projectName || projectName;
    const containerName = getContainerName(username, canonicalProjectName);
    const containerKey = `${userId}-${canonicalProjectName}`;
    const workspaceId = resolvedProject
        ? resolvedProject.projectId
        : buildJupyterServerId(username, canonicalProjectName);

    try {
        const running = await isContainerRunning(containerName);

        if (!running) {
            jupyterContainers.delete(containerKey);
            defaultJupyterGatewayRegistry.unregister(workspaceId);
            return res.json({
                status: 'stopped',
                message: 'No Jupyter container running for this project'
            });
        }

        // 获取存储的信息或从容器获取
        let containerInfo = jupyterContainers.get(containerKey);
        if (!containerInfo) {
            const port = await getContainerPort(containerName);
            if (port) {
                const publicOrigin = normalizePublicOrigin(PUBLIC_ORIGIN, req);
                const proxyPath = buildJupyterBasePath(workspaceId, JUPYTER_PUBLIC_BASE_PATH);
                const url = buildJupyterLaunchUrl({
                    publicOrigin,
                    basePath: JUPYTER_PUBLIC_BASE_PATH,
                    workspaceId,
                    token: 'check-container-logs',
                    containerName,
                    username,
                    projectName: canonicalProjectName
                });
                defaultJupyterGatewayRegistry.register({
                    workspaceId,
                    port,
                    containerName,
                    username,
                    projectName: canonicalProjectName
                });
                containerInfo = {
                    port,
                    token: 'check-container-logs',
                    url,
                    publicUrl: url,
                    proxyPath,
                    workspaceId
                };
            }
        }

        if (containerInfo) {
            return res.json({
                status: 'running',
                url: containerInfo.url,
                publicUrl: containerInfo.publicUrl || containerInfo.url,
                proxyPath: containerInfo.proxyPath,
                workspaceId: containerInfo.workspaceId || workspaceId,
                token: containerInfo.token,
                port: containerInfo.port,
                containerName,
                projectName: canonicalProjectName
            });
        }

        return res.json({
            status: 'running',
            message: 'Container is running but unable to get details',
            containerName,
            projectName: canonicalProjectName
        });
    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({
            error: 'Failed to check Jupyter status',
            message: error.message
        });
    }
});

/**
 * GET /api/jupyter/images
 * 获取可用的 Jupyter 镜像列表
 */
router.get('/images', async (req, res) => {
    try {
        const runtimeCatalog = getRuntimeCatalog();
        const dockerAvailable = await checkDockerAvailable();
        if (!dockerAvailable) {
            return res.json({
                images: runtimeCatalog.map(config => ({
                    ...config,
                    available: false,
                    status: 'missing',
                    installedSize: '',
                    size: config.estimatedSize || '',
                    imageId: '',
                    imageCreatedAt: '',
                    unavailableReason: 'docker_not_running'
                })),
                default: DEFAULT_IMAGE,
                dockerAvailable: false,
                dockerMessage: 'Docker Desktop 未启动或 Docker daemon 无法连接。请先启动 Docker 后再选择运行环境。'
            });
        }

        // 检查每个镜像是否已存在
        const imagesWithStatus = await Promise.all(
            runtimeCatalog.map(config => inspectRuntimeCatalogImage(config, runDockerCommand))
        );

        res.json({
            images: imagesWithStatus,
            default: DEFAULT_IMAGE,
            dockerAvailable: true,
            dockerMessage: ''
        });
    } catch (error) {
        console.error('Error getting images:', error);
        res.status(500).json({ error: 'Failed to get image list' });
    }
});

/**
 * POST /api/jupyter/start
 * 启动 JupyterLab Docker 容器（基于项目）
 */
router.post('/start', async (req, res) => {
    const userId = req.user.userId;
    const username = req.user.username;
    const { projectName } = req.body;

    if (!projectName) {
        return res.status(400).json({ error: '需要指定项目名称' });
    }

    try {
        // 检查项目是否存在
        const resolvedProject = resolveUserProject(username, projectName);
        if (!resolvedProject) {
            return res.status(404).json({ error: '项目不存在' });
        }

        const canonicalProjectName = resolvedProject.projectName;
        const projectDir = resolvedProject.projectDir;
        const projectMeta = resolvedProject.meta;
        const containerName = getContainerName(username, canonicalProjectName);
        const containerKey = `${userId}-${canonicalProjectName}`;
        const workspaceId = resolvedProject.projectId;
        const proxyPath = buildJupyterBasePath(workspaceId, JUPYTER_PUBLIC_BASE_PATH);
        let projectDataManifest = null;
        const dataBindingWarnings = [];
        try {
            const { dataList } = getUserDataList(userId);
            projectMeta.name = projectMeta.name || canonicalProjectName;
            const prepared = await materializeProjectDataForJupyter(
                projectDir,
                projectMeta,
                dataList
            );
            projectDataManifest = prepared.manifest;
            dataBindingWarnings.push(...prepared.warnings);
            if (Array.isArray(projectMeta.dataBindings)) {
                saveProjectMeta(projectDir, projectMeta);
            }
        } catch (manifestError) {
            console.warn('Failed to prepare Project Data manifest:', manifestError.message);
            dataBindingWarnings.push({
                code: 'project_data_manifest_failed',
                message: manifestError.message
            });
        }

        const runtimeResult = resolveProjectRuntime(projectMeta);
        if (!runtimeResult.ok) {
            return res.status(runtimeResult.status).json({
                error: runtimeResult.message,
                code: runtimeResult.code,
                imageId: runtimeResult.imageId,
                runtimeSource: runtimeResult.runtimeSource
            });
        }

        const runtimeStatus = await inspectRuntimeReadiness(runtimeResult.runtime, runDockerCommand);
        if (!runtimeStatus.ok) {
            return res.status(runtimeStatus.status).json({
                error: runtimeStatus.message,
                message: runtimeStatus.message,
                code: runtimeStatus.code,
                imageId: runtimeStatus.imageId,
                imageName: runtimeStatus.imageName,
                runtime: runtimeResult.runtime,
                runtimeSource: runtimeResult.runtimeSource
            });
        }

        const imageName = runtimeResult.runtime.imageName;
        console.log(`Using project runtime: ${imageName} (${runtimeResult.runtime.label})`);

        // 检查容器是否已在运行
        const running = await isContainerRunning(containerName);
        if (running) {
            const containerInfo = jupyterContainers.get(containerKey);
            if (containerInfo) {
                defaultJupyterGatewayRegistry.register({
                    workspaceId: containerInfo.workspaceId || workspaceId,
                    port: containerInfo.port,
                    containerName,
                    username,
                    projectName: canonicalProjectName
                });
                return res.json({
                    status: 'already_running',
                    url: containerInfo.url,
                    publicUrl: containerInfo.publicUrl || containerInfo.url,
                    proxyPath: containerInfo.proxyPath || proxyPath,
                    workspaceId: containerInfo.workspaceId || workspaceId,
                    token: containerInfo.token,
                    port: containerInfo.port,
                    containerName,
                    projectName: canonicalProjectName,
                    runtime: containerInfo.runtime || runtimeResult.runtime,
                    runtimeSource: containerInfo.runtimeSource || runtimeResult.runtimeSource,
                    dataBindingManifest: projectDataManifest,
                    dataBindingWarnings
                });
            }
            // 容器在运行但没有信息，停止后重新启动
            await runDockerCommand(`docker stop ${containerName}`);
            await removeContainer(containerName);
        } else if (await containerExists(containerName)) {
            console.log(`Removing stale Jupyter container before restart: ${containerName}`);
            await removeContainer(containerName);
        }

        // 生成 token 和查找端口
        const token = generateToken();
        const port = await findAvailablePort(JUPYTER_BASE_PORT);
        const openGeoLabApi = process.env.JUPYTER_OPENGEOLAB_API || process.env.OPENGEOLAB_API || 'http://host.docker.internal:3000/api';
        const portBinding = buildLoopbackDockerPortBinding(port, JUPYTER_BIND_HOST);
        const openGmsCredentialEnv = buildOpenGmsCredentialEnv();
        const openGmsCredentialArgs = Object.entries(openGmsCredentialEnv).map(
            ([key, value]) => `-e ${key}=${shellQuote(value)}`
        );

        // 将 Windows 项目路径转换为 Docker 可用的格式
        let dockerVolumePath = projectDir;
        if (process.platform === 'win32') {
            dockerVolumePath = projectDir.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, letter) => `/${letter.toLowerCase()}`);
        }

        console.log(`Starting JupyterLab container for project ${canonicalProjectName}...`);
        console.log(`  Container: ${containerName}`);
        console.log(`  Port: ${port}`);
        console.log(`  Volume: ${dockerVolumePath}:/home/jovyan/work`);

        // 启动 Docker 容器 - 使用预装了扩展的自定义镜像
        // 项目目录挂载到 /home/jovyan/work
        const dockerCommand = [
            'docker run -d',
            `--name ${containerName}`,
            '--add-host=host.docker.internal:host-gateway',
            `-p ${shellQuote(portBinding)}`,
            `-v ${shellQuote(`${dockerVolumePath}:/home/jovyan/work`)}`,
            '-w /home/jovyan/work',
            '-e JUPYTER_ENABLE_LAB=yes',
            `-e OPENGEOLAB_API=${shellQuote(openGeoLabApi)}`,
            `-e JUPYTER_TOKEN=${shellQuote(token)}`,
            ...openGmsCredentialArgs,
            '--user root',
            '-e CHOWN_HOME=yes',
            '-e CHOWN_HOME_OPTS="-R"',
            '-e GRANT_SUDO=yes',
            imageName,  // 使用选择的镜像
            'start-notebook.sh',
            `--ServerApp.base_url=${shellQuote(proxyPath)}`,
            '--ServerApp.trust_xheaders=True'
        ].join(' ');

        console.log('Docker command:', redactDockerCommand(dockerCommand));

        const containerId = await runDockerCommand(dockerCommand);
        console.log(`Container started: ${containerId.substring(0, 12)}`);

        // URL 使用配置的主机地址，支持局域网访问
        // 注意：这里的 token 是 Jupyter 的认证 token
        // 用户的 GeoModelWeb JWT 需要从请求头获取，传给扩展用于访问收藏 API
        const authHeader = req.headers.authorization || req.headers['authorization'] || '';
        const jwtToken = authHeader.replace('Bearer ', '');
        console.log('  JWT Token for extension:', jwtToken ? 'present' : 'missing');
        const publicOrigin = normalizePublicOrigin(PUBLIC_ORIGIN, req);
        const url = buildJupyterLaunchUrl({
            publicOrigin,
            basePath: JUPYTER_PUBLIC_BASE_PATH,
            workspaceId,
            token,
            geomodelToken: jwtToken,
            containerName,
            username,
            projectName: canonicalProjectName
        });

        defaultJupyterGatewayRegistry.register({
            workspaceId,
            port,
            containerName,
            username,
            projectName: canonicalProjectName
        });

        // 存储容器信息
        jupyterContainers.set(containerKey, {
            containerId: containerId.substring(0, 12),
            containerName,
            port,
            token,
            url,
            publicUrl: url,
            proxyPath,
            workspaceId,
            username,
            projectName: canonicalProjectName,
            runtime: runtimeResult.runtime,
            runtimeSource: runtimeResult.runtimeSource,
            startTime: new Date()
        });

        // 等待 Jupyter 启动
        await new Promise(resolve => setTimeout(resolve, 2000));

        res.json({
            status: 'started',
            url,
            publicUrl: url,
            proxyPath,
            workspaceId,
            token,
            port,
            containerName,
            projectName: canonicalProjectName,
            runtime: runtimeResult.runtime,
            runtimeSource: runtimeResult.runtimeSource,
            dataBindingManifest: projectDataManifest,
            dataBindingWarnings,
            message: 'JupyterLab container is starting...'
        });
    } catch (error) {
        console.error('Error starting Jupyter container:', error);
        res.status(500).json({
            error: 'Failed to start JupyterLab',
            message: error.stderr || error.message || 'Unknown error'
        });
    }
});

/**
 * GET /api/jupyter/workspaces/:workspaceId
 * Resolve public Jupyter gateway workspace metadata without repeating it in the launch URL.
 */
router.get('/workspaces/:workspaceId', async (req, res) => {
    const workspaceId = req.params.workspaceId;
    if (!workspaceId) {
        return res.status(400).json({ error: 'Invalid workspace id' });
    }

    const registered = defaultJupyterGatewayRegistry.get(workspaceId);
    if (registered) {
        return res.json({
            found: true,
            workspaceId,
            containerName: registered.containerName || workspaceId,
            userName: registered.username || registered.userName || '',
            username: registered.username || registered.userName || '',
            projectName: registered.projectName || '',
            port: registered.port || null,
            proxyPath: buildJupyterBasePath(workspaceId, JUPYTER_PUBLIC_BASE_PATH)
        });
    }

    try {
        const project = findProjectByWorkspaceId(workspaceId);
        if (project) {
            const running = await isContainerRunning(project.containerName);
            const port = running ? await getContainerPort(project.containerName) : null;
            if (port) {
                defaultJupyterGatewayRegistry.register({
                    workspaceId,
                    port,
                    containerName: project.containerName,
                    username: project.userName,
                    projectName: project.projectName
                });
            }

            return res.json({
                found: true,
                workspaceId,
                containerName: project.containerName,
                userName: project.userName,
                username: project.userName,
                projectName: project.projectName,
                port: port || null,
                proxyPath: buildJupyterBasePath(workspaceId, JUPYTER_PUBLIC_BASE_PATH)
            });
        }

        const containerCandidates = [
            workspaceId,
            workspaceId.startsWith('jupyter-') ? workspaceId : `jupyter-${workspaceId}`
        ];
        const runningContainerName = await (async () => {
            for (const candidate of containerCandidates) {
                if (await isContainerRunning(candidate)) {
                    return candidate;
                }
            }
            return '';
        })();

        if (runningContainerName) {
            const port = await getContainerPort(runningContainerName);
            const parsed = parseWorkspaceInfoFromContainerName(runningContainerName) || {};

            if (port) {
                defaultJupyterGatewayRegistry.register({
                    workspaceId,
                    port,
                    containerName: runningContainerName,
                    username: parsed.userName || '',
                    projectName: parsed.projectName || ''
                });
            }

            return res.json({
                found: true,
                workspaceId,
                containerName: runningContainerName,
                userName: parsed.userName || '',
                username: parsed.userName || '',
                projectName: parsed.projectName || '',
                port: port || null,
                proxyPath: buildJupyterBasePath(workspaceId, JUPYTER_PUBLIC_BASE_PATH)
            });
        }
    } catch (error) {
        console.warn('[Jupyter] Workspace metadata lookup failed:', error.message || error);
    }

    return res.json({ found: false, workspaceId });
});

/**
 * GET /api/jupyter/container-by-port/:port
 * 通过端口号查询容器信息（用于扩展自动识别当前容器）
 */
router.get('/container-by-port/:port', async (req, res) => {
    const port = parseInt(req.params.port);

    if (!port || isNaN(port)) {
        return res.status(400).json({ error: 'Invalid port number' });
    }

    try {
        // 从存储的容器信息中查找
        for (const [key, info] of jupyterContainers.entries()) {
            if (info.port === port) {
                return res.json({
                    found: true,
                    containerName: info.containerName,
                    userName: info.username,
                    projectName: info.projectName,
                    port: info.port
                });
            }
        }

        // 如果内存中没有，尝试通过 docker 命令查找
        try {
            const result = await runDockerCommand(
                `docker ps --filter "publish=${port}" --format "{{.Names}}"`
            );
            if (result) {
                const containerName = result.trim().split('\n')[0];
                const parsed = parseWorkspaceInfoFromContainerName(containerName);
                if (parsed) {
                    return res.json({
                        found: true,
                        containerName,
                        userName: parsed.userName,
                        projectName: parsed.projectName,
                        port: port
                    });
                }
            }
        } catch (e) {
            console.log('[Jupyter] Docker query failed:', e.message);
        }

        res.json({ found: false });
    } catch (error) {
        console.error('Error finding container by port:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/jupyter/stop
 * 停止 JupyterLab Docker 容器（基于项目）
 */
router.post('/stop', async (req, res) => {
    const userId = req.user.userId;
    const username = req.user.username;
    const { projectName } = req.body;

    if (!projectName) {
        return res.status(400).json({ error: '需要指定项目名称' });
    }

    const resolvedProject = resolveUserProject(username, projectName);
    const canonicalProjectName = resolvedProject?.projectName || projectName;
    const containerName = getContainerName(username, canonicalProjectName);
    const containerKey = `${userId}-${canonicalProjectName}`;
    const workspaceId = resolvedProject
        ? resolvedProject.projectId
        : buildJupyterServerId(username, canonicalProjectName);

    try {
        const running = await isContainerRunning(containerName);

        if (!running) {
            jupyterContainers.delete(containerKey);
            defaultJupyterGatewayRegistry.unregister(workspaceId);
            return res.json({
                status: 'not_running',
                message: 'No Jupyter container to stop'
            });
        }

        console.log(`Stopping container ${containerName}...`);

        // 停止并删除容器
        await runDockerCommand(`docker stop ${containerName}`);
        await runDockerCommand(`docker rm ${containerName}`);

        jupyterContainers.delete(containerKey);
        defaultJupyterGatewayRegistry.unregister(workspaceId);

        res.json({
            status: 'stopped',
            message: 'JupyterLab container stopped successfully'
        });
    } catch (error) {
        console.error('Error stopping Jupyter container:', error);
        res.status(500).json({
            error: 'Failed to stop JupyterLab',
            message: error.stderr || error.message
        });
    }
});

/**
 * 读取项目元信息
 */
function getProjectMeta(projectPath) {
    const metaPath = path.join(projectPath, '.project.json');
    if (fs.existsSync(metaPath)) {
        try {
            return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch (e) {
            return {};
        }
    }
    return {};
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

function getRequestedRuntimeImageId(body = {}) {
    return (
        body.runtime?.imageId ||
        body.runtimeImageId ||
        body.environmentId ||
        body.imageId ||
        DEFAULT_IMAGE
    );
}

/**
 * 保存项目元信息
 */
function saveProjectMeta(projectPath, meta) {
    const metaPath = path.join(projectPath, '.project.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
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

function getCaseMeta(meta) {
    if (!meta || !meta.case || typeof meta.case !== 'object') return null;
    return sanitizeCaseMeta(meta.case);
}

const SHARED_NOTEBOOK_EXTENSIONS = new Set(['.ipynb']);
const SHARED_CODE_EXTENSIONS = new Set([
    '.py', '.r', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs',
    '.sh', '.bash', '.zsh', '.sql', '.jl', '.m'
]);
const SHARED_TEXT_EXTENSIONS = new Set([
    '.md', '.txt', '.json', '.geojson', '.csv', '.tsv', '.xml',
    '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.log',
    '.html', '.css', '.scss', '.less'
]);
const SHARED_UNSUPPORTED_EXTENSIONS = new Set([
    '.tif', '.tiff', '.geotiff', '.nc', '.h5', '.hdf5', '.grd',
    '.zip', '.rar', '.7z', '.tar', '.gz', '.pdf', '.doc', '.docx',
    '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg',
    '.gif', '.bmp', '.webp', '.svg'
]);

function getSharedPreviewInfo(fileName, entryType = 'file') {
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

    if (SHARED_NOTEBOOK_EXTENSIONS.has(extension)) {
        return {
            extension,
            previewKind: 'notebook',
            previewSupported: true,
            previewReason: ''
        };
    }

    if (SHARED_CODE_EXTENSIONS.has(extension)) {
        return {
            extension,
            previewKind: 'code',
            previewSupported: true,
            previewReason: ''
        };
    }

    if (SHARED_TEXT_EXTENSIONS.has(extension)) {
        return {
            extension,
            previewKind: 'text',
            previewSupported: true,
            previewReason: ''
        };
    }

    if (SHARED_UNSUPPORTED_EXTENSIONS.has(extension)) {
        return {
            extension,
            previewKind: 'unsupported',
            previewSupported: false,
            previewReason: '该类文件暂不支持在线预览'
        };
    }

    return {
        extension,
        previewKind: 'unsupported',
        previewSupported: false,
        previewReason: '当前文件格式暂不支持在线预览'
    };
}

function resolveSharedProjectFile(owner, projectName, filePath) {
    const projectDir = path.join(USER_DATA_DIR, owner, projectName);
    if (!fs.existsSync(projectDir)) {
        return { error: '项目不存在', status: 404 };
    }

    const meta = getProjectMeta(projectDir);
    if (!meta.isPublic) {
        return { error: '该项目未公开', status: 403 };
    }

    const resolvedProjectDir = path.resolve(projectDir);
    const decodedPath = decodeURIComponent(normalizePublicWorkspaceFilePath(filePath));
    const fullPath = path.resolve(projectDir, decodedPath);

    if (fullPath !== resolvedProjectDir && !fullPath.startsWith(`${resolvedProjectDir}${path.sep}`)) {
        return { error: '非法路径', status: 403 };
    }

    if (!fs.existsSync(fullPath)) {
        return { error: '文件不存在', status: 404 };
    }

    return {
        projectDir,
        meta,
        resolvedProjectDir,
        decodedPath,
        fullPath
    };
}

function normalizePublicWorkspaceFilePath(filePath) {
    if (Array.isArray(filePath)) {
        return filePath.join('/');
    }

    return String(filePath || '');
}

function renderNotebookPreviewHtml(filePath) {
    return new Promise((resolve, reject) => {
        execFile(
            'jupyter',
            ['nbconvert', '--to', 'html', '--template', 'lab', '--stdout', filePath],
            {
                maxBuffer: Number.isFinite(NOTEBOOK_PREVIEW_MAX_BUFFER)
                    ? NOTEBOOK_PREVIEW_MAX_BUFFER
                    : 96 * 1024 * 1024,
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

const SHARED_TREE_PREVIEW_ORDER = {
    folder: 0,
    notebook: 1,
    code: 2,
    text: 3,
    unsupported: 4
};

function compareSharedTreeEntries(a, b) {
    const aOrder = SHARED_TREE_PREVIEW_ORDER[a.previewKind] ?? 99;
    const bOrder = SHARED_TREE_PREVIEW_ORDER[b.previewKind] ?? 99;

    if (aOrder !== bOrder) {
        return aOrder - bOrder;
    }

    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });
}

function listSharedProjectTree(projectDir, relativeDir = '') {
    const currentDir = relativeDir ? path.join(projectDir, relativeDir) : projectDir;

    return fs.readdirSync(currentDir, { withFileTypes: true })
        .filter(item => !item.name.startsWith('.'))
        .map(item => {
            const entryType = item.isDirectory() ? 'folder' : 'file';
            const relativePath = relativeDir ? path.posix.join(relativeDir, item.name) : item.name;
            const fullPath = path.join(currentDir, item.name);
            const stats = fs.statSync(fullPath);
            const preview = getSharedPreviewInfo(item.name, entryType);

            const node = {
                name: item.name,
                path: relativePath,
                type: entryType,
                size: stats.size,
                modifiedAt: stats.mtime,
                ...preview
            };

            if (entryType === 'folder') {
                node.children = listSharedProjectTree(projectDir, relativePath);
            }

            return node;
        })
        .sort(compareSharedTreeEntries);
}

function flattenSharedProjectTree(nodes) {
    return nodes.flatMap(node => {
        if (node.type === 'folder') {
            return [node, ...flattenSharedProjectTree(node.children || [])];
        }

        return [node];
    });
}

function getProjectFileSummary(projectPath) {
    return summarizeProjectFiles(projectPath);
}

function buildPublicProjectThumbnail(owner, projectName, projectPath) {
    const thumbnail = findProjectThumbnail(projectPath);
    if (!thumbnail) return null;

    const encodedOwner = encodeURIComponent(owner);
    const encodedProjectName = encodeURIComponent(projectName);
    const encodedPath = encodePublicWorkspaceFilePath(thumbnail.path);

    return {
        name: thumbnail.name,
        path: thumbnail.path,
        size: thumbnail.size,
        downloadPath: `/api/jupyter/cases/${encodedOwner}/${encodedProjectName}/files/${encodedPath}/download`
    };
}

function encodePublicWorkspaceFilePath(relativePath = '') {
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

    if (/^https:\/\//i.test(avatarUrl) && !isOpenGmsAvatarUrl(avatarUrl)) {
        return avatarUrl;
    }

    return `/api/auth/avatar/${encodeURIComponent(String(user.id))}`;
}

function buildOwnerProfile(username, user) {
    if (!user) {
        return {
            username,
            displayName: username,
            avatarUrl: null
        };
    }

    return {
        username: user.username || username,
        displayName: user.displayName || user.username || username,
        avatarUrl: buildOwnerAvatarUrl(user)
    };
}

function buildPublicProjectSummary(username, projectName, projectPath, { caseOnly = false } = {}) {
    const meta = getProjectMeta(projectPath);
    if (!meta.isPublic) return null;
    if (caseOnly && !meta.isCase) return null;

    const caseMeta = meta.isCase ? getCaseMeta(meta) : null;
    const fileSummary = getProjectFileSummary(projectPath);
    const thumbnail = buildPublicProjectThumbnail(username, projectName, projectPath);
    const projectId = ensureProjectWorkspaceId(projectPath, meta);

    return {
        projectId,
        name: projectName,
        projectName,
        title: caseMeta?.title || meta.name || projectName,
        description: meta.description || caseMeta?.summary || '',
        owner: username,
        ownerProfile: buildOwnerProfile(username, null),
        ...fileSummary,
        ...getRuntimeFields(meta),
        isPublic: true,
        isCase: !!meta.isCase,
        caseTitle: caseMeta?.title || '',
        case: caseMeta,
        thumbnail,
        dataBindingCount: Array.isArray(meta.dataBindings) ? meta.dataBindings.length : 0,
        publicationType: meta.isCase ? 'case' : 'public-project'
    };
}

async function attachOwnerProfiles(projects) {
    const owners = Array.from(new Set(projects.map(project => project.owner).filter(Boolean)));
    const profiles = new Map();

    await Promise.all(owners.map(async owner => {
        try {
            const user = await getUserByUsername(owner);
            profiles.set(owner, buildOwnerProfile(owner, user));
        } catch (error) {
            console.warn('Failed to resolve case owner profile:', owner, error?.message || error);
            profiles.set(owner, buildOwnerProfile(owner, null));
        }
    }));

    return projects.map(project => ({
        ...project,
        ownerProfile: profiles.get(project.owner) || project.ownerProfile || buildOwnerProfile(project.owner, null)
    }));
}

async function listPublicProjectSummaries({ caseOnly = false } = {}) {
    const publicProjects = [];
    if (!fs.existsSync(USER_DATA_DIR)) {
        return publicProjects;
    }

    const users = fs.readdirSync(USER_DATA_DIR, { withFileTypes: true })
        .filter(item => item.isDirectory());

    for (const userDir of users) {
        const username = userDir.name;
        const userPath = path.join(USER_DATA_DIR, username);
        const items = fs.readdirSync(userPath, { withFileTypes: true });

        for (const item of items) {
            if (!item.isDirectory() || item.name.startsWith('.') || item.name === '__pycache__') {
                continue;
            }

            const projectPath = path.join(userPath, item.name);
            const summary = buildPublicProjectSummary(username, item.name, projectPath, { caseOnly });
            if (summary) {
                publicProjects.push(summary);
            }
        }
    }

    const withProfiles = await attachOwnerProfiles(publicProjects);
    return withProfiles.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
}

/**
 * GET /api/jupyter/projects
 * 获取用户的项目列表（以文件夹为单位）
 */
router.get('/projects', (req, res) => {
    const username = req.user.username;
    const { dataList } = getUserDataList(req.user.userId);
    const userDir = path.join(USER_DATA_DIR, username);

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        return res.json({ projects: [] });
    }

    try {
        const items = fs.readdirSync(userDir, { withFileTypes: true });
        const projects = items
            .filter(item => item.isDirectory() && !item.name.startsWith('.') && item.name !== '__pycache__')
            .map(item => {
                const projectPath = path.join(userDir, item.name);

                // 读取项目元信息
                const meta = getProjectMeta(projectPath);
                const projectId = ensureProjectWorkspaceId(projectPath, meta);
                const caseMeta = meta.isCase ? getCaseMeta(meta) : null;
                const dataBindings = resolveProjectDataBindings(meta, dataList, { projectDir: projectPath });
                const fileSummary = getProjectFileSummary(projectPath);

                return {
                    projectId,
                    name: item.name,
                    description: meta.description || '',
                    ...fileSummary,
                    ...getRuntimeFields(meta),
                    starterTemplate: meta.starterTemplate || 'blank',
                    isPublic: meta.isPublic || false,
                    isCase: !!meta.isCase,
                    caseTitle: caseMeta?.title || '',
                    case: caseMeta,
                    dataBindingCount: dataBindings.length,
                    forkedFrom: meta.forkedFrom || null,  // { owner, projectName }
                    owner: username
                };
            })
            .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

        res.json({ projects });
    } catch (error) {
        console.error('Error listing projects:', error);
        res.json({ projects: [] });
    }
});

/**
 * POST /api/jupyter/projects
 * 创建新项目
 */
router.post('/projects', (req, res) => {
    const username = req.user.username;
    const { name, description, starterTemplate } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: '项目名称不能为空' });
    }

    // 验证项目名称（只允许字母、数字、中文、下划线、连字符）
    const safeName = name.trim();
    if (!/^[\w\u4e00-\u9fa5\-]+$/.test(safeName)) {
        return res.status(400).json({ error: '项目名称只能包含字母、数字、中文、下划线和连字符' });
    }

    const userDir = path.join(USER_DATA_DIR, username);
    const projectDir = path.join(userDir, safeName);

    if (fs.existsSync(projectDir)) {
        return res.status(400).json({ error: '项目已存在' });
    }

    try {
        const runtimeResult = resolveProjectRuntime({
            runtime: { imageId: getRequestedRuntimeImageId(req.body || {}) }
        });
        if (!runtimeResult.ok) {
            return res.status(runtimeResult.status).json({
                error: runtimeResult.message,
                code: runtimeResult.code,
                imageId: runtimeResult.imageId
            });
        }

        fs.mkdirSync(projectDir, { recursive: true });
        const starterResult = initializeProjectStarter(projectDir, starterTemplate, {
            projectName: safeName
        });

        // 创建项目元信息文件
        const projectMeta = {
            projectId: crypto.randomUUID(),
            name: safeName,
            description: description || '',
            isPublic: false,
            isCase: false,
            dataBindings: [],
            starterTemplate: starterResult.starterTemplate,
            ...buildProjectRuntimeMeta(runtimeResult.imageId),
            createdAt: new Date().toISOString(),
            createdBy: username
        };
        saveProjectMeta(projectDir, projectMeta);
        const notebookCount = starterResult.createdFiles.filter(file => file.endsWith('.ipynb')).length;

        res.json({
            status: 'created',
            project: {
                projectId: projectMeta.projectId,
                name: safeName,
                description: description || '',
                notebookCount,
                fileCount: starterResult.createdFiles.length,
                modifiedAt: new Date(),
                createdAt: new Date(),
                ...getRuntimeFields(projectMeta),
                isPublic: false,
                isCase: false,
                starterTemplate: starterResult.starterTemplate,
                caseTitle: '',
                case: null,
                dataBindings: [],
                dataBindingCount: 0,
                forkedFrom: null,
                owner: username
            }
        });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: '创建项目失败' });
    }
});

/**
 * GET /api/jupyter/projects/:projectName
 * 获取项目详情及其文件列表
 */
router.get('/projects/:projectName', (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const resolvedProject = resolveUserProject(username, projectName);

    if (!resolvedProject) {
        return res.status(404).json({ error: '项目不存在' });
    }

    try {
        const projectDir = resolvedProject.projectDir;
        const canonicalProjectName = resolvedProject.projectName;
        const stats = fs.statSync(projectDir);
        const files = fs.readdirSync(projectDir);

        // 读取项目元信息
        let projectMeta = resolvedProject.meta || { name: canonicalProjectName };
        const metaPath = path.join(projectDir, '.project.json');
        if (fs.existsSync(metaPath)) {
            try {
                projectMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            } catch (e) {}
        }
        const projectId = ensureProjectWorkspaceId(projectDir, projectMeta);
        const caseMeta = projectMeta.isCase ? getCaseMeta(projectMeta) : null;
        const { dataList } = getUserDataList(req.user.userId);
        const dataBindings = resolveProjectDataBindings(projectMeta, dataList, { projectDir });

        // 获取所有文件信息
        const fileList = files
            .filter(f => !f.startsWith('.')) // 隐藏文件不显示
            .map(f => {
                const filePath = path.join(projectDir, f);
                const fileStats = fs.statSync(filePath);
                const isNotebook = f.endsWith('.ipynb');

                let notebookInfo = null;
                if (isNotebook) {
                    try {
                        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        notebookInfo = {
                            cellCount: content.cells ? content.cells.length : 0,
                            language: content.metadata?.kernelspec?.language || 'python'
                        };
                    } catch (e) {
                        notebookInfo = { cellCount: 0, language: 'unknown' };
                    }
                }

                return {
                    name: f,
                    type: isNotebook ? 'notebook' : (fileStats.isDirectory() ? 'folder' : 'file'),
                    size: fileStats.size,
                    modifiedAt: fileStats.mtime,
                    ...(notebookInfo && { notebook: notebookInfo })
                };
            })
            .sort((a, b) => {
                // notebooks 优先，然后按修改时间排序
                if (a.type === 'notebook' && b.type !== 'notebook') return -1;
                if (a.type !== 'notebook' && b.type === 'notebook') return 1;
                return new Date(b.modifiedAt) - new Date(a.modifiedAt);
            });

        res.json({
            project: {
                projectId,
                ...projectMeta,
                name: projectMeta.name || canonicalProjectName,
                ...getRuntimeFields(projectMeta),
                starterTemplate: projectMeta.starterTemplate || 'blank',
                isCase: !!projectMeta.isCase,
                caseTitle: caseMeta?.title || '',
                case: caseMeta,
                dataBindings,
                dataBindingCount: dataBindings.length,
                modifiedAt: stats.mtime,
                createdAt: stats.birthtime
            },
            files: fileList
        });
    } catch (error) {
        console.error('Error getting project details:', error);
        res.status(500).json({ error: '获取项目详情失败' });
    }
});

/**
 * GET /api/jupyter/projects/:projectName/data-bindings
 * 获取项目绑定的数据资产清单
 */
router.get('/projects/:projectName/data-bindings', (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const projectDir = path.join(USER_DATA_DIR, username, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    const meta = getProjectMeta(projectDir);
    const { dataList } = getUserDataList(req.user.userId);
    res.json({
        dataBindings: resolveProjectDataBindings(meta, dataList, { projectDir })
    });
});

/**
 * POST /api/jupyter/projects/:projectName/data-bindings
 * 将 My Data 中的文件绑定到项目
 */
router.post('/projects/:projectName/data-bindings', async (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const projectDir = path.join(USER_DATA_DIR, username, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    const meta = getProjectMeta(projectDir);
    const { dataList } = getUserDataList(req.user.userId);
    const result = createProjectDataBinding(meta, dataList, req.body || {});
    if (!result.ok) {
        return res.status(result.status || 400).json({
            error: result.message,
            code: result.code
        });
    }

    saveProjectMeta(projectDir, meta);
    let materializeResult = null;
    let materializeWarnings = [];
    try {
        const prepared = await materializeProjectDataForJupyter(projectDir, meta, dataList, {
            onlyBindingId: result.binding.id
        });
        materializeResult = prepared.manifest.bindings.find(binding => String(binding.id) === String(result.binding.id)) || null;
        materializeWarnings = prepared.warnings;
        saveProjectMeta(projectDir, meta);
    } catch (error) {
        materializeWarnings = [{
            bindingId: result.binding.id,
            code: 'materialize_failed',
            message: error.message
        }];
        try {
            writeProjectDataManifest(projectDir, meta, dataList);
        } catch (manifestError) {
            materializeWarnings.push({
                bindingId: result.binding.id,
                code: 'manifest_write_failed',
                message: manifestError.message
            });
        }
    }

    res.json({
        status: 'attached',
        binding: materializeResult || result.binding,
        dataBindings: resolveProjectDataBindings(meta, dataList, { projectDir }),
        materializeWarnings
    });
});

/**
 * POST /api/jupyter/projects/:projectName/data-bindings/:bindingId/materialize
 * 将一个 Project Data 绑定下载/映射到 Jupyter 工作目录 data/ 下
 */
router.post('/projects/:projectName/data-bindings/:bindingId/materialize', async (req, res) => {
    const username = req.user.username;
    const { projectName, bindingId } = req.params;
    const projectDir = path.join(USER_DATA_DIR, username, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    const meta = getProjectMeta(projectDir);
    const targetBinding = Array.isArray(meta.dataBindings)
        ? meta.dataBindings.find(binding => String(binding.id) === String(bindingId))
        : null;

    if (!targetBinding) {
        return res.status(404).json({
            error: 'Project Data binding was not found',
            code: 'data_binding_not_found'
        });
    }

    const { dataList } = getUserDataList(req.user.userId);
    const prepared = await materializeProjectDataForJupyter(projectDir, meta, dataList, {
        onlyBindingId: bindingId
    });
    saveProjectMeta(projectDir, meta);

    const binding = resolveProjectDataBindings(meta, dataList, { projectDir })
        .find(item => String(item.id) === String(bindingId));
    const warning = prepared.warnings.find(item => String(item.bindingId) === String(bindingId));

    if (warning) {
        const status = warning.code === 'source_missing'
            ? 404
            : (warning.code === 'materialize_failed' ? 502 : 400);
        return res.status(status).json({
            error: warning.message,
            code: warning.code,
            binding,
            dataBindings: resolveProjectDataBindings(meta, dataList, { projectDir })
        });
    }

    res.json({
        status: 'materialized',
        binding,
        dataBindings: resolveProjectDataBindings(meta, dataList, { projectDir }),
        manifest: prepared.manifest
    });
});

/**
 * DELETE /api/jupyter/projects/:projectName/data-bindings/:bindingId
 * 从项目中移除数据绑定，不删除 My Data 源资产
 */
router.delete('/projects/:projectName/data-bindings/:bindingId', (req, res) => {
    const username = req.user.username;
    const { projectName, bindingId } = req.params;
    const projectDir = path.join(USER_DATA_DIR, username, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    const meta = getProjectMeta(projectDir);
    const result = removeProjectDataBinding(meta, bindingId);
    if (!result.ok) {
        return res.status(result.status || 404).json({
            error: result.message,
            code: result.code
        });
    }

    saveProjectMeta(projectDir, meta);
    const { dataList } = getUserDataList(req.user.userId);
    try {
        writeProjectDataManifest(projectDir, meta, dataList);
    } catch (manifestError) {
        console.warn('Failed to refresh Project Data manifest after removal:', manifestError.message);
    }
    res.json({
        status: 'removed',
        binding: result.binding,
        dataBindings: resolveProjectDataBindings(meta, dataList, { projectDir })
    });
});

/**
 * GET /api/jupyter/projects/:projectName/folder
 * 获取项目中某个文件夹的内容
 * Query: path - 相对于项目根目录的文件夹路径
 */
router.get('/projects/:projectName/folder', (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const folderPath = req.query.path || '';
    const userDir = path.join(USER_DATA_DIR, username);
    const projectDir = path.join(userDir, projectName);
    const targetDir = path.join(projectDir, folderPath);

    // 安全检查：确保目标路径在项目目录内
    const realTarget = path.resolve(targetDir);
    const realProject = path.resolve(projectDir);
    if (!realTarget.startsWith(realProject)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }

    if (!fs.existsSync(targetDir)) {
        return res.status(404).json({ error: '文件夹不存在' });
    }

    try {
        const files = fs.readdirSync(targetDir);

        const fileList = files
            .filter(f => !f.startsWith('.'))
            .map(f => {
                const filePath = path.join(targetDir, f);
                const fileStats = fs.statSync(filePath);
                const isNotebook = f.endsWith('.ipynb');

                let notebookInfo = null;
                if (isNotebook) {
                    try {
                        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        notebookInfo = {
                            cellCount: content.cells ? content.cells.length : 0,
                            language: content.metadata?.kernelspec?.language || 'python'
                        };
                    } catch (e) {
                        notebookInfo = { cellCount: 0, language: 'unknown' };
                    }
                }

                return {
                    name: f,
                    type: isNotebook ? 'notebook' : (fileStats.isDirectory() ? 'folder' : 'file'),
                    size: fileStats.size,
                    modifiedAt: fileStats.mtime,
                    path: folderPath ? `${folderPath}/${f}` : f,
                    ...(notebookInfo && { notebook: notebookInfo })
                };
            })
            .sort((a, b) => {
                // 文件夹优先，然后是 notebooks
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                if (a.type === 'notebook' && b.type !== 'notebook') return -1;
                if (a.type !== 'notebook' && b.type === 'notebook') return 1;
                return a.name.localeCompare(b.name);
            });

        res.json({ files: fileList, folderPath });
    } catch (error) {
        console.error('Error reading folder:', error);
        res.status(500).json({ error: '读取文件夹失败' });
    }
});

/**
 * GET /api/jupyter/projects/:projectName/files/:filePath/content
 * 获取文本文件内容
 * filePath 需要被 encodeURIComponent 编码
 */
router.get('/projects/:projectName/files/:filePath/content', (req, res) => {
    const username = req.user.username;
    const { projectName, filePath } = req.params;
    const userDir = path.join(USER_DATA_DIR, username);
    const projectDir = path.join(userDir, projectName);
    const fullPath = path.join(projectDir, filePath);

    // 安全检查：确保路径在项目目录内
    const realPath = path.resolve(fullPath);
    const realProject = path.resolve(projectDir);
    if (!realPath.startsWith(realProject)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: '文件不存在' });
    }

    try {
        const stats = fs.statSync(fullPath);

        // 限制文件大小（最大 1MB）
        if (stats.size > 1024 * 1024) {
            return res.status(400).json({ error: '文件太大，无法预览' });
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        res.json({
            content,
            size: stats.size,
            modifiedAt: stats.mtime
        });
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ error: '读取文件失败' });
    }
});

/**
 * DELETE /api/jupyter/projects/:projectName
 * 删除项目
 */
router.delete('/projects/:projectName', (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const userDir = path.join(USER_DATA_DIR, username);
    const projectDir = path.join(userDir, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    try {
        // 递归删除目录
        fs.rmSync(projectDir, { recursive: true, force: true });
        res.json({ status: 'deleted', message: '项目已删除' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: '删除项目失败' });
    }
});

/**
 * PUT /api/jupyter/projects/:projectName
 * 更新项目（重命名和/或更新描述）
 */
router.put('/projects/:projectName', (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const { newName, description } = req.body;

    const userDir = path.join(USER_DATA_DIR, username);
    let currentPath = path.join(userDir, projectName);

    if (!fs.existsSync(currentPath)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    try {
        let finalName = projectName;

        // 处理重命名
        if (newName && newName.trim() && newName.trim() !== projectName) {
            const safeName = newName.trim();
            if (!/^[\w\u4e00-\u9fa5\-]+$/.test(safeName)) {
                return res.status(400).json({ error: '项目名称只能包含字母、数字、中文、下划线和连字符' });
            }

            const newPath = path.join(userDir, safeName);
            if (fs.existsSync(newPath)) {
                return res.status(400).json({ error: '目标名称已存在' });
            }

            fs.renameSync(currentPath, newPath);
            currentPath = newPath;
            finalName = safeName;
        }

        // 更新项目元信息（包括 description）
        const metaPath = path.join(currentPath, '.project.json');
        let meta = {};
        if (fs.existsSync(metaPath)) {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        }

        meta.name = finalName;
        if (description !== undefined) {
            meta.description = description;
        }

        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

        res.json({
            status: 'updated',
            name: finalName,
            description: meta.description || ''
        });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

/**
 * GET /api/jupyter/projects/:projectName/notebooks/:notebookName/preview
 * 预览 Notebook 内容（不需要启动 Jupyter）
 * notebookName 需要被 encodeURIComponent 编码（前端已处理）
 */
router.get('/projects/:projectName/notebooks/:notebookName/preview', async (req, res) => {
    const username = req.user.username;
    const { projectName, notebookName } = req.params;
    const userDir = path.join(USER_DATA_DIR, username);
    const projectDir = path.join(userDir, projectName);
    // notebookName 已被 decodeURIComponent 自动解码
    const notebookPath = path.join(projectDir, notebookName);

    // 安全检查：确保路径在项目目录内
    const realNotebook = path.resolve(notebookPath);
    const realProject = path.resolve(projectDir);
    if (!realNotebook.startsWith(realProject)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }

    if (!fs.existsSync(notebookPath)) {
        return res.status(404).json({ error: 'Notebook 不存在' });
    }

    try {
        const stats = fs.statSync(notebookPath);
        const preview = getSharedPreviewInfo(notebookPath, 'file');
        const html = await renderNotebookPreviewHtml(notebookPath);

        res.json({
            name: path.basename(notebookPath),
            path: notebookName,
            html,
            size: stats.size,
            modifiedAt: stats.mtime,
            ...preview
        });
    } catch (error) {
        console.error('Error rendering notebook:', error);
        res.status(500).json({ error: '渲染 Notebook 预览失败' });
    }
});

/**
 * GET /api/jupyter/check
 * 检查 Docker 是否可用
 */
router.get('/check', async (req, res) => {
    const runtime = resolveProjectRuntime({ runtimeImageId: DEFAULT_IMAGE }).runtime;
    const readiness = await inspectRuntimeReadiness(runtime, runDockerCommand);

    res.status(readiness.ok ? 200 : readiness.status).json({
        available: readiness.ok,
        imageExists: readiness.ok,
        image: runtime.imageName,
        code: readiness.code,
        message: readiness.message || 'Docker and Jupyter image are ready'
    });
});

/**
 * POST /api/jupyter/pull-image
 * 兼容旧入口：构建默认 Jupyter Docker 镜像
 */
router.post('/pull-image', async (req, res) => {
    req.params.imageId = DEFAULT_IMAGE;
    return buildRuntimeImage(req, res);
});

/**
 * POST /api/jupyter/images/:imageId/build
 * 基于项目内 Dockerfile 构建预定义 runtime 镜像
 */
router.post('/images/:imageId/build', buildRuntimeImage);

async function buildRuntimeImage(req, res) {
    try {
        const dockerAvailable = await checkDockerAvailable();
        if (!dockerAvailable) {
            return res.status(503).json({
                error: 'Docker not available',
                code: 'docker_unavailable',
                message: '请先启动 Docker Desktop'
            });
        }

        const imageId = req.params.imageId || DEFAULT_IMAGE;
        const build = buildDockerBuildCommand(imageId);
        if (!build.ok) {
            return res.status(build.status || 400).json({
                error: build.message,
                code: build.code,
                imageId: build.imageId
            });
        }

        if (!fs.existsSync(build.dockerfilePath)) {
            return res.status(409).json({
                error: 'Runtime Dockerfile missing',
                code: 'runtime_dockerfile_missing',
                imageId: build.imageId,
                imageName: build.imageName,
                dockerfilePath: build.dockerfilePath
            });
        }

        console.log(`Building runtime image ${build.imageName} from ${build.dockerfilePath}...`);

        exec(build.command, { env: buildDockerCommandEnv() }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error building runtime image ${build.imageName}:`, stderr || error.message);
            } else {
                console.log(`Runtime image built successfully: ${build.imageName}`);
            }
        });

        res.json({
            status: 'building',
            imageId: build.imageId,
            imageName: build.imageName,
            message: '正在构建运行环境镜像，这可能需要较长时间。构建完成后请刷新环境列表。'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to build runtime image',
            message: error.message
        });
    }
}

// ========== My Model / My Data Method 存储 ==========

// 用户收藏数据存储目录
const USER_FAVORITES_FILE = path.join(USER_DATA_DIR, 'user-favorites.json');

// 读取用户收藏数据
function loadUserFavorites() {
    try {
        if (fs.existsSync(USER_FAVORITES_FILE)) {
            return JSON.parse(fs.readFileSync(USER_FAVORITES_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading user favorites:', e);
    }
    return {};
}

// 保存用户收藏数据
function saveUserFavorites(data) {
    try {
        fs.writeFileSync(USER_FAVORITES_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving user favorites:', e);
    }
}

function ensureUserFavoritesRecord(favorites, userId) {
    if (!favorites[userId]) {
        favorites[userId] = { models: [], dataMethods: [], dataList: [] };
    }
    if (!Array.isArray(favorites[userId].models)) {
        favorites[userId].models = [];
    }
    if (!Array.isArray(favorites[userId].dataMethods)) {
        favorites[userId].dataMethods = [];
    }
    if (!Array.isArray(favorites[userId].dataList)) {
        favorites[userId].dataList = [];
    }
    return favorites[userId];
}

function shouldSeedMockMyData() {
    return process.env.NODE_ENV !== 'production' && process.env.ENABLE_MY_DATA_MOCKS !== 'false';
}

function getUserDataList(userId, { persistSeed = true } = {}) {
    const favorites = loadUserFavorites();
    const userRecord = ensureUserFavoritesRecord(favorites, userId);
    const originalList = userRecord.dataList;
    const seededList = seedMockMyDataIfEmpty(originalList, { enabled: shouldSeedMockMyData() });

    if (persistSeed && seededList !== originalList) {
        userRecord.dataList = seededList;
        saveUserFavorites(favorites);
    }

    return {
        favorites,
        userRecord,
        dataList: normalizeMyDataList(userRecord.dataList)
    };
}

async function fetchOpenGmsModelFavoriteByName(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return null;

    const response = await axios.get(
        `${OGMS_PORTAL_URL}/computableModel/ModelInfo_name/${encodeURIComponent(cleanName)}`
    );
    const detail = response.data?.data;
    if (!detail) return null;

    return normalizeOpenGmsModelFavorite({
        id: detail.id || detail.md5 || detail.name,
        md5: detail.md5,
        name: detail.name || cleanName,
        description: detail.overview || detail.description || '',
        author: detail.author || detail.authorEmail || 'OpenGeoLab',
        tags: Array.isArray(detail.tags) ? detail.tags : [],
        status: detail.status,
        deploy: detail.deploy,
        online: detail.checkedModel?.online,
        healthText: detail.checkedModel?.msg,
        viewCount: detail.viewCount,
        invokeCount: detail.invokeCount,
        shareCount: detail.shareCount,
        thumbsUpCount: detail.thumbsUpCount,
        createTime: detail.createTime,
        lastModifyTime: detail.lastModifyTime,
        relatedModelItems: detail.relatedModelItems
    });
}

async function normalizeSavedModelWithCompatibility(model) {
    const normalized = normalizeOpenGmsModelFavorite(model);
    if (normalized.externalUrl || !normalized.name) {
        return normalized;
    }

    try {
        const enriched = await fetchOpenGmsModelFavoriteByName(normalized.name);
        if (!enriched) return normalized;

        return {
            ...normalized,
            ...enriched,
            id: normalized.id || enriched.id,
            addedAt: normalized.addedAt || enriched.addedAt
        };
    } catch (error) {
        console.warn(`Failed to enrich saved OpenGMS model ${normalized.name}:`, error.message);
        return normalized;
    }
}

/**
 * GET /api/jupyter/my-models
 * 获取用户收藏的模型列表
 */
router.get('/my-models', async (req, res) => {
    const userId = req.user.userId;
    const favorites = loadUserFavorites();
    const userModels = favorites[userId]?.models || [];
    let shouldPersist = false;
    const normalizedModels = await Promise.all(userModels.map(async (model) => {
        const normalized = await normalizeSavedModelWithCompatibility(model);
        if (JSON.stringify(normalized) !== JSON.stringify(model)) {
            shouldPersist = true;
        }
        return normalized;
    }));

    if (shouldPersist) {
        if (!favorites[userId]) {
            favorites[userId] = { models: [], dataMethods: [] };
        }
        favorites[userId].models = normalizedModels;
        saveUserFavorites(favorites);
    }

    res.json({ models: normalizedModels });
});

/**
 * POST /api/jupyter/my-models
 * 添加模型到用户收藏
 */
router.post('/my-models', (req, res) => {
    const userId = req.user.userId;
    const { model } = req.body;

    if (!model || !model.id) {
        return res.status(400).json({ error: '无效的模型数据' });
    }

    const favorites = loadUserFavorites();
    if (!favorites[userId]) {
        favorites[userId] = { models: [], dataMethods: [] };
    }
    if (!Array.isArray(favorites[userId].models)) {
        favorites[userId].models = [];
    }

    // 检查是否已存在
    const exists = favorites[userId].models.some(m => String(m.id) === String(model.id));
    if (exists) {
        return res.status(400).json({ error: '模型已在列表中' });
    }

    const savedModel = normalizeOpenGmsModelFavorite(model, {
        addedAt: new Date().toISOString()
    });

    favorites[userId].models.push(savedModel);

    saveUserFavorites(favorites);
    res.json({ status: 'added', model: savedModel });
});

/**
 * DELETE /api/jupyter/my-models/:id
 * 从用户收藏中移除模型
 */
router.delete('/my-models/:id', (req, res) => {
    const userId = req.user.userId;
    const modelId = req.params.id;

    const favorites = loadUserFavorites();
    if (!favorites[userId]) {
        return res.status(404).json({ error: '模型不存在' });
    }

    // 使用 String() 转换确保类型一致
    const index = favorites[userId].models.findIndex(m => String(m.id) === String(modelId));
    if (index === -1) {
        return res.status(404).json({ error: '模型不存在' });
    }

    favorites[userId].models.splice(index, 1);
    saveUserFavorites(favorites);
    res.json({ status: 'removed' });
});

/**
 * GET /api/jupyter/my-datamethods
 * 获取用户收藏的数据方法列表
 */
router.get('/my-datamethods', (req, res) => {
    const userId = req.user.userId;
    const favorites = loadUserFavorites();
    const userDataMethods = favorites[userId]?.dataMethods || [];
    res.json({ dataMethods: userDataMethods });
});

/**
 * POST /api/jupyter/my-datamethods
 * 添加数据方法到用户收藏
 */
router.post('/my-datamethods', (req, res) => {
    const userId = req.user.userId;
    const { dataMethod } = req.body;

    if (!dataMethod || !dataMethod.id) {
        return res.status(400).json({ error: '无效的数据方法' });
    }

    const favorites = loadUserFavorites();
    if (!favorites[userId]) {
        favorites[userId] = { models: [], dataMethods: [] };
    }

    // 检查是否已存在
    const exists = favorites[userId].dataMethods.some(m => m.id === dataMethod.id);
    if (exists) {
        return res.status(400).json({ error: '数据方法已在列表中' });
    }

    // 添加数据方法（只保存必要信息）
    favorites[userId].dataMethods.push({
        id: dataMethod.id,
        name: dataMethod.name,
        description: dataMethod.description || '',
        author: dataMethod.author || 'OpenGeoLab',
        addedAt: new Date().toISOString()
    });

    saveUserFavorites(favorites);
    res.json({ status: 'added', dataMethod });
});

/**
 * DELETE /api/jupyter/my-datamethods/:id
 * 从用户收藏中移除数据方法
 */
router.delete('/my-datamethods/:id', (req, res) => {
    const userId = req.user.userId;
    const dataMethodId = req.params.id;

    const favorites = loadUserFavorites();
    if (!favorites[userId]) {
        return res.status(404).json({ error: '数据方法不存在' });
    }

    // 使用 String() 转换确保类型一致
    const index = favorites[userId].dataMethods.findIndex(m => String(m.id) === String(dataMethodId));
    if (index === -1) {
        return res.status(404).json({ error: '数据方法不存在' });
    }

    favorites[userId].dataMethods.splice(index, 1);
    saveUserFavorites(favorites);
    res.json({ status: 'removed' });
});

// ========== My Data 存储 ==========

/**
 * GET /api/jupyter/my-data
 * 获取用户上传的数据列表
 */
router.get('/my-data', (req, res) => {
    const userId = req.user.userId;
    const { dataList } = getUserDataList(userId);
    res.json({ dataList });
});

/**
 * GET /api/jupyter/my-data/:id/download
 * 通过 OpenGeoLab 代理下载用户数据，确保中文文件名使用 UTF-8 Content-Disposition。
 */
router.get('/my-data/:id/download', async (req, res) => {
    const userId = req.user.userId;
    const dataId = req.params.id;
    const { dataList } = getUserDataList(userId);
    const dataItem = findMyDataItem(dataList, dataId);

    if (!dataItem || dataItem.kind === 'folder') {
        return res.status(404).json({ error: '数据不存在' });
    }

    if (!dataItem.url) {
        return res.status(400).json({
            code: 'download_unavailable',
            error: '该数据没有可下载链接'
        });
    }

    let sourceUrl;
    try {
        sourceUrl = new URL(dataItem.url);
    } catch (error) {
        return res.status(400).json({
            code: 'invalid_download_url',
            error: '数据下载链接无效'
        });
    }

    if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
        return res.status(400).json({
            code: 'invalid_download_url',
            error: '数据下载链接无效'
        });
    }

    try {
        const response = await axios.get(sourceUrl.toString(), {
            responseType: 'stream',
            timeout: 30000,
            maxRedirects: 5
        });
        const filename = getSafeDownloadFilename(dataItem);

        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        res.setHeader('Content-Disposition', buildDownloadContentDisposition(filename));

        response.data.on('error', error => {
            console.error('[My Data Download] Stream error:', error.message);
            if (!res.headersSent) {
                res.status(502).end();
            } else {
                res.destroy(error);
            }
        });

        response.data.pipe(res);
    } catch (error) {
        console.error('[My Data Download] Error:', error.message);
        res.status(502).json({
            code: 'download_failed',
            error: '数据下载失败',
            message: error.message
        });
    }
});

/**
 * POST /api/jupyter/my-data
 * 添加数据到用户的数据列表
 */
router.post('/my-data', (req, res) => {
    const userId = req.user.userId;
    const { data } = req.body;

    if (!data || !data.name) {
        return res.status(400).json({ error: '无效的数据' });
    }

    const favorites = loadUserFavorites();
    const userRecord = ensureUserFavoritesRecord(favorites, userId);

    // 生成唯一ID
    const dataId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    // 添加数据记录
    userRecord.dataList.push({
        id: dataId,
        name: data.name,
        filename: data.filename || data.name,
        kind: 'file',
        description: data.description || '',
        type: data.type || 'unknown',
        size: data.size || 0,
        url: data.url || '',
        parentId: data.parentId || null,
        path: data.path || '',
        source: data.source || 'upload',
        downloadable: Boolean(data.url),
        metadata: data.metadata || {},
        uploadedAt: new Date().toISOString()
    });
    userRecord.dataList = normalizeMyDataList(userRecord.dataList);

    saveUserFavorites(favorites);
    res.json({
        status: 'added',
        dataId,
        data: userRecord.dataList.find(item => item.id === dataId)
    });
});

/**
 * DELETE /api/jupyter/my-data/:id
 * 从用户数据列表中移除数据
 */
router.delete('/my-data/:id', (req, res) => {
    const userId = req.user.userId;
    const dataId = req.params.id;

    const favorites = loadUserFavorites();
    const userRecord = favorites[userId];
    if (!userRecord || !Array.isArray(userRecord.dataList)) {
        return res.status(404).json({ error: '数据不存在' });
    }

    userRecord.dataList = normalizeMyDataList(userRecord.dataList);
    const target = userRecord.dataList.find(d => String(d.id) === String(dataId));
    const index = userRecord.dataList.findIndex(d => String(d.id) === String(dataId));
    if (index === -1) {
        return res.status(404).json({ error: '数据不存在' });
    }

    if (target.kind === 'folder') {
        const targetPath = target.path;
        userRecord.dataList = userRecord.dataList.filter(item => (
            String(item.id) !== String(dataId) &&
            !(targetPath && item.path && item.path.startsWith(`${targetPath}/`))
        ));
    } else {
        userRecord.dataList.splice(index, 1);
    }
    saveUserFavorites(favorites);
    res.json({ status: 'removed' });
});

/**
 * PUT /api/jupyter/my-data/:id
 * 更新数据信息（如重命名）
 */
router.put('/my-data/:id', (req, res) => {
    const userId = req.user.userId;
    const dataId = req.params.id;
    const { name, description } = req.body;

    const favorites = loadUserFavorites();
    if (!favorites[userId] || !favorites[userId].dataList) {
        return res.status(404).json({ error: '数据不存在' });
    }

    const dataItem = favorites[userId].dataList.find(d => String(d.id) === String(dataId));
    if (!dataItem) {
        return res.status(404).json({ error: '数据不存在' });
    }

    if (name) {
        dataItem.name = name;
        dataItem.filename = name;
    }
    if (description !== undefined) dataItem.description = description;
    dataItem.updatedAt = new Date().toISOString();
    favorites[userId].dataList = normalizeMyDataList(favorites[userId].dataList);

    saveUserFavorites(favorites);
    res.json({
        status: 'updated',
        data: favorites[userId].dataList.find(d => String(d.id) === String(dataId))
    });
});

/**
 * POST /api/jupyter/my-data/folder
 * 创建文件夹
 */
router.post('/my-data/folder', (req, res) => {
    const userId = req.user.userId;
    const { name, path: folderPath, parentId } = req.body;

    if (!name) {
        return res.status(400).json({ error: '文件夹名称不能为空' });
    }

    const favorites = loadUserFavorites();
    const userRecord = ensureUserFavoritesRecord(favorites, userId);

    // 检查同级目录是否存在同名文件夹
    userRecord.dataList = normalizeMyDataList(userRecord.dataList);
    const existing = userRecord.dataList.find(d =>
        d.type === 'folder' &&
        d.name === name &&
        d.parentId === (parentId || null)
    );
    if (existing) {
        return res.status(400).json({ error: '同名文件夹已存在' });
    }

    const folderId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const fullPath = folderPath === '/' ? '/' + name : folderPath + '/' + name;

    const newFolder = {
        id: folderId,
        name: name,
        kind: 'folder',
        type: 'folder',
        path: fullPath,
        parentId: parentId || null,
        source: 'user',
        downloadable: false,
        metadata: { formatLabel: 'Folder' },
        createdAt: new Date().toISOString()
    };

    userRecord.dataList.push(newFolder);
    userRecord.dataList = normalizeMyDataList(userRecord.dataList);
    saveUserFavorites(favorites);

    res.json({
        status: 'created',
        id: folderId,
        folder: userRecord.dataList.find(item => item.id === folderId)
    });
});

/**
 * POST /api/jupyter/upload-data
 * 上传数据文件到数据服务器，并保存到用户的数据列表
 */
router.post('/upload-data', upload.single('file'), async (req, res) => {
    const userId = req.user.userId;

    if (!req.file) {
        return res.status(400).json({ error: '请选择要上传的文件' });
    }

    try {
        const dataName = req.body.dataName || req.file.originalname;
        const clientFileName = dataName || req.file.originalname;
        const description = req.body.description || '';
        const fileExt = path.extname(clientFileName).slice(1).toLowerCase() || 'unknown';

        const favorites = loadUserFavorites();
        const userRecord = ensureUserFavoritesRecord(favorites, userId);
        const destination = resolveMyDataUploadDestination(userRecord.dataList || [], {
            path: req.body.path || '/',
            parentId: req.body.parentId || '',
            name: dataName,
            filename: clientFileName
        });

        if (!destination.ok) {
            cleanupTempUpload(req.file);
            return res.status(destination.status).json({
                code: destination.code,
                error: destination.message
            });
        }

        userRecord.dataList = destination.dataList;

        // 读取上传的文件
        const fileStream = fs.createReadStream(req.file.path);
        const form = new FormData();
        form.append('datafile', fileStream, clientFileName);
        form.append('name', clientFileName);

        console.log(`[Upload Data] User ${userId} uploading file: ${req.file.originalname}`);

        // 上传到数据服务器
        const response = await axios.post(DATA_SERVER_URL, form, {
            headers: {
                ...form.getHeaders(),
                'token': API_TOKEN
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        // 清理临时文件
        cleanupTempUpload(req.file);

        if (response.status === 200 && (response.data.code === 1 || response.data.code === 0)) {
            console.log('[Upload Data] Success:', response.data);

            // 从响应中提取文件 ID 和 URL
            const fileData = response.data.data || response.data;
            const fileId = fileData.id || fileData.uid || Date.now().toString(36) + Math.random().toString(36).substr(2);
            const fileUrl = fileData.url || `${DATA_SERVER_URL}/${fileId}`;

            // 保存到用户数据列表
            const dataId = fileId;
            userRecord.dataList.push({
                id: dataId,
                name: dataName,
                filename: clientFileName,
                kind: 'file',
                description: description,
                type: fileExt,
                size: req.file.size,
                url: fileUrl,
                parentId: destination.parentId,
                path: destination.dataPath,
                source: 'upload',
                downloadable: true,
                metadata: {},
                uploadedAt: new Date().toISOString()
            });
            userRecord.dataList = normalizeMyDataList(userRecord.dataList);

            saveUserFavorites(favorites);

            console.log(`[Upload Data] User ${userId} uploaded ${dataName} to path: ${destination.dataPath}`);

            res.json({
                success: true,
                dataId: dataId,
                url: fileUrl,
                filename: clientFileName,
                data: userRecord.dataList.find(item => item.id === dataId)
            });
        } else {
            console.error('[Upload Data] Failed:', response.data);
            res.status(500).json({
                error: '上传到数据服务器失败',
                details: response.data
            });
        }
    } catch (error) {
        console.error('[Upload Data] Error:', error.message);
        // 清理临时文件
        cleanupTempUpload(req.file);
        res.status(500).json({
            error: '文件上传失败',
            message: error.message
        });
    }
});

/**
 * GET /api/jupyter/shared-projects
 * Compatibility endpoint for legacy Shared Space links.
 * The canonical public project surface is Case Library.
 */
router.get('/shared-projects', async (req, res) => {
    try {
        res.json({ projects: await listPublicProjectSummaries() });
    } catch (error) {
        console.error('Error fetching shared projects:', error);
        res.status(500).json({ error: '获取共享项目失败' });
    }
});

/**
 * GET /api/jupyter/shared-projects/:owner/:projectName
 * Compatibility endpoint for public project preview.
 */
router.get('/shared-projects/:owner/:projectName', (req, res) => {
    const { owner, projectName } = req.params;
    const projectDir = path.join(USER_DATA_DIR, owner, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    const meta = getProjectMeta(projectDir);
    const caseMeta = meta.isCase ? getCaseMeta(meta) : null;
    if (!meta.isPublic) {
        return res.status(403).json({ error: '该项目未公开' });
    }

    try {
        const fileTree = listSharedProjectTree(projectDir);
        const files = flattenSharedProjectTree(fileTree);
        const fileSummary = getProjectFileSummary(projectDir);

        res.json({
            project: {
                name: projectName,
                description: meta.description || '',
                owner,
                files,
                fileTree,
                ...fileSummary,
                ...getRuntimeFields(meta),
                isCase: !!meta.isCase,
                caseTitle: caseMeta?.title || '',
                case: caseMeta
            }
        });
    } catch (error) {
        console.error('Error fetching shared project:', error);
        res.status(500).json({ error: '获取项目失败' });
    }
});

function buildPublicWorkspaceProject(owner, projectName, projectDir, meta) {
    const caseMeta = meta.isCase ? getCaseMeta(meta) : null;
    const fileTree = listSharedProjectTree(projectDir);
    const files = flattenSharedProjectTree(fileTree);
    const fileSummary = getProjectFileSummary(projectDir);
    const thumbnail = buildPublicProjectThumbnail(owner, projectName, projectDir);

    return {
        name: projectName,
        projectName,
        title: caseMeta?.title || meta.name || projectName,
        description: meta.description || caseMeta?.summary || '',
        owner,
        files,
        fileTree,
        ...fileSummary,
        ...getRuntimeFields(meta),
        isPublic: true,
        isCase: !!meta.isCase,
        caseTitle: caseMeta?.title || '',
        case: caseMeta,
        thumbnail,
        forkedFrom: meta.forkedFrom || null,
        sourceCase: meta.sourceCase || null,
        publicationType: meta.isCase ? 'case' : 'public-project'
    };
}

function sendPublicWorkspaceFileContent(req, res) {
    const { owner, projectName, filePath } = req.params;
    const resolvedFile = resolveSharedProjectFile(owner, projectName, filePath);
    if (resolvedFile.error) {
        return res.status(resolvedFile.status).json({ error: resolvedFile.error });
    }

    try {
        const { fullPath, decodedPath } = resolvedFile;
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            return res.status(415).json({
                error: '文件夹暂不支持直接预览',
                preview: getSharedPreviewInfo(path.basename(fullPath), 'folder')
            });
        }

        const preview = getSharedPreviewInfo(fullPath, 'file');
        if (!preview.previewSupported) {
            return res.status(415).json({
                error: preview.previewReason,
                preview
            });
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        return res.json({
            name: path.basename(fullPath),
            path: decodedPath,
            content,
            size: stats.size,
            modifiedAt: stats.mtime,
            ...preview
        });
    } catch (error) {
        console.error('Error reading public workspace file:', error);
        return res.status(500).json({ error: '读取文件失败' });
    }
}

async function sendPublicWorkspaceNotebookPreview(req, res) {
    const { owner, projectName, filePath } = req.params;
    const resolvedFile = resolveSharedProjectFile(owner, projectName, filePath);
    if (resolvedFile.error) {
        return res.status(resolvedFile.status).json({ error: resolvedFile.error });
    }

    try {
        const { fullPath, decodedPath } = resolvedFile;
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            return res.status(415).json({
                error: '文件夹暂不支持直接预览',
                preview: getSharedPreviewInfo(path.basename(fullPath), 'folder')
            });
        }

        const preview = getSharedPreviewInfo(fullPath, 'file');
        if (!preview.previewSupported) {
            return res.status(415).json({
                error: preview.previewReason,
                preview
            });
        }

        if (preview.previewKind !== 'notebook') {
            return res.status(400).json({ error: '当前文件类型不需要独立的 notebook 预览接口' });
        }

        const html = await renderNotebookPreviewHtml(fullPath);
        return res.json({
            name: path.basename(fullPath),
            path: decodedPath,
            html,
            size: stats.size,
            modifiedAt: stats.mtime,
            ...preview
        });
    } catch (error) {
        console.error('Error rendering public workspace notebook preview:', error);
        return res.status(500).json({ error: 'Notebook 预览生成失败' });
    }
}

function sendPublicWorkspaceFileDownload(req, res) {
    const { owner, projectName, filePath } = req.params;
    const resolvedFile = resolveSharedProjectFile(owner, projectName, filePath);
    if (resolvedFile.error) {
        return res.status(resolvedFile.status).json({ error: resolvedFile.error });
    }

    try {
        const { fullPath } = resolvedFile;
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            return res.status(400).json({ error: '文件夹不支持下载' });
        }
        return res.download(fullPath, path.basename(fullPath));
    } catch (error) {
        console.error('Error downloading public workspace file:', error);
        return res.status(500).json({ error: '文件下载失败' });
    }
}

/**
 * GET /api/jupyter/shared-projects/:owner/:projectName/files/*filePath/content
 * 获取公开项目文件内容（用于预览）
 */
router.get('/shared-projects/:owner/:projectName/files/*filePath/content', (req, res) => {
    return sendPublicWorkspaceFileContent(req, res);
});

/**
 * GET /api/jupyter/shared-projects/:owner/:projectName/files/*filePath/preview
 * 获取共享项目文件的专业预览内容
 */
router.get('/shared-projects/:owner/:projectName/files/*filePath/preview', async (req, res) => {
    return sendPublicWorkspaceNotebookPreview(req, res);
});

/**
 * GET /api/jupyter/shared-projects/:owner/:projectName/files/*filePath/download
 * 下载共享项目文件
 */
router.get('/shared-projects/:owner/:projectName/files/*filePath/download', (req, res) => {
    return sendPublicWorkspaceFileDownload(req, res);
});

/**
 * 递归复制目录
 */
function copyDirectorySync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const items = fs.readdirSync(src, { withFileTypes: true });

    for (const item of items) {
        const srcPath = path.join(src, item.name);
        const destPath = path.join(dest, item.name);

        if (item.isDirectory()) {
            copyDirectorySync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * POST /api/jupyter/fork/:owner/:projectName
 * Fork 公开项目到当前用户空间
 */
router.post('/fork/:owner/:projectName', (req, res) => {
    const currentUser = req.user.username;
    const { owner, projectName } = req.params;
    const newName = req.body?.newName;  // 可选：自定义 fork 后的名称（防御性读取）

    // 不能 fork 自己的项目
    if (owner === currentUser) {
        return res.status(400).json({ error: '不能 fork 自己的项目' });
    }

    const sourceDir = path.join(USER_DATA_DIR, owner, projectName);

    if (!fs.existsSync(sourceDir)) {
        return res.status(404).json({ error: '源项目不存在' });
    }

    const sourceMeta = getProjectMeta(sourceDir);
    if (!sourceMeta.isPublic) {
        return res.status(403).json({ error: '该项目未公开，无法 fork' });
    }

    // 确定目标项目名称
    let targetName = newName?.trim() || projectName;
    const userDir = path.join(USER_DATA_DIR, currentUser);
    let targetDir = path.join(userDir, targetName);

    // 如果目标名称已存在，自动添加后缀
    let suffix = 1;
    while (fs.existsSync(targetDir)) {
        targetName = `${newName?.trim() || projectName}-${suffix}`;
        targetDir = path.join(userDir, targetName);
        suffix++;
    }

    try {
        // 确保用户目录存在
        fs.mkdirSync(userDir, { recursive: true });

        // 复制项目
        copyDirectorySync(sourceDir, targetDir);
        const sourceRuntime = resolveProjectRuntime(sourceMeta);
        const runtimeMeta = buildProjectRuntimeMeta(sourceRuntime.ok ? sourceRuntime.imageId : DEFAULT_IMAGE);

        // 更新元信息
        const newMeta = {
            projectId: crypto.randomUUID(),
            name: targetName,
            description: sourceMeta.description || '',
            isPublic: false,  // fork 后默认不公开
            isCase: false,
            dataBindings: Array.isArray(sourceMeta.dataBindings)
                ? sourceMeta.dataBindings.map(binding => ({ ...binding }))
                : [],
            ...runtimeMeta,
            forkedFrom: {
                owner: owner,
                projectName: projectName
            },
            createdAt: new Date().toISOString(),
            createdBy: currentUser,
            forkedAt: new Date().toISOString()
        };
        saveProjectMeta(targetDir, newMeta);

        const fileSummary = getProjectFileSummary(targetDir);

        res.json({
            status: 'forked',
            project: {
                projectId: newMeta.projectId,
                name: targetName,
                description: newMeta.description,
                ...fileSummary,
                ...getRuntimeFields(newMeta),
                isPublic: false,
                isCase: false,
                caseTitle: '',
                case: null,
                dataBindings: resolveProjectDataBindings(newMeta, getUserDataList(req.user.userId).dataList, { projectDir: targetDir }),
                dataBindingCount: Array.isArray(newMeta.dataBindings) ? newMeta.dataBindings.length : 0,
                forkedFrom: newMeta.forkedFrom,
                owner: currentUser
            }
        });
    } catch (error) {
        console.error('Error forking project:', error);
        res.status(500).json({ error: 'Fork 项目失败' });
    }
});

/**
 * PUT /api/jupyter/projects/:projectName/visibility
 * 更新项目公开状态
 */
router.put('/projects/:projectName/visibility', (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const { isPublic } = req.body;

    const projectDir = path.join(USER_DATA_DIR, username, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: '项目不存在' });
    }

    try {
        const meta = getProjectMeta(projectDir);
        meta.isPublic = !!isPublic;
        saveProjectMeta(projectDir, meta);

        res.json({ status: 'updated', isPublic: meta.isPublic });
    } catch (error) {
        console.error('Error updating visibility:', error);
        res.status(500).json({ error: '更新失败' });
    }
});

/**
 * PUT /api/jupyter/projects/:projectName/case
 * Publish/update/unpublish a case
 */
router.put('/projects/:projectName/case', (req, res) => {
    const username = req.user.username;
    const { projectName } = req.params;
    const { isCase, caseMeta } = req.body || {};

    const projectDir = path.join(USER_DATA_DIR, username, projectName);
    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: 'Project not found' });
    }

    try {
        const meta = getProjectMeta(projectDir);

        if (!isCase) {
            meta.isCase = false;
            delete meta.case;
            saveProjectMeta(projectDir, meta);
            return res.json({
                status: 'updated',
                isCase: false,
                case: null,
                isPublic: !!meta.isPublic
            });
        }

        const normalized = sanitizeCaseMeta(caseMeta || {});
        if (!normalized.title) {
            normalized.title = meta.name || projectName;
        }

        meta.isCase = true;
        meta.isPublic = true;
        if (!meta.runtime?.imageId && !meta.runtimeImageId) {
            Object.assign(meta, buildProjectRuntimeMeta(DEFAULT_IMAGE));
        }
        meta.case = {
            ...normalized,
            updatedAt: new Date().toISOString()
        };

        saveProjectMeta(projectDir, meta);

        return res.json({
            status: 'updated',
            isCase: true,
            isPublic: true,
            case: meta.case
        });
    } catch (error) {
        console.error('Error updating case meta:', error);
        return res.status(500).json({ error: 'Failed to update case' });
    }
});

/**
 * GET /api/jupyter/cases
 * List public runnable case projects for the unified Case Library
 */
router.get('/cases', async (req, res) => {
    try {
        return res.json({ cases: await listPublicProjectSummaries() });
    } catch (error) {
        console.error('Error fetching cases:', error);
        return res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

/**
 * GET /api/jupyter/cases/:owner/:projectName/files/*filePath/content
 * Read public case text/code artifacts.
 */
router.get('/cases/:owner/:projectName/files/*filePath/content', (req, res) => {
    return sendPublicWorkspaceFileContent(req, res);
});

/**
 * GET /api/jupyter/cases/:owner/:projectName/files/*filePath/preview
 * Render public case notebook artifacts.
 */
router.get('/cases/:owner/:projectName/files/*filePath/preview', async (req, res) => {
    return sendPublicWorkspaceNotebookPreview(req, res);
});

/**
 * GET /api/jupyter/cases/:owner/:projectName/files/*filePath/download
 * Download public case artifacts.
 */
router.get('/cases/:owner/:projectName/files/*filePath/download', (req, res) => {
    return sendPublicWorkspaceFileDownload(req, res);
});

/**
 * GET /api/jupyter/cases/:owner/:projectName
 * Get public runnable project details for the unified Case Library
 */
router.get('/cases/:owner/:projectName', (req, res) => {
    const { owner, projectName } = req.params;
    const projectDir = path.join(USER_DATA_DIR, owner, projectName);

    if (!fs.existsSync(projectDir)) {
        return res.status(404).json({ error: 'Case project not found' });
    }

    const meta = getProjectMeta(projectDir);
    if (!meta.isPublic) {
        return res.status(403).json({ error: 'This project is not public' });
    }

    try {
        return res.json({
            case: buildPublicWorkspaceProject(owner, projectName, projectDir, meta)
        });
    } catch (error) {
        console.error('Error fetching case detail:', error);
        return res.status(500).json({ error: 'Failed to fetch case detail' });
    }
});

module.exports = router;
