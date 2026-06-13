const express = require('express');
const fs = require('fs');
const path = require('path');
const authRoutes = require('./auth');
const { getCaseProjectDirectory } = require('../config/cases');
const { createCaseProjectMeta } = require('../utils/caseProjectMeta');
const {
    getCaseByIdentifier,
    getCaseDocumentByIdentifier,
    listCases
} = require('../db/casesRepository');

const router = express.Router();

function walkProjectFiles(rootDir, relativePath = '') {
    const targetDir = path.join(rootDir, relativePath);
    if (!fs.existsSync(targetDir)) {
        return [];
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true })
        .filter(entry => !entry.name.startsWith('.'));

    const files = [];
    for (const entry of entries) {
        const relativeName = relativePath ? path.posix.join(relativePath, entry.name) : entry.name;
        const absolutePath = path.join(rootDir, relativeName);
        const stats = fs.statSync(absolutePath);

        if (entry.isDirectory()) {
            files.push({
                name: entry.name,
                path: relativeName,
                type: 'folder',
                size: 0,
                modifiedAt: stats.mtime
            });
            files.push(...walkProjectFiles(rootDir, relativeName));
            continue;
        }

        files.push({
            name: entry.name,
            path: relativeName,
            type: relativeName.toLowerCase().endsWith('.ipynb') ? 'notebook' : 'file',
            size: stats.size,
            modifiedAt: stats.mtime
        });
    }

    return files;
}

function ensureSafeProjectPath(rootDir, requestedPath = '') {
    const resolvedRoot = path.resolve(rootDir);
    const resolvedPath = path.resolve(path.join(rootDir, requestedPath));
    if (!resolvedPath.startsWith(resolvedRoot)) {
        return null;
    }
    return resolvedPath;
}

function writeProjectMeta(projectDir, meta) {
    const metaPath = path.join(projectDir, '.project.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

function sanitizeProjectName(value, fallback = 'case-project') {
    const cleaned = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return (cleaned || fallback).slice(0, 64);
}

router.get('/', async (req, res) => {
    try {
        const payload = await listCases({
            page: req.query.page,
            limit: req.query.limit,
            query: req.query.query,
            domain: req.query.domain
        });

        res.json(payload);
    } catch (error) {
        console.error('[Cases] Failed to list cases:', error.message);
        res.status(500).json({
            error: 'Failed to read local cases',
            message: error.message
        });
    }
});

router.get('/:identifier/content', async (req, res) => {
    try {
        const caseDoc = await getCaseDocumentByIdentifier(req.params.identifier);
        if (!caseDoc) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const relativePath = String(req.query.path || '').trim();
        if (!relativePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const projectDir = getCaseProjectDirectory(caseDoc.slug);
        const fullPath = ensureSafeProjectPath(projectDir, relativePath);
        if (!fullPath) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const stats = fs.statSync(fullPath);
        if (stats.size > 1024 * 1024 * 2) {
            return res.status(400).json({ error: 'File too large to preview' });
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        res.json({
            content,
            size: stats.size,
            modifiedAt: stats.mtime
        });
    } catch (error) {
        console.error('[Cases] Failed to read case file:', error.message);
        res.status(500).json({
            error: 'Failed to read case file',
            message: error.message
        });
    }
});

router.post('/:identifier/fork', authRoutes.authenticateToken, async (req, res) => {
    try {
        const caseDoc = await getCaseDocumentByIdentifier(req.params.identifier);
        if (!caseDoc) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const projectTemplateDir = getCaseProjectDirectory(caseDoc.slug);
        if (!fs.existsSync(projectTemplateDir)) {
            return res.status(404).json({ error: 'Case project files are missing' });
        }

        const username = req.user.username;
        const userDataDir = process.env.USER_DATA_DIR && path.isAbsolute(process.env.USER_DATA_DIR)
            ? process.env.USER_DATA_DIR
            : path.join(__dirname, '..', process.env.USER_DATA_DIR || 'jupyter-data');

        const userDir = path.join(userDataDir, username);
        fs.mkdirSync(userDir, { recursive: true });

        let targetName = sanitizeProjectName(req.body?.newName || `case-${caseDoc.slug}`);
        let targetDir = path.join(userDir, targetName);
        let suffix = 1;
        while (fs.existsSync(targetDir)) {
            targetName = sanitizeProjectName(`${req.body?.newName || `case-${caseDoc.slug}`}-${suffix}`);
            targetDir = path.join(userDir, targetName);
            suffix += 1;
        }

        fs.cpSync(projectTemplateDir, targetDir, { recursive: true });
        writeProjectMeta(targetDir, createCaseProjectMeta(username, targetName, caseDoc));

        const files = walkProjectFiles(targetDir).filter(item => item.type !== 'folder');
        const notebookCount = files.filter(item => item.path.toLowerCase().endsWith('.ipynb')).length;

        res.json({
            status: 'forked',
            project: {
                name: targetName,
                description: caseDoc.summary || caseDoc.description || '',
                notebookCount,
                fileCount: files.length,
                modifiedAt: new Date(),
                createdAt: new Date(),
                isPublic: false,
                isCase: false,
                owner: username,
                sourceCase: {
                    slug: caseDoc.slug,
                    title: caseDoc.title
                }
            }
        });
    } catch (error) {
        console.error('[Cases] Failed to fork case:', error.message);
        res.status(500).json({
            error: 'Failed to fork case',
            message: error.message
        });
    }
});

router.get('/:identifier', async (req, res) => {
    try {
        const caseDetail = await getCaseByIdentifier(req.params.identifier);
        if (!caseDetail) {
            return res.status(404).json({
                error: 'Case not found',
                message: 'No local case was found for this identifier.'
            });
        }

        const projectDir = getCaseProjectDirectory(caseDetail.slug);
        const files = walkProjectFiles(projectDir);

        res.json({
            ...caseDetail,
            files
        });
    } catch (error) {
        console.error('[Cases] Failed to read case detail:', error.message);
        res.status(500).json({
            error: 'Failed to read local case detail',
            message: error.message
        });
    }
});

module.exports = router;
