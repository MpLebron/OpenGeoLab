const path = require('path');

const CASE_LIBRARY_DIR = path.join(__dirname, '..', 'uploads', 'case-library');

function getCaseDirectory(slug) {
    return path.join(CASE_LIBRARY_DIR, String(slug || '').trim());
}

function getCaseProjectDirectory(slug) {
    return path.join(getCaseDirectory(slug), 'project');
}

module.exports = {
    CASE_LIBRARY_DIR,
    getCaseDirectory,
    getCaseProjectDirectory
};
