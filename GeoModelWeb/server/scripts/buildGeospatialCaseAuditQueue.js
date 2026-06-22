#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_INPUT = path.join(ROOT, 'output', 'geospatial-case-research', 'github-geospatial-candidates.json');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'output', 'geospatial-case-research');

function parseArgs(argv) {
    const args = {
        input: DEFAULT_INPUT,
        outDir: DEFAULT_OUTPUT_DIR,
        limit: 140
    };

    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = argv[i + 1];
        if (arg === '--input' && next) {
            args.input = path.resolve(next);
            i += 1;
        } else if (arg === '--out' && next) {
            args.outDir = path.resolve(next);
            i += 1;
        } else if (arg === '--limit' && next) {
            args.limit = Number(next);
            i += 1;
        }
    }

    args.limit = Math.max(10, args.limit || 140);
    return args;
}

function hasClearLicense(item) {
    const license = String(item.evidence?.license || '').toLowerCase();
    return license && license !== 'none' && license !== 'noassertion';
}

function classify(item) {
    const evidence = item.evidence || {};
    const notebookCount = evidence.notebookCount || 0;
    const dataFileCount = (evidence.dataFiles || []).length;
    const envFileCount = (evidence.environmentFiles || []).length;
    const outputFileCount = (evidence.outputFiles || []).length;
    const externalSignals = evidence.externalDataSignals || [];
    const readmeSignals = evidence.readmeRunSignals || [];
    const licenseOk = hasClearLicense(item);
    const hasLocalData = dataFileCount >= 3;
    const hasRuntime = envFileCount > 0;
    const hasOutputs = outputFileCount > 0;
    const hasWorkflowCopy = readmeSignals.length >= 4;
    const remoteHeavy = externalSignals.some(signal => (
        ['gee', 'google earth engine', 'planet', 'earthdata', 'stac'].includes(signal)
    )) || (!hasLocalData && externalSignals.length > 0);
    const tooLarge = (item.sizeKb || 0) > 1_500_000;

    let tier = 'D - low priority / weak evidence';
    const reasons = [];

    if (notebookCount === 0) reasons.push('no notebook evidence');
    if (!licenseOk) reasons.push('license missing or unclear');
    if (!hasLocalData) reasons.push('local data not clearly bundled');
    if (!hasRuntime) reasons.push('runtime/environment file missing');
    if (!hasWorkflowCopy) reasons.push('README/workflow signals weak');
    if (remoteHeavy) reasons.push('external service or remote data likely required');
    if (tooLarge) reasons.push('repository is very large');

    if (
        notebookCount > 0 &&
        hasLocalData &&
        hasRuntime &&
        licenseOk &&
        hasWorkflowCopy &&
        item.score >= 55 &&
        !remoteHeavy &&
        !tooLarge
    ) {
        tier = hasOutputs
            ? 'A - first conversion candidates'
            : 'B - conversion candidates, regenerate outputs';
    } else if (
        notebookCount > 0 &&
        hasLocalData &&
        licenseOk &&
        item.score >= 45 &&
        !remoteHeavy
    ) {
        tier = 'B - conversion candidates, needs runtime/output audit';
    } else if (
        notebookCount > 0 &&
        item.score >= 50 &&
        (remoteHeavy || externalSignals.length > 0)
    ) {
        tier = 'C - strong but remote-service dependent';
    }

    return {
        tier,
        reasons,
        conversionRisk: tier.startsWith('A') ? 'low' : tier.startsWith('B') ? 'medium' : tier.startsWith('C') ? 'remote dependency' : 'high'
    };
}

function sortQueue(items) {
    const tierRank = {
        'A': 4,
        'B': 3,
        'C': 2,
        'D': 1
    };
    return [...items].sort((a, b) => {
        const ar = tierRank[a.audit.tier[0]] || 0;
        const br = tierRank[b.audit.tier[0]] || 0;
        return br - ar || b.score - a.score || b.stars - a.stars;
    });
}

function compactEvidence(item) {
    const evidence = item.evidence || {};
    return {
        notebooks: (evidence.notebooks || []).slice(0, 5),
        dataFiles: (evidence.dataFiles || []).slice(0, 8),
        environmentFiles: (evidence.environmentFiles || []).slice(0, 5),
        outputFiles: (evidence.outputFiles || []).slice(0, 5),
        externalDataSignals: evidence.externalDataSignals || [],
        license: evidence.license || ''
    };
}

