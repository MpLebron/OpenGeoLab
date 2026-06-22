require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { initDatabase, closeDatabase } = require('../db/database');
const { getCasesCollection } = require('../db/casesRepository');
const { CASE_LIBRARY_DIR } = require('../config/cases');

const LEGACY_SOURCE = 'opengmp-notebook';

async function cleanupLegacyNotebookCases() {
    await initDatabase();
    const collection = getCasesCollection();
    const legacyCases = await collection
        .find({ source: LEGACY_SOURCE })
        .project({ slug: 1, title: 1, sourceId: 1 })
        .toArray();

    const slugs = legacyCases
        .map(item => String(item.slug || '').trim())
        .filter(Boolean);

    const deleteResult = await collection.deleteMany({ source: LEGACY_SOURCE });
    let removedDirectories = 0;

    for (const slug of slugs) {
        const target = path.join(CASE_LIBRARY_DIR, slug);
        if (!fs.existsSync(target)) continue;
        fs.rmSync(target, { recursive: true, force: true });
        removedDirectories += 1;
    }

    return {
        matchedRecords: legacyCases.length,
        deletedRecords: deleteResult.deletedCount || 0,
        removedDirectories,
        slugs
    };
}

async function main() {
    try {
        const result = await cleanupLegacyNotebookCases();
        console.log(`Deleted ${result.deletedRecords} legacy notebook case record(s).`);
        console.log(`Removed ${result.removedDirectories} legacy case-library directorie(s).`);
        for (const slug of result.slugs) {
            console.log(`- ${slug}`);
        }
    } finally {
        await closeDatabase();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('[Cases] Failed to clean legacy notebook cases:', error);
        process.exitCode = 1;
    });
}

module.exports = {
    LEGACY_SOURCE,
    cleanupLegacyNotebookCases
};
