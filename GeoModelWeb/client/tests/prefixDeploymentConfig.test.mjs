import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const clientRoot = path.resolve(import.meta.dirname, '..')

function readClientFile(relativePath) {
  const filePath = path.join(clientRoot, relativePath)
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
}

test('client production build is configurable for the /OpenGeoLab/ deployment prefix', () => {
  const viteConfig = readClientFile('vite.config.js')
  const routerSource = readClientFile('src/router/index.js')
  const mainSource = readClientFile('src/main.js')
  const apiClientSource = readClientFile('src/utils/apiClient.js')
  const prodEnv = readClientFile('.env.production.example')
  const devEnv = readClientFile('.env.development.example')

  assert.match(viteConfig, /VITE_PUBLIC_BASE_PATH/)
  assert.match(viteConfig, /base:\s*normalizeViteBasePath\(publicBasePath\)/)
  assert.match(routerSource, /createWebHistory\(import\.meta\.env\.BASE_URL\)/)

  assert.match(apiClientSource, /export function configureApiClient/)
  assert.match(apiClientSource, /axios\.defaults\.baseURL/)
  assert.match(apiClientSource, /export function createApiClient/)
  assert.match(mainSource, /configureApiClient\(\)/)

  assert.match(prodEnv, /VITE_PUBLIC_BASE_PATH=\/OpenGeoLab\//)
  assert.match(prodEnv, /VITE_API_BASE_URL=\/OpenGeoLab/)
  assert.match(devEnv, /VITE_PUBLIC_BASE_PATH=\//)
  assert.match(devEnv, /VITE_API_BASE_URL=http:\/\/localhost:3000/)
})

test('client sources avoid root-absolute static assets and navigation links', () => {
  const indexHtml = readClientFile('index.html')
  const appSource = readClientFile('src/App.vue')
  const dashboardSource = readClientFile('src/views/JupyterDashboard.vue')
  const projectSource = readClientFile('src/views/JupyterProject.vue')

  assert.match(indexHtml, /%BASE_URL%favicon\.ico/)
  assert.doesNotMatch(appSource, /src="\/logo\.png"/)
  assert.doesNotMatch(appSource, /href="\/jupyter"/)
  assert.doesNotMatch(dashboardSource, /href="\/"/)
  assert.doesNotMatch(projectSource, /src="\/logo\.png"/)
  assert.doesNotMatch(projectSource, /href="\/"/)
})
