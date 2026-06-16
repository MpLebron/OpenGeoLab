import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const docsRoot = new URL('../../docs/', import.meta.url);

const readDoc = async (name) => readFile(new URL(name, docsRoot), 'utf8');

test('production deployment guide documents the /OpenGeoLab/ prefix Nginx gateway contract', async () => {
    const guide = await readDoc('PRODUCTION_DEPLOYMENT.md');

    assert.match(guide, /https:\/\/geomodeling\.njnu\.edu\.cn\/OpenGeoLab\//);
    assert.match(guide, /location\s+=\s+\/OpenGeoLab/);
    assert.match(guide, /location\s+\^~\s+\/OpenGeoLab\//);
    assert.match(guide, /proxy_pass http:\/\/172\.21\.212\.155\//);
    assert.match(guide, /proxy_set_header Upgrade \$http_upgrade/);
    assert.match(guide, /proxy_set_header Connection "upgrade"/);
    assert.match(guide, /PUBLIC_ORIGIN=https:\/\/geomodeling\.njnu\.edu\.cn\/OpenGeoLab/);
    assert.match(guide, /VITE_PUBLIC_BASE_PATH=\/OpenGeoLab\//);
    assert.match(guide, /VITE_API_BASE_URL=\/OpenGeoLab/);
    assert.match(guide, /JUPYTER_BIND_HOST=127\.0\.0\.1/);
    assert.match(guide, /docker ps/);
    assert.doesNotMatch(guide, /public.*:8888/i);
});

test('environment and Jupyter docs describe separate local and production configs', async () => {
    const envGuide = await readDoc('ENV_CONFIG.md');
    const jupyterGuide = await readDoc('JUPYTER_SETUP.md');

    assert.match(envGuide, /\.env\.development/);
    assert.match(envGuide, /\.env\.production/);
    assert.match(envGuide, /PUBLIC_ORIGIN/);
    assert.match(envGuide, /VITE_API_BASE_URL/);
    assert.match(envGuide, /\/OpenGeoLab\//);

    assert.match(jupyterGuide, /\/jupyter\//);
    assert.match(jupyterGuide, /\/OpenGeoLab\/jupyter\//);
    assert.match(jupyterGuide, /ServerApp\.base_url/);
    assert.match(jupyterGuide, /127\.0\.0\.1/);
    assert.doesNotMatch(jupyterGuide, /容器会监听 8888\+/);
});
