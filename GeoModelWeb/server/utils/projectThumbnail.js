const fs = require('fs');
const path = require('path');

const THUMBNAIL_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const THUMBNAIL_NAME_PATTERNS = [
    /risk/i,
    /scenario/i,
    /cluster/i,
    /map/i,
    /overview/i,
    /diagnostic/i,
    /comparison/i,
    /priority/i,
    /dispatch/i,
    /susceptibility/i,
    /heat/i,
    /network/i,
    /response/i,
    /panel/i,
    /result/i
];

function toPosixPath(value = '') {
    return String(value || '').split(path.sep).join('/');
}

function scoreThumbnailCandidate(candidate) {
    const relativePath = candidate.path;
    const fileName = path.basename(relativePath);
    let score = 0;

    if (relativePath.startsWith('outputs/')) score += 1000;
    if (relativePath.includes('/outputs/')) score += 800;
    if (/montage|sample/i.test(fileName)) score -= 80;

    for (const pattern of THUMBNAIL_NAME_PATTERNS) {
        if (pattern.test(fileName) || pattern.test(relativePath)) {
            score += 40;
        }
    }

    score += Math.min(120, Math.round(Number(candidate.size || 0) / 4096));
    return score;
}

function isOutputThumbnailCandidate(candidate) {
    const relativePath = String(candidate?.path || '').replace(/\\/g, '/');
    return /(^|\/)outputs?\//i.test(relativePath);
}

function collectThumbnailCandidates(projectPath, relativeDir = '') {
    const currentDir = relativeDir ? path.join(projectPath, relativeDir) : projectPath;
    if (!fs.existsSync(currentDir)) return [];

    const candidates = [];
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.name || entry.name.startsWith('.') || entry.name === '__pycache__') {
            continue;
        }

        const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            candidates.push(...collectThumbnailCandidates(projectPath, relativePath));
            continue;
        }

        if (!entry.isFile()) continue;

        const extension = path.extname(entry.name).toLowerCase();
        if (!THUMBNAIL_EXTENSIONS.has(extension)) continue;

        const stats = fs.statSync(fullPath);
        candidates.push({
            name: entry.name,
            path: toPosixPath(relativePath),
            size: stats.size,
            modifiedAt: stats.mtime
        });
    }

    return candidates;
}

function findProjectThumbnail(projectPath) {
    const candidates = collectThumbnailCandidates(projectPath)
        .filter(isOutputThumbnailCandidate);
    if (!candidates.length) return null;

    return candidates
        .map(candidate => ({
            ...candidate,
            score: scoreThumbnailCandidate(candidate)
        }))
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.size !== a.size) return b.size - a.size;
            return a.path.localeCompare(b.path, 'en', { sensitivity: 'base', numeric: true });
        })[0];
}

module.exports = {
    THUMBNAIL_EXTENSIONS,
    collectThumbnailCandidates,
    findProjectThumbnail,
    isOutputThumbnailCandidate,
    scoreThumbnailCandidate
};
