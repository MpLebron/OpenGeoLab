#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const {
    DEFAULT_IMAGE,
    JUPYTER_IMAGES,
    buildDockerBuildCommand,
    buildDockerCommandEnv
} = require('../utils/jupyterRuntime');

const SERVER_ROOT = path.join(__dirname, '..');

function printUsage() {
    const ids = Object.keys(JUPYTER_IMAGES).join(', ');
    console.log(`Usage:
  node scripts/buildJupyterRuntimeImages.js <image-id>
  node scripts/buildJupyterRuntimeImages.js --all

Available image IDs:
  ${ids}

Default:
  ${DEFAULT_IMAGE}`);
}

function parseTargets(argv) {
    const args = argv.slice(2).filter(Boolean);
    if (args.includes('--help') || args.includes('-h')) {
        printUsage();
        process.exit(0);
    }
    if (args.includes('--all')) {
        return Object.keys(JUPYTER_IMAGES);
    }
    return args.length ? args : [DEFAULT_IMAGE];
}

function run(command) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, {
            shell: true,
            stdio: 'inherit',
            env: buildDockerCommandEnv()
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`Command failed with exit code ${code}: ${command}`));
        });
    });
}

async function main() {
    const targets = parseTargets(process.argv);

    for (const imageId of targets) {
        const build = buildDockerBuildCommand(imageId, { serverRoot: SERVER_ROOT });
        if (!build.ok) {
            throw new Error(build.message || `Unknown runtime image: ${imageId}`);
        }

        console.log(`\n==> Building ${imageId}`);
        console.log(`    Image: ${build.imageName}`);
        console.log(`    Base:  ${build.baseImage || 'runtime Dockerfile default'}`);
        await run(build.command);
    }

    console.log('\nRuntime image build completed.');
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
