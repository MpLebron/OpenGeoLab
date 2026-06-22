const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const {
    buildPublicCaseDetail,
    findPublicCaseByProjectId,
    getPreviewInfo,
    listPublicCaseSummaries,
    renderNotebookPreviewHtml,
    resolvePublicCaseFile
} = require('../utils/publicCaseProjects');

const router = express.Router();
const TEXT_PREVIEW_KINDS = new Set(['code', 'text', 'markdown', 'table', 'json', 'geojson', 'html']);
const DIRECT_FILE_PREVIEW_KINDS = new Set(['image', 'pdf']);
const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024 * 4;

function normalizeQuery(value = '') {
    return String(value || '').trim().toLowerCase();
}

function caseMatchesQuery(item = {}, query = '') {
    if (!query) return true;
    const haystack = [
        item.title,
        item.summary,
        item.description,
        item.domain,
        item.owner,
        item.runtime?.label,
        item.runtime?.imageName,
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(Array.isArray(item.case?.datasets) ? item.case.datasets : [])
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
}

function caseMatchesDomain(item = {}, domain = '') {
    if (!domain) return true;
    return String(item.domain || item.case?.scenario || '').trim() === domain;
}

function paginate(items, { page = 1, limit = 24 } = {}) {
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 120);
    const start = (safePage - 1) * safeLimit;
    return {
        total: items.length,
        page: safePage,
        limit: safeLimit,
        data: items.slice(start, start + safeLimit)
    };
}

function sendPreviewError(res, resolvedFile) {
    return res.status(resolvedFile.status || 404).json({
        error: resolvedFile.error || 'File not found'
    });
}

function listZipEntries(filePath, options = {}) {
    const maxEntries = Number.parseInt(options.maxEntries || '500', 10);

    return new Promise(resolve => {
        execFile(
            'unzip',
            ['-l', filePath],
            { timeout: 7000, maxBuffer: 1024 * 1024 * 4 },
            (error, stdout) => {
                if (error) {
                    resolve({
                        entries: [],
                        totalEntries: 0,
                        truncated: false,
                        error: 'Archive listing is unavailable on this machine.'
                    });
                    return;
                }

                const entries = String(stdout || '')
                    .split(/\r?\n/)
                    .map(line => {
                        const match = line.match(/^\s*(\d+)\s+(\d{2,4}-\d{2}-\d{2,4})\s+(\d{2}:\d{2})\s+(.+?)\s*$/);
                        if (!match) return null;
                        const name = match[4];
                        if (!name || name === 'Name') return null;
                        return {
                            size: Number.parseInt(match[1], 10) || 0,
                            date: match[2],
                            time: match[3],
                            name,
                            isDirectory: name.endsWith('/')
                        };
                    })
                    .filter(Boolean);

                resolve({
                    entries: entries.slice(0, maxEntries),
                    totalEntries: entries.length,
                    truncated: entries.length > maxEntries,
                    error: ''
                });
            }
        );
    });
}

router.get('/', async (req, res) => {
    try {
        const query = normalizeQuery(req.query.query);
        const domain = String(req.query.domain || '').trim();
        const cases = await listPublicCaseSummaries();
        const filtered = cases.filter(item => (
            caseMatchesQuery(item, query) &&
            caseMatchesDomain(item, domain)
        ));

        return res.json(paginate(filtered, {
            page: req.query.page,
            limit: req.query.limit
        }));
    } catch (error) {
        console.error('[Cases] Failed to list public case projects:', error.message);
        return res.status(500).json({
            error: 'Failed to read public cases',
            message: error.message
        });
    }
});

router.get('/:projectId/files/*filePath/content', (req, res) => {
    const resolvedFile = resolvePublicCaseFile(req.params.projectId, req.params.filePath);
    if (resolvedFile.error) {
        return sendPreviewError(res, resolvedFile);
    }

    try {
        const stats = fs.statSync(resolvedFile.fullPath);
        if (stats.isDirectory()) {
            return res.status(415).json({ error: 'Folders cannot be previewed as text.' });
        }

        const preview = getPreviewInfo(resolvedFile.fullPath, 'file');
        if (!TEXT_PREVIEW_KINDS.has(preview.previewKind)) {
            return res.status(415).json({ error: 'This file type is not available through the text preview endpoint.' });
        }

        if (stats.size > MAX_TEXT_PREVIEW_BYTES) {
            return res.status(400).json({ error: 'File too large to preview.' });
        }

        return res.json({
            name: path.basename(resolvedFile.fullPath),
            path: resolvedFile.decodedPath,
            content: fs.readFileSync(resolvedFile.fullPath, 'utf8'),
            size: stats.size,
            modifiedAt: stats.mtime,
            ...preview
        });
    } catch (error) {
        console.error('[Cases] Failed to read public case file:', error.message);
        return res.status(500).json({
            error: 'Failed to read case file',
            message: error.message
        });
    }
});

router.get('/:projectId/files/*filePath/preview', async (req, res) => {
    const resolvedFile = resolvePublicCaseFile(req.params.projectId, req.params.filePath);
    if (resolvedFile.error) {
        return sendPreviewError(res, resolvedFile);
    }

    try {
        const stats = fs.statSync(resolvedFile.fullPath);
        if (stats.isDirectory()) {
            return res.status(415).json({ error: 'Folders cannot be previewed directly.' });
        }

        const preview = getPreviewInfo(resolvedFile.fullPath, 'file');
        if (preview.previewKind === 'notebook') {
            const html = await renderNotebookPreviewHtml(resolvedFile.fullPath);
            return res.json({
                name: path.basename(resolvedFile.fullPath),
                path: resolvedFile.decodedPath,
                html,
                size: stats.size,
                modifiedAt: stats.mtime,
                ...preview
            });
        }

        if (DIRECT_FILE_PREVIEW_KINDS.has(preview.previewKind)) {
            return res.sendFile(resolvedFile.fullPath);
        }

        if (TEXT_PREVIEW_KINDS.has(preview.previewKind)) {
            return res.json({
                name: path.basename(resolvedFile.fullPath),
                path: resolvedFile.decodedPath,
                content: fs.readFileSync(resolvedFile.fullPath, 'utf8'),
                size: stats.size,
                modifiedAt: stats.mtime,
                ...preview
            });
        }

        if (preview.previewKind === 'archive') {
            const archive = await listZipEntries(resolvedFile.fullPath);
            return res.json({
                name: path.basename(resolvedFile.fullPath),
                path: resolvedFile.decodedPath,
                archive,
                size: stats.size,
                modifiedAt: stats.mtime,
                ...preview
            });
        }

        return res.status(415).json({
            error: preview.previewReason || 'This file type is not supported for preview.',
            preview
        });
    } catch (error) {
        console.error('[Cases] Failed to render public case preview:', error.message);
        return res.status(500).json({
            error: 'Failed to render case preview',
            message: error.message
        });
    }
});

router.get('/:projectId', (req, res) => {
    try {
        const project = findPublicCaseByProjectId(req.params.projectId);
        if (!project) {
            return res.status(404).json({
                error: 'Case not found',
                message: 'No public runnable case was found for this project id.'
            });
        }

        const detail = buildPublicCaseDetail(project);
        if (!detail) {
            return res.status(404).json({
                error: 'Case not found',
                message: 'No public runnable case was found for this project id.'
            });
        }

        return res.json(detail);
    } catch (error) {
        console.error('[Cases] Failed to read public case detail:', error.message);
        return res.status(500).json({
            error: 'Failed to read public case detail',
            message: error.message
        });
    }
});

module.exports = router;
