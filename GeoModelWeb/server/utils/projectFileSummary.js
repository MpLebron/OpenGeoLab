const fs = require('fs');
const path = require('path');

function shouldSkipProjectEntry(name) {
    return !name || name.startsWith('.') || name === '__pycache__';
}

function summarizeProjectFiles(projectPath) {
    const rootStats = fs.statSync(projectPath);
    const summary = {
        notebookCount: 0,
        fileCount: 0,
        sizeBytes: 0,
        modifiedAt: rootStats.mtime,
        createdAt: rootStats.birthtime
    };

    function visit(directoryPath) {
        const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

        for (const entry of entries) {
            if (shouldSkipProjectEntry(entry.name)) {
                continue;
            }

            const entryPath = path.join(directoryPath, entry.name);
            let entryStats;
            try {
                entryStats = fs.lstatSync(entryPath);
            } catch (error) {
                continue;
            }

            if (entryStats.mtime > summary.modifiedAt) {
                summary.modifiedAt = entryStats.mtime;
            }

            if (entry.isSymbolicLink()) {
                continue;
            }

            if (entry.isDirectory()) {
                visit(entryPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            summary.fileCount += 1;
            summary.sizeBytes += entryStats.size;
            if (entry.name.toLowerCase().endsWith('.ipynb')) {
                summary.notebookCount += 1;
            }
        }
    }

    visit(projectPath);
    return summary;
}

module.exports = {
    shouldSkipProjectEntry,
    summarizeProjectFiles
};