function markdown(queue, source) {
    const generatedAt = new Date().toISOString();
    const counts = queue.reduce((acc, item) => {
        const key = item.audit.tier.slice(0, 1);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const lines = [];
    lines.push('# OpenGeoLab Case Manual Audit Queue');
    lines.push('');
    lines.push(`Generated at: ${generatedAt}`);
    lines.push(`Source file: ${source}`);
    lines.push('');
    lines.push('## Meaning');
    lines.push('');
    lines.push('- A: likely first conversion candidates with notebooks, bundled data, environment evidence, license, workflow signals, and often outputs.');
    lines.push('- B: plausible conversion candidates, but need runtime reconstruction, output regeneration, or extra audit.');
    lines.push('- C: strong scientific/notebook repositories but likely dependent on remote APIs or external data services.');
    lines.push('- D: low priority until stronger data/runtime evidence is found.');
    lines.push('');
    lines.push('## Counts');
    lines.push('');
    lines.push(`- A: ${counts.A || 0}`);
    lines.push(`- B: ${counts.B || 0}`);
    lines.push(`- C: ${counts.C || 0}`);
    lines.push(`- D: ${counts.D || 0}`);
    lines.push(`- Total queued: ${queue.length}`);
    lines.push('');
    lines.push('## Queue');
    lines.push('');
    lines.push('| Rank | Tier | Score | Repository | Stars | License | Risk | Key evidence |');
    lines.push('|---:|---|---:|---|---:|---|---|---|');
    queue.forEach((item, idx) => {
        const ev = item.evidence || {};
        const evidence = [
            `${ev.notebookCount || 0} nb`,
            `${(ev.dataFiles || []).length} data`,
            `${(ev.environmentFiles || []).length} env`,
            `${(ev.outputFiles || []).length} outputs`
        ].join('; ');
        lines.push(`| ${idx + 1} | ${item.audit.tier} | ${item.score} | [${item.fullName}](${item.htmlUrl}) | ${item.stars} | ${ev.license || 'none'} | ${item.audit.conversionRisk} | ${evidence} |`);
    });
    lines.push('');
    lines.push('## Detail Notes');
    lines.push('');
    queue.slice(0, 80).forEach((item, idx) => {
        const ev = compactEvidence(item);
        lines.push(`### ${idx + 1}. ${item.fullName}`);
        lines.push('');
        lines.push(`- Tier: ${item.audit.tier}`);
        lines.push(`- URL: ${item.htmlUrl}`);
        lines.push(`- Score: ${item.score}; Fit: ${item.caseFit}; Stars: ${item.stars}; Size: ${item.sizeLabel}`);
        lines.push(`- License: ${ev.license || 'none'}`);
        lines.push(`- Description: ${item.description || 'No description'}`);
        if (item.audit.reasons.length) lines.push(`- Audit concerns: ${item.audit.reasons.join('; ')}`);
        lines.push(`- Notebooks: ${ev.notebooks.join('; ') || 'none'}`);
        lines.push(`- Data: ${ev.dataFiles.join('; ') || ev.externalDataSignals.join(', ') || 'none'}`);
        lines.push(`- Runtime: ${ev.environmentFiles.join('; ') || 'none'}`);
        lines.push(`- Outputs: ${ev.outputFiles.join('; ') || 'none'}`);
        lines.push('');
    });
    return `${lines.join('\n')}\n`;
}

function main() {
    const args = parseArgs(process.argv);
    const data = JSON.parse(fs.readFileSync(args.input, 'utf8'));
    const pool = (data.candidates || data.allCandidates || [])
        .slice(0, args.limit)
        .map(item => ({
            ...item,
            audit: classify(item)
        }));

    const queue = sortQueue(pool);
    fs.mkdirSync(args.outDir, { recursive: true });
    const jsonPath = path.join(args.outDir, 'manual-audit-queue.json');
    const mdPath = path.join(args.outDir, 'manual-audit-queue.md');
    fs.writeFileSync(jsonPath, JSON.stringify({
        generatedAt: new Date().toISOString(),
        source: args.input,
        total: queue.length,
        counts: queue.reduce((acc, item) => {
            const key = item.audit.tier.slice(0, 1);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {}),
        queue
    }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(mdPath, markdown(queue, args.input), 'utf8');

    const counts = queue.reduce((acc, item) => {
        const key = item.audit.tier.slice(0, 1);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    console.log(JSON.stringify({
        jsonPath,
        mdPath,
        total: queue.length,
        counts,
        top: queue.slice(0, 12).map(item => ({
            tier: item.audit.tier,
            score: item.score,
            repo: item.fullName,
            risk: item.audit.conversionRisk
        }))
    }, null, 2));
}

if (require.main === module) {
    main();
}
