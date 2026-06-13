require('dotenv').config();

const { initDatabase, closeDatabase } = require('../db/database');
const { getCasesCollection } = require('../db/casesRepository');
const { syncLocalCaseSeeds } = require('../utils/localCaseSeeds');

async function main() {
    await initDatabase();
    const syncedAt = new Date();
    const result = await syncLocalCaseSeeds({
        casesCollection: getCasesCollection(),
        syncedAt
    });
    console.log(`Seeded ${result.cases.length} workbench case project(s) for ${result.owner}.`);
    for (const item of result.cases) {
        console.log(`- ${item.owner}/${item.projectName}: ${item.meta.case.title}`);
    }
    if (result.cleanup.deletedRecords > 0) {
        console.log(`Removed ${result.cleanup.deletedRecords} system case record(s) for local workbench seeds.`);
    }
}

if (require.main === module) {
    main()
        .catch(error => {
            console.error('[Local Cases] Failed to seed local cases:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            await closeDatabase();
        });
}

module.exports = {
    main
};
