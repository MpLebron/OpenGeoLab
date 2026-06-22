<template>
  <div class="case-asset-page" :class="{ 'with-site-nav': isPublicCaseRoute }">
    <header class="case-asset-nav">
      <button class="nav-brand" type="button" @click="goBack">
        <AppIcon name="arrowLeft" :size="16" :stroke-width="2" />
        <span>Back</span>
      </button>

      <div v-if="caseData" class="case-nav-actions">
        <button class="fork-btn secondary" type="button" @click="runProject" :disabled="isRunning">
          {{ isRunning ? 'Starting...' : 'Run Case' }}
        </button>
        <button class="fork-btn" type="button" @click="forkProject" :disabled="isForking">
          {{ isForking ? 'Forking...' : 'Fork to My Space' }}
        </button>
      </div>
    </header>

    <main class="case-asset-shell">
      <div v-if="loading" class="page-state full">
        <span class="spinner"></span>
        <p>Loading public case...</p>
      </div>

      <div v-else-if="error" class="page-state full error">
        <div class="state-icon">!</div>
        <p>{{ error }}</p>
        <button class="ghost-btn" type="button" @click="loadCase">Retry</button>
      </div>

      <template v-else-if="caseData">
        <section class="case-overview-strip" :class="{ 'with-visual': caseThumbnailUrl }">
          <div class="case-overview-copy">
            <div class="case-hero-topline">
              <span>{{ caseData.isCase ? 'Research case' : 'Shared workspace' }}</span>
              <span v-if="caseScenario">{{ caseScenario }}</span>
            </div>
            <h2>{{ caseTitle }}</h2>
            <p>{{ caseSummary }}</p>
            <div v-if="caseTags.length" class="case-tags">
              <span v-for="tag in caseTags" :key="tag">{{ tag }}</span>
            </div>
            <dl class="case-hero-metrics" aria-label="Case metadata">
              <div>
                <dt>Contributor</dt>
                <dd>@{{ caseData.owner }}</dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>{{ caseData.fileCount }}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{{ formatSize(caseData.sizeBytes) }}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{{ formatDateTime(caseData.modifiedAt) }}</dd>
              </div>
              <div v-if="caseRuntimeImage" class="metric-wide">
                <dt>Runtime image</dt>
                <dd>{{ caseRuntimeImage }}</dd>
              </div>
            </dl>
          </div>

          <aside v-if="caseThumbnailUrl" class="case-hero-aside" aria-label="Case visual preview">
            <div class="case-visual-float">
              <img class="case-visual-aura" :src="caseThumbnailUrl" alt="" aria-hidden="true">
              <img class="case-visual-image" :src="caseThumbnailUrl" :alt="`${caseTitle} output preview`">
            </div>
          </aside>
        </section>

        <section class="asset-workspace">
          <aside class="workspace-sidebar">
            <div class="explorer-header">
              <p class="explorer-title">EXPLORER</p>
              <div class="explorer-actions">
                <button class="tool-btn" type="button" title="Expand folders" aria-label="Expand folders" @click="expandAllFolders">
                  <AppIcon name="plus" :size="15" :stroke-width="1.9" />
                </button>
                <button class="tool-btn" type="button" title="Collapse folders" aria-label="Collapse folders" @click="collapseAllFolders">
                  <AppIcon name="minus" :size="15" :stroke-width="1.9" />
                </button>
                <button class="tool-btn" type="button" title="Refresh" aria-label="Refresh explorer" @click="refreshExplorer">
                  <AppIcon name="refresh" :size="15" :stroke-width="1.9" />
                </button>
              </div>
            </div>

            <div class="explorer-search">
              <StyledSearch v-model="searchQuery" placeholder="Search files..." />
            </div>

            <p v-if="forkMessage" class="fork-message">{{ forkMessage }}</p>

            <div v-if="visibleExplorerEntries.length" class="explorer-tree" role="tree" aria-label="Public case explorer">
              <button
                v-for="entry in visibleExplorerEntries"
                :key="entry.path"
                type="button"
                class="tree-row"
                :class="{
                  active: selectedFile?.path === entry.path,
                  folder: entry.type === 'folder',
                  expanded: entry.type === 'folder' && isFolderExpanded(entry.path)
                }"
                :style="{ '--depth': entry.depth }"
                @click="handleTreeRowClick(entry)"
              >
                <span class="tree-indent"></span>
                <span v-if="entry.type === 'folder'" class="tree-chevron">
                  <AppIcon :name="isFolderExpanded(entry.path) ? 'chevronDown' : 'chevronRight'" :size="14" :stroke-width="2" />
                </span>
                <span v-else class="tree-chevron placeholder"></span>
                <span class="tree-icon" :class="treeIconClass(entry)">
                  <FileKindIcon :file="entry" :size="15" :stroke-width="1.8" />
                </span>
                <span class="tree-label" :title="entry.path">{{ entry.name }}</span>
                <span class="tree-size">{{ entry.type === 'folder' ? '' : formatSize(entry.size) }}</span>
              </button>
            </div>

            <div v-else class="explorer-empty">
              <p>{{ searchQuery ? 'No files match the current search.' : 'This case has no visible artifacts.' }}</p>
            </div>
          </aside>

          <section class="workspace-main">
            <div class="breadcrumb-row">
              <template v-if="selectedFilePathSegments.length">
                <span v-for="(segment, index) in selectedFilePathSegments" :key="`${segment}-${index}`">
                  <template v-if="index > 0">›</template>
                  <strong v-if="index === selectedFilePathSegments.length - 1">{{ segment }}</strong>
                  <span v-else>{{ segment }}</span>
                </span>
              </template>
              <template v-else>
                <span>root</span>
                <span>›</span>
                <strong>{{ caseData.projectName }}</strong>
              </template>
            </div>

            <section v-if="!selectedFile" class="info-panel">
              <div class="info-card">
                <p class="sidebar-eyebrow">Workspace overview</p>
                <h3>{{ caseTitle }}</h3>
                <p>{{ caseSummary }}</p>
              </div>
            </section>

            <section v-else-if="loadingPreview" class="document-panel preview-state">
              <span class="spinner"></span>
              <span>Preparing preview...</span>
            </section>

            <section v-else-if="previewError" class="document-panel preview-state error">
              <div class="state-icon">!</div>
              <p>{{ previewError }}</p>
            </section>

            <section v-else-if="selectedFile.previewKind === 'notebook'" class="document-panel notebook-panel">
              <div class="document-head">
                <div class="document-title">
                  <span class="doc-badge notebook">
                    <FileKindIcon :file="selectedFile" :size="18" :stroke-width="1.85" />
                  </span>
                  <div>
                    <h3>{{ selectedFile.name }}</h3>
                    <p>{{ fileSubtitle(selectedFile, formatSize) }}</p>
                  </div>
                </div>
                <div class="document-actions">
                  <span class="readonly-badge">Preview</span>
                  <button class="icon-btn" type="button" title="Download file" aria-label="Download file" @click="downloadSelectedFile">
                    <AppIcon name="download" :size="15" :stroke-width="1.9" />
                  </button>
                </div>
              </div>

              <iframe
                v-if="notebookPreviewHtml"
                ref="notebookFrame"
                class="notebook-frame"
                :srcdoc="notebookPreviewHtml"
                sandbox="allow-scripts allow-same-origin"
                scrolling="no"
                title="Notebook preview"
                @load="scheduleNotebookFrameResize"
              ></iframe>
            </section>

            <section v-else-if="selectedFile.previewSupported" class="document-panel" :class="`${selectedFile.previewKind}-panel`">
              <div class="document-head">
                <div class="document-title">
                  <span class="doc-badge" :class="selectedFile.previewKind">
                    <FileKindIcon :file="selectedFile" :size="18" :stroke-width="1.85" />
                  </span>
                  <div>
                    <h3>{{ selectedFile.name }}</h3>
                    <p>{{ fileSubtitle(selectedFile, formatSize) }}</p>
                  </div>
                </div>
                <div class="document-actions">
                  <span class="readonly-badge">Preview</span>
                  <button v-if="canCopySelectedPreview" class="icon-btn" type="button" title="Copy content" aria-label="Copy content" @click="copySelectedContent">
                    <AppIcon name="copy" :size="15" :stroke-width="1.9" />
                  </button>
                  <button class="icon-btn" type="button" title="Download file" aria-label="Download file" @click="downloadSelectedFile">
                    <AppIcon name="download" :size="15" :stroke-width="1.9" />
                  </button>
                </div>
              </div>

              <div v-if="selectedFile.previewKind === 'markdown'" class="markdown-document" v-html="markdownHtml"></div>

              <div v-else-if="selectedFile.previewKind === 'table'" class="table-preview">
                <div class="preview-summary">
                  <span>{{ tablePreview.rowCount }} rows</span>
                  <span>{{ tablePreview.columnCount }} columns</span>
                  <span v-if="tablePreview.truncated">Showing first {{ tablePreview.rows.length }} rows</span>
                </div>
                <div class="data-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th v-for="(header, index) in tablePreview.header" :key="`header-${index}`">{{ header }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in tablePreview.rows" :key="`row-${rowIndex}`">
                        <td v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div v-else-if="selectedFile.previewKind === 'geojson'" class="geojson-preview">
                <div v-if="geoJsonPreview.ok" class="geojson-layout">
                  <div class="geo-map-frame">
                    <svg viewBox="0 0 920 520" role="img" :aria-label="`${selectedFile.name} geospatial preview`">
                      <rect class="geo-map-bg" x="0" y="0" width="920" height="520" rx="8"></rect>
                      <polygon
                        v-for="(shape, index) in geoJsonPreview.shapes.filter(item => item.kind === 'polygon')"
                        :key="`poly-${index}`"
                        class="geo-shape polygon"
                        :points="formatShapePoints(shape.points)"
                      ></polygon>
                      <polyline
                        v-for="(shape, index) in geoJsonPreview.shapes.filter(item => item.kind === 'line')"
                        :key="`line-${index}`"
                        class="geo-shape line"
                        :points="formatShapePoints(shape.points)"
                      ></polyline>
                      <circle
                        v-for="(shape, index) in geoJsonPreview.shapes.filter(item => item.kind === 'point')"
                        :key="`point-${index}`"
                        class="geo-shape point"
                        :cx="shape.point[0]"
                        :cy="shape.point[1]"
                        r="4"
                      ></circle>
                    </svg>
                  </div>
                  <aside class="geojson-side">
                    <div class="preview-summary stacked">
                      <span>{{ geoJsonPreview.featureCount }} features</span>
                      <span v-for="(count, type) in geoJsonPreview.geometryCounts" :key="type">{{ type }}: {{ count }}</span>
                    </div>
                    <div v-if="geoJsonPreview.properties.length" class="properties-preview">
                      <h4>Feature properties</h4>
                      <div v-for="item in geoJsonPreview.properties" :key="item.index" class="property-row">
                        <strong>#{{ item.index }} {{ item.type }}</strong>
                        <span>{{ summarizeProperties(item.properties) }}</span>
                      </div>
                    </div>
                  </aside>
                </div>
                <div v-else class="structured-error">
                  <strong>GeoJSON preview failed</strong>
                  <span>{{ geoJsonPreview.error }}</span>
                </div>
              </div>

              <div v-else-if="selectedFile.previewKind === 'json'" class="json-preview">
                <div class="preview-summary">
                  <span>{{ jsonPreview.summary }}</span>
                  <span v-if="!jsonPreview.ok">{{ jsonPreview.error }}</span>
                </div>
                <pre>{{ jsonPreview.formatted }}</pre>
              </div>

              <iframe
                v-else-if="selectedFile.previewKind === 'html'"
                class="html-frame"
                :srcdoc="fileContent"
                sandbox="allow-scripts"
                title="HTML file preview"
              ></iframe>

              <iframe
                v-else-if="selectedFile.previewKind === 'pdf'"
                class="pdf-frame"
                :src="directPreviewUrl"
                title="PDF file preview"
              ></iframe>

              <div v-else-if="selectedFile.previewKind === 'image'" class="image-preview-frame">
                <img :src="directPreviewUrl" :alt="selectedFile.name">
              </div>

              <div v-else-if="selectedFile.previewKind === 'archive'" class="archive-preview">
                <div class="preview-summary">
                  <span>{{ archivePreview?.totalEntries || 0 }} entries</span>
                  <span v-if="archivePreview?.truncated">Showing first {{ archivePreview.entries.length }}</span>
                  <span v-if="archivePreview?.error">{{ archivePreview.error }}</span>
                </div>
                <div v-if="archivePreview?.entries?.length" class="archive-list">
                  <div v-for="entry in archivePreview.entries" :key="entry.name" class="archive-row">
                    <span class="archive-kind">{{ entry.isDirectory ? 'DIR' : 'FILE' }}</span>
                    <span class="archive-name">{{ entry.name }}</span>
                    <span class="archive-size">{{ entry.isDirectory ? '' : formatSize(entry.size) }}</span>
                    <span class="archive-date">{{ entry.date }} {{ entry.time }}</span>
                  </div>
                </div>
                <div v-else class="structured-error">
                  <strong>Archive listing unavailable</strong>
                  <span>Download the archive to inspect its contents locally.</span>
                </div>
              </div>

              <div v-else class="document-body" :class="selectedFile.previewKind">
                <div class="code-sheet" :class="selectedFile.previewKind">
                  <div
                    v-for="(line, index) in highlightedFileLines"
                    :key="`${selectedFile.path}-${index}`"
                    class="code-row"
                  >
                    <span class="line-number">{{ index + 1 }}</span>
                    <span class="line-content" v-html="line"></span>
                  </div>
                </div>
              </div>
            </section>

            <section v-else class="document-panel unsupported-panel">
              <div class="unsupported-card">
                <div class="unsupported-mark">
                  <FileKindIcon :file="selectedFile" :size="28" :stroke-width="1.75" />
                </div>
                <div class="unsupported-copy">
                  <h3>此类文件暂不支持预览</h3>
                  <p>{{ selectedFile.previewReason || '当前文件无法在网页端直接可视化。' }}</p>
                  <button v-if="selectedFile.type !== 'folder'" class="ghost-btn" type="button" @click="downloadSelectedFile">Download file</button>
                </div>
              </div>
            </section>
          </section>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import bash from 'highlight.js/lib/languages/bash'
import {
  escapeHtml,
  fileLanguage,
  fileSubtitle,
  normalizeFile,
  pickPreferredPreviewFile,
  splitLines
} from '../utils/filePreview.js'
import {
  buildGeoJsonPreview,
  formatShapePoints,
  parseDelimitedText,
  parseJsonPreview,
  renderMarkdown
} from '../utils/filePreviewRenderers.js'
import StyledSearch from '../components/StyledSearch.vue'
import AppIcon from '../components/AppIcon.vue'
import FileKindIcon from '../components/FileKindIcon.vue'
import { buildWorkspaceProjectRoutePath } from '../utils/workspaceProjectDisplay.js'
import { notify } from '../utils/systemFeedback.js'
import { createApiClient, resolvePublicResourceUrl } from '../utils/apiClient.js'

hljs.registerLanguage('python', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('bash', bash)

const route = useRoute()
const router = useRouter()

const CONTENT_PREVIEW_KINDS = new Set(['code', 'text', 'markdown', 'table', 'json', 'geojson', 'html'])
const DIRECT_PREVIEW_KINDS = new Set(['image', 'pdf'])

const owner = computed(() => route.params.owner)
const projectName = computed(() => route.params.projectName)
const publicProjectId = computed(() => String(route.params.projectId || '').trim())
const isPublicCaseRoute = computed(() => route.name === 'CasesDetail')
const pendingCaseActionKey = 'opengeolab_pending_case_action'

const loading = ref(true)
const error = ref('')
const caseData = ref(null)
const selectedFile = ref(null)
const loadingPreview = ref(false)
const previewError = ref('')
const fileContent = ref('')
const notebookPreviewHtml = ref('')
const notebookFrame = ref(null)
const imagePreviewUrl = ref('')
const directPreviewUrl = ref('')
const archivePreview = ref(null)
const searchQuery = ref('')
const expandedFolders = ref(new Set())
const isForking = ref(false)
const isRunning = ref(false)
const forkMessage = ref('')
const pendingActionConsumed = ref(false)

const getToken = () => localStorage.getItem('jupyter_token')
const authAxios = () => {
  const token = getToken()
  return createApiClient({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const readAxios = () => (isPublicCaseRoute.value ? createApiClient() : authAxios())

const caseTitle = computed(() => {
  return caseData.value?.case?.title || caseData.value?.title || caseData.value?.caseTitle || caseData.value?.projectName || 'Untitled case'
})

const caseSummary = computed(() => {
  return caseData.value?.case?.summary || caseData.value?.description || 'Public read-only Jupyter workspace shared through OpenGeoLab Case Library.'
})

const caseTags = computed(() => Array.isArray(caseData.value?.case?.tags) ? caseData.value.case.tags.filter(Boolean) : [])
const caseScenario = computed(() => String(caseData.value?.case?.scenario || caseData.value?.domain || '').trim())
const caseRuntimeImage = computed(() => {
  return String(
    caseData.value?.runtime?.imageName ||
    caseData.value?.runtime?.imageId ||
    caseData.value?.runtimeImageId ||
    ''
  ).trim()
})
const caseThumbnailUrl = computed(() => {
  const source = String(caseData.value?.thumbnail?.downloadPath || caseData.value?.thumbnail?.url || '').trim()
  return source ? resolvePublicResourceUrl(source) : ''
})

const projectFiles = computed(() => {
  if (!Array.isArray(caseData.value?.files)) return []
  return caseData.value.files.map(normalizeFile)
})

const explorerTree = computed(() => {
  if (!Array.isArray(caseData.value?.fileTree)) return []
  return caseData.value.fileTree.map(normalizeTreeNode)
})

const selectedFilePathSegments = computed(() => {
  if (!selectedFile.value?.path) return []
  return ['root', ...String(selectedFile.value.path).split('/').filter(Boolean)]
})

const visibleExplorerEntries = computed(() => collectVisibleExplorerEntries(explorerTree.value))

const highlightedFileLines = computed(() => {
  const lines = splitLines(fileContent.value)
  if (selectedFile.value?.previewKind !== 'code') {
    return lines.map(line => escapeHtml(line) || '&nbsp;')
  }

  const language = fileLanguage(selectedFile.value)
  return lines.map(line => {
    if (!line) return '&nbsp;'
    if (!language) return escapeHtml(line)
    try {
      return hljs.highlight(line, { language, ignoreIllegals: true }).value || '&nbsp;'
    } catch (err) {
      return escapeHtml(line)
    }
  })
})

const canCopySelectedPreview = computed(() => {
  return CONTENT_PREVIEW_KINDS.has(selectedFile.value?.previewKind) && Boolean(fileContent.value)
})

const markdownHtml = computed(() => renderMarkdown(fileContent.value))

const tablePreview = computed(() => {
  const delimiter = selectedFile.value?.extension === '.tsv' ? '\t' : ','
  return parseDelimitedText(fileContent.value, delimiter, { maxRows: 200 })
})

const jsonPreview = computed(() => parseJsonPreview(fileContent.value))

const geoJsonPreview = computed(() => buildGeoJsonPreview(fileContent.value))

function normalizeTreeNode(node) {
  const normalized = normalizeFile(node)
  return {
    ...normalized,
    children: Array.isArray(node.children) ? node.children.map(normalizeTreeNode) : []
  }
}

function isFolderExpanded(folderPath) {
  return expandedFolders.value.has(folderPath)
}

function toggleFolder(folderPath) {
  const next = new Set(expandedFolders.value)
  if (next.has(folderPath)) {
    next.delete(folderPath)
  } else {
    next.add(folderPath)
  }
  expandedFolders.value = next
}

function collectAllFolderPaths(nodes, set = new Set()) {
  nodes.forEach(node => {
    if (node.type === 'folder') {
      set.add(node.path)
      collectAllFolderPaths(node.children || [], set)
    }
  })
  return set
}

function deriveInitialExpandedFolders(nodes, selectedPath = '') {
  const next = new Set()

  nodes.forEach(node => {
    if (node.type === 'folder' && !String(node.name || '').startsWith('__')) {
      next.add(node.path)
    }
  })

  if (selectedPath) {
    const parts = String(selectedPath).split('/').filter(Boolean)
    let current = ''
    for (let index = 0; index < parts.length - 1; index += 1) {
      current = current ? `${current}/${parts[index]}` : parts[index]
      next.add(current)
    }
  }

  return next
}

function matchesSearch(node, keyword) {
  if (!keyword) return true

  const lowerName = String(node.name || '').toLowerCase()
  const lowerPath = String(node.path || '').toLowerCase()
  if (lowerName.includes(keyword) || lowerPath.includes(keyword)) return true

  return Array.isArray(node.children) && node.children.some(child => matchesSearch(child, keyword))
}

function collectVisibleExplorerEntries(nodes, depth = 0) {
  const keyword = searchQuery.value.toLowerCase()
  const revealAllMatches = Boolean(keyword)
  const entries = []

  nodes.forEach(node => {
    if (!matchesSearch(node, keyword)) return

    entries.push({ ...node, depth })

    if (node.type !== 'folder' || !node.children?.length) return
    if (revealAllMatches || isFolderExpanded(node.path)) {
      entries.push(...collectVisibleExplorerEntries(node.children, depth + 1))
    }
  })

  return entries
}

function sanitizeNotebookPreviewHtml(html) {
  return String(html || '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
}

function resizeNotebookFrame() {
  const frame = notebookFrame.value
  if (!frame) return

  try {
    const doc = frame.contentDocument || frame.contentWindow?.document
    if (!doc?.documentElement) return

    if (!doc.getElementById('opengeolab-notebook-reader-style')) {
      const style = doc.createElement('style')
      style.id = 'opengeolab-notebook-reader-style'
      style.textContent = `
        html, body {
          min-height: 0 !important;
          overflow: hidden !important;
          background: #fff !important;
        }

        body {
          margin: 0 !important;
        }

        img, svg, canvas {
          max-width: 100% !important;
          height: auto;
        }
      `
      doc.head?.appendChild(style)
    }

    const height = Math.max(
      680,
      doc.documentElement.scrollHeight,
      doc.body?.scrollHeight || 0
    )
    frame.style.height = `${height + 24}px`

    doc.querySelectorAll('img').forEach(img => {
      if (!img.dataset.opengeolabResizeBound) {
        img.dataset.opengeolabResizeBound = 'true'
        img.addEventListener('load', scheduleNotebookFrameResize, { once: true })
      }
    })
  } catch (error) {
    // Cross-document sizing can fail in unusual browser sandbox states; keep the fallback min-height.
  }
}

function scheduleNotebookFrameResize() {
  requestAnimationFrame(resizeNotebookFrame)
  window.setTimeout(resizeNotebookFrame, 250)
  window.setTimeout(resizeNotebookFrame, 900)
}

function handleTreeRowClick(entry) {
  if (entry.type === 'folder') {
    toggleFolder(entry.path)
    return
  }

  selectFile(entry)
}

function expandAllFolders() {
  expandedFolders.value = collectAllFolderPaths(explorerTree.value)
}

function collapseAllFolders() {
  expandedFolders.value = new Set()
}

function refreshExplorer() {
  loadCase()
}

function encodeCaseFilePath(filePath = '') {
  return String(filePath || '')
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

function publicCaseFileBase(filePath = '') {
  return `/api/cases/${encodeURIComponent(publicProjectId.value)}/files/${encodeCaseFilePath(filePath)}`
}

function jupyterCaseFileBase(filePath = '') {
  return `/api/jupyter/cases/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}/files/${encodeCaseFilePath(filePath)}`
}

function caseFileEndpoint(filePath = '', kind = 'content') {
  const base = isPublicCaseRoute.value ? publicCaseFileBase(filePath) : jupyterCaseFileBase(filePath)
  return `${base}/${kind}`
}

function getPendingCaseAction() {
  try {
    const raw = localStorage.getItem(pendingCaseActionKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.projectId || !parsed?.action) return null
    if (Date.now() - Number(parsed.createdAt || 0) > 15 * 60 * 1000) {
      localStorage.removeItem(pendingCaseActionKey)
      return null
    }
    return parsed
  } catch (error) {
    return null
  }
}

function clearPendingCaseAction() {
  localStorage.removeItem(pendingCaseActionKey)
}

function requestLoginForAction(action) {
  if (isPublicCaseRoute.value && publicProjectId.value && ['fork', 'run'].includes(action)) {
    localStorage.setItem(pendingCaseActionKey, JSON.stringify({
      action,
      projectId: publicProjectId.value,
      createdAt: Date.now()
    }))
  }
  notify('Please sign in first to continue.', 'warning')
  router.push('/jupyter')
}

async function continuePendingCaseAction() {
  if (!isPublicCaseRoute.value || pendingActionConsumed.value || !getToken()) return
  const pending = getPendingCaseAction()
  const queryAction = String(route.query.caseAction || '').trim()
  const action = queryAction || pending?.action || ''
  const matchesPending = pending?.projectId === publicProjectId.value
  if (!action || (!queryAction && !matchesPending)) return

  pendingActionConsumed.value = true
  clearPendingCaseAction()
  if (action === 'fork') {
    await forkProject()
  } else if (action === 'run') {
    await runProject()
  }
}

async function loadCase() {
  loading.value = true
  error.value = ''
  previewError.value = ''
  forkMessage.value = ''

  try {
    const response = await readAxios().get(
      isPublicCaseRoute.value
        ? `/api/cases/${encodeURIComponent(publicProjectId.value)}`
        : `/api/jupyter/cases/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}`
    )

    const rawCase = isPublicCaseRoute.value ? response.data : (response.data.case || {})
    caseData.value = {
      ...rawCase,
      files: Array.isArray(rawCase.files) ? rawCase.files.map(normalizeFile) : [],
      fileTree: Array.isArray(rawCase.fileTree) ? rawCase.fileTree.map(normalizeTreeNode) : []
    }

    const initialFile = pickPreferredPreviewFile(caseData.value.files, caseData.value.case?.coreNotebook || '')
    expandedFolders.value = deriveInitialExpandedFolders(caseData.value.fileTree, initialFile?.path || '')

    if (initialFile) {
      await selectFile(initialFile)
    } else {
      selectedFile.value = null
    }
    await continuePendingCaseAction()
  } catch (err) {
    caseData.value = null
    selectedFile.value = null
    error.value = err.response?.data?.error || err.message || 'Failed to load public case.'
  } finally {
    loading.value = false
  }
}

async function selectFile(file) {
  const normalized = normalizeFile(file)
  selectedFile.value = normalized
  previewError.value = ''
  fileContent.value = ''
  notebookPreviewHtml.value = ''
  imagePreviewUrl.value = ''
  directPreviewUrl.value = ''
  archivePreview.value = null

  if (!normalized.previewSupported || normalized.type === 'folder') {
    return
  }

  if (DIRECT_PREVIEW_KINDS.has(normalized.previewKind)) {
    directPreviewUrl.value = resolvePublicResourceUrl(caseFileEndpoint(normalized.path, 'preview'))
    imagePreviewUrl.value = directPreviewUrl.value
    return
  }

  loadingPreview.value = true
  const activePath = normalized.path

  try {
    if (normalized.previewKind === 'notebook') {
      const response = await readAxios().get(
        caseFileEndpoint(activePath, 'preview')
      )

      if (selectedFile.value?.path === activePath) {
        notebookPreviewHtml.value = sanitizeNotebookPreviewHtml(response.data.html)
      }
      return
    }

    if (normalized.previewKind === 'archive') {
      const response = await readAxios().get(caseFileEndpoint(activePath, 'preview'))
      if (selectedFile.value?.path === activePath) {
        archivePreview.value = response.data.archive || { entries: [], totalEntries: 0, truncated: false, error: '' }
      }
      return
    }

    if (!CONTENT_PREVIEW_KINDS.has(normalized.previewKind)) {
      previewError.value = normalized.previewReason || 'Preview is not available for this file.'
      return
    }

    const response = await readAxios().get(caseFileEndpoint(activePath, 'content'))

    if (selectedFile.value?.path === activePath) {
      fileContent.value = String(response.data.content || '')
    }
  } catch (err) {
    previewError.value = err.response?.data?.error || err.message || 'Preview failed.'
  } finally {
    if (selectedFile.value?.path === activePath) {
      loadingPreview.value = false
    }
  }
}

async function forkProject() {
  if (!caseData.value || isForking.value) return

  if (!getToken()) {
    requestLoginForAction('fork')
    return
  }

  isForking.value = true
  forkMessage.value = ''

  try {
    const response = await authAxios().post(
      isPublicCaseRoute.value
        ? `/api/jupyter/cases/${encodeURIComponent(publicProjectId.value)}/fork`
        : `/api/jupyter/fork/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}`
    )
    const forkedProject = response.data?.project
    if (forkedProject?.name) {
      router.push(buildWorkspaceProjectRoutePath(forkedProject))
      return
    }
    forkMessage.value = 'Project forked to your space.'
  } catch (err) {
    forkMessage.value = `Fork failed: ${err.response?.data?.error || err.message}`
  } finally {
    isForking.value = false
  }
}

async function runProject() {
  if (!caseData.value || isRunning.value) return

  if (!getToken()) {
    requestLoginForAction('run')
    return
  }

  const projectId = caseData.value.projectId || publicProjectId.value
  if (!projectId) {
    forkMessage.value = 'Run failed: case project id is missing.'
    return
  }

  isRunning.value = true
  forkMessage.value = ''
  try {
    const response = await authAxios().post(`/api/jupyter/cases/${encodeURIComponent(projectId)}/run`)
    if (response.data?.url) {
      window.location.assign(response.data.url)
      return
    }
    const project = response.data?.project
    if (project?.name) {
      router.push(buildWorkspaceProjectRoutePath(project))
      return
    }
    forkMessage.value = 'Case runtime started.'
  } catch (err) {
    forkMessage.value = `Run failed: ${err.response?.data?.error || err.message}`
  } finally {
    isRunning.value = false
  }
}

async function downloadSelectedFile() {
  if (!selectedFile.value || selectedFile.value.type === 'folder') return

  if (!getToken()) {
    requestLoginForAction('download')
    return
  }

  try {
    const downloadOwner = isPublicCaseRoute.value ? caseData.value.owner : owner.value
    const downloadProjectName = isPublicCaseRoute.value ? caseData.value.projectName : projectName.value
    const response = await authAxios().get(
      `/api/jupyter/cases/${encodeURIComponent(downloadOwner)}/${encodeURIComponent(downloadProjectName)}/files/${encodeCaseFilePath(selectedFile.value.path)}/download`,
      { responseType: 'blob' }
    )

    const blobUrl = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = selectedFile.value.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) {
    forkMessage.value = `Download failed: ${err.response?.data?.error || err.message}`
  }
}

async function copySelectedContent() {
  if (!fileContent.value) return

  try {
    await navigator.clipboard.writeText(fileContent.value)
    forkMessage.value = `Copied ${selectedFile.value?.name || 'current file'}`
  } catch (err) {
    forkMessage.value = 'Copy failed. Please check browser clipboard permissions.'
  }
}

function treeIconClass(file) {
  const normalized = normalizeFile(file)
  if (normalized.type === 'folder') return 'icon-folder'
  if (normalized.previewKind === 'notebook') return 'icon-notebook'
  if (normalized.previewKind === 'code') return 'icon-code'
  if (['text', 'markdown', 'html', 'pdf', 'archive'].includes(normalized.previewKind)) return 'icon-text'
  return 'icon-data'
}

function summarizeProperties(properties = {}) {
  const entries = Object.entries(properties)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 4)

  if (!entries.length) return 'No properties'
  return entries.map(([key, value]) => `${key}: ${String(value).slice(0, 48)}`).join(' · ')
}

function formatSize(bytes) {
  const numericBytes = Number(bytes || 0)
  if (!numericBytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(numericBytes) / Math.log(1024)), units.length - 1)
  const value = numericBytes / (1024 ** power)
  return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function goBack() {
  router.push(isPublicCaseRoute.value ? '/cases' : '/jupyter/cases')
}

watch(notebookPreviewHtml, async value => {
  if (!value) return
  await nextTick()
  scheduleNotebookFrameResize()
})

onMounted(() => {
  loadCase()
})
</script>

<style scoped>
.case-asset-page {
  --case-max-width: 1680px;
  --case-gutter: clamp(1rem, 2.6vw, 2.5rem);

  min-height: 100vh;
  background: #f7f7f4;
  color: #111827;
}

.case-asset-nav {
  position: fixed;
  top: 1rem;
  right: var(--case-gutter);
  left: var(--case-gutter);
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 0;
  padding: 0;
  border-bottom: none;
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

.case-asset-page.with-site-nav .case-asset-nav {
  top: 92px;
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 0.55rem;
  min-height: 36px;
  padding: 0 0.82rem;
  border: 1px solid rgba(212, 212, 212, 0.72);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.08);
  color: #111111;
  font-size: 0.94rem;
  font-weight: 650;
  backdrop-filter: blur(18px);
  cursor: pointer;
  pointer-events: auto;
}

.case-nav-actions {
  display: flex;
  align-items: center;
  align-self: center;
  justify-content: flex-end;
  gap: 0.65rem;
  pointer-events: auto;
}

.fork-btn,
.ghost-btn,
.icon-btn {
  border-radius: 7px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.fork-btn {
  min-height: 36px;
  padding: 0 0.95rem;
  border: 1px solid #111111;
  background: #111111;
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.1);
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 650;
}

.fork-btn:hover:not(:disabled) {
  border-color: #000000;
  background: #000000;
}

.fork-btn.secondary {
  border-color: rgba(212, 212, 212, 0.8);
  background: rgba(255, 255, 255, 0.88);
  color: #242424;
  backdrop-filter: blur(18px);
}

.fork-btn.secondary:hover:not(:disabled) {
  border-color: #bdbdbd;
  background: #f7f7f7;
}

.fork-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.case-asset-shell {
  min-height: calc(100vh - 64px);
}

.page-state.full {
  min-height: calc(100vh - 64px);
}

.case-overview-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(1.15rem, 2.2vw, 2.5rem);
  align-items: start;
  max-width: var(--case-max-width);
  margin: 0 auto;
  padding: clamp(1.05rem, 2.05vw, 1.85rem) var(--case-gutter);
  border-bottom: 1px solid #e5e5e5;
  background:
    linear-gradient(90deg, rgba(17, 17, 17, 0.035) 1px, transparent 1px),
    linear-gradient(180deg, rgba(17, 17, 17, 0.025) 1px, transparent 1px),
    #f7f7f4;
  background-size: 48px 48px;
}

.case-overview-strip.with-visual {
  grid-template-columns: minmax(0, 1fr) minmax(330px, 500px);
}

.case-overview-copy {
  display: grid;
  align-content: center;
  min-width: 0;
  max-width: 980px;
}

.case-hero-topline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.62rem;
}

.case-hero-topline span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 0.54rem;
  border: 1px solid #dcdcdc;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.78);
  color: #525252;
  font-size: 0.72rem;
  font-weight: 720;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.case-overview-copy h2 {
  margin: 0;
  max-width: 940px;
  color: #111111;
  font-size: clamp(1.9rem, 3.25vw, 3.45rem);
  font-weight: 720;
  letter-spacing: -0.04em;
  line-height: 1;
}

.case-overview-copy p {
  margin: 0.62rem 0 0;
  max-width: 780px;
  color: #4b5563;
  font-size: 0.96rem;
  line-height: 1.5;
}

.case-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.72rem;
}

.case-tags span {
  border: 1px solid #e2e2e2;
  border-radius: 5px;
  padding: 0.22rem 0.5rem;
  background: rgba(255, 255, 255, 0.82);
  color: #525252;
  font-size: 0.72rem;
  font-weight: 600;
}

.case-hero-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.65rem clamp(0.9rem, 1.55vw, 1.45rem);
  margin: clamp(0.78rem, 1.35vw, 1.1rem) 0 0;
}

.case-hero-metrics div {
  display: grid;
  gap: 0.16rem;
  min-width: 0;
}

.case-hero-metrics .metric-wide {
  max-width: min(100%, 340px);
}

.case-hero-metrics dt {
  color: #8a8a8a;
  font-size: 0.64rem;
  font-weight: 740;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.case-hero-metrics dd {
  margin: 0;
  overflow: hidden;
  color: #242424;
  font-size: 0.86rem;
  font-weight: 660;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-hero-aside {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: clamp(205px, 18vw, 286px);
  align-self: center;
}

.case-hero-aside::before {
  position: absolute;
  inset: 11% 7% 2%;
  border-radius: 999px;
  background:
    radial-gradient(ellipse at 50% 42%, rgba(35, 44, 54, 0.12), transparent 67%);
  content: '';
  filter: blur(18px);
  opacity: 0.8;
  pointer-events: none;
}

.case-visual-float {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 500px);
  min-height: clamp(190px, 17vw, 270px);
  isolation: isolate;
  pointer-events: none;
}

.case-visual-aura,
.case-visual-image {
  display: block;
  grid-area: 1 / 1;
  max-width: 100%;
  max-height: clamp(190px, 17vw, 270px);
  object-fit: contain;
  -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, #000 54%, rgba(0, 0, 0, 0.58) 74%, transparent 98%);
  mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, #000 54%, rgba(0, 0, 0, 0.58) 74%, transparent 98%);
}

.case-visual-aura {
  z-index: 0;
  opacity: 0.18;
  transform: scale(1.1);
  filter: blur(30px) saturate(1.08);
  mix-blend-mode: multiply;
}

.case-visual-image {
  position: relative;
  z-index: 1;
  clip-path: inset(1px);
  opacity: 0.86;
  filter: drop-shadow(0 30px 48px rgba(17, 17, 17, 0.1)) saturate(0.92) contrast(0.98);
  mix-blend-mode: multiply;
}

.asset-workspace {
  display: grid;
  grid-template-columns: minmax(250px, 300px) minmax(0, 1fr);
  gap: clamp(1rem, 2vw, 2rem);
  align-items: start;
  max-width: var(--case-max-width);
  margin: 0 auto;
  padding: clamp(0.7rem, 1.25vw, 1.35rem) var(--case-gutter) 4rem;
}

.workspace-sidebar {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  background: #ffffff;
}

.case-asset-page.with-site-nav .workspace-sidebar {
  top: 84px;
  max-height: calc(100vh - 104px);
}

.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 0.95rem 0.75rem;
  border-bottom: 1px solid #ececec;
}

.explorer-title {
  margin: 0;
  color: #737373;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.explorer-actions {
  display: flex;
  gap: 0.25rem;
}

.tool-btn,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #737373;
  font-size: 0;
  line-height: 0;
}

.tool-btn:hover,
.icon-btn:hover {
  border-color: #d4d4d4;
  background: #f7f7f7;
  color: #111111;
  box-shadow: none;
}

.tool-btn svg,
.icon-btn svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.explorer-search {
  padding: 0.85rem;
  border-bottom: 1px solid #ececec;
}

.fork-message,
.explorer-empty p {
  margin: 0;
  color: #64748b;
  font-size: 0.86rem;
  line-height: 1.5;
}

.fork-message {
  margin: 0.9rem 1rem 0;
  padding: 0.75rem 0.85rem;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fafafa;
  color: #525252;
  font-weight: 600;
}

.explorer-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.5rem 0 0.85rem;
}

.tree-row {
  --depth: 0;
  display: grid;
  grid-template-columns: calc(var(--depth) * 18px) 16px 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.42rem;
  min-height: 36px;
  width: 100%;
  padding: 0 0.82rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.tree-row:hover {
  background: #f7f7f7;
}

.tree-row.active {
  background: #eeeeee;
  box-shadow: inset 2px 0 0 #111111;
}

.tree-indent,
.tree-chevron.placeholder {
  height: 1px;
}

.tree-chevron {
  color: #737373;
  font-size: 0.9rem;
  line-height: 1;
  text-align: center;
}

.tree-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid #dedede;
  border-radius: 4px;
  background: #ffffff;
  color: #525252;
  font-size: 0.56rem;
  font-weight: 760;
  letter-spacing: 0.02em;
}

.icon-folder {
  position: relative;
  width: 22px;
  height: 18px;
  border: none;
  background: transparent;
}

.icon-notebook {
  color: #525252;
}

.icon-code {
  color: #525252;
}

.icon-text {
  color: #525252;
}

.icon-data {
  color: #525252;
}

.tree-label {
  overflow: hidden;
  color: #242424;
  font-size: 0.88rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-size {
  min-width: 52px;
  color: #8a8a8a;
  font-size: 0.72rem;
  font-weight: 600;
  text-align: right;
}

.explorer-empty {
  padding: 1rem;
}

.workspace-main {
  min-width: 0;
  padding: 0;
}

.breadcrumb-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0.15rem 0 0.85rem;
  color: #737373;
  font-size: 0.88rem;
  font-weight: 600;
}

.breadcrumb-row strong {
  color: #111111;
}

.page-state,
.info-card,
.document-panel {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  background: #fff;
  box-shadow: none;
}

.page-state,
.preview-state {
  display: grid;
  place-items: center;
  gap: 0.85rem;
  min-height: 260px;
  text-align: center;
}

.page-state p,
.preview-state p {
  margin: 0;
  color: #525252;
  font-weight: 600;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 7px;
  background: #f0f0f0;
  color: #242424;
  font-weight: 700;
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid #e5e5e5;
  border-top-color: #111111;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.info-card {
  padding: 1.2rem;
}

.sidebar-eyebrow {
  margin: 0 0 0.3rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.info-card h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.2rem;
}

.info-card p {
  max-width: 820px;
  margin: 0.6rem 0 0;
  color: #475569;
  line-height: 1.6;
}

.document-panel {
  overflow: visible;
}

.document-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.05rem;
  border-bottom: 1px solid #ececec;
  border-radius: 10px 10px 0 0;
  background: #fafafa;
}

.document-title {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.doc-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #dedede;
  border-radius: 7px;
  background: #ffffff;
  color: #525252;
  font-size: 0.68rem;
  font-weight: 820;
}

.doc-badge.notebook {
  color: #525252;
}

.doc-badge.code {
  color: #525252;
}

.doc-badge.text {
  color: #525252;
}

.doc-badge.image {
  color: #525252;
}

.doc-badge.markdown,
.doc-badge.table,
.doc-badge.json,
.doc-badge.geojson,
.doc-badge.html,
.doc-badge.pdf,
.doc-badge.archive {
  color: #525252;
}

.document-title h3 {
  margin: 0;
  overflow: hidden;
  color: #111111;
  font-size: 1rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-title p {
  margin: 0.18rem 0 0;
  color: #737373;
  font-size: 0.8rem;
  font-weight: 600;
}

.document-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.readonly-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 0.56rem;
  border: 1px solid #e1e1e1;
  border-radius: 6px;
  background: #ffffff;
  color: #525252;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.notebook-frame {
  display: block;
  width: 100%;
  min-height: 680px;
  border: none;
  border-radius: 0 0 10px 10px;
  background: #fff;
  overflow: hidden;
}

.image-preview-frame {
  display: grid;
  place-items: center;
  min-height: 420px;
  padding: 1rem;
  border-radius: 0 0 10px 10px;
  background: #fafafa;
}

.image-preview-frame img {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  background: #ffffff;
}

.markdown-document {
  max-width: 920px;
  padding: clamp(1.3rem, 2.8vw, 2.6rem);
  color: #242424;
  font-size: 0.98rem;
  line-height: 1.68;
}

.markdown-document :deep(h1),
.markdown-document :deep(h2),
.markdown-document :deep(h3),
.markdown-document :deep(h4) {
  margin: 1.45rem 0 0.6rem;
  color: #111111;
  line-height: 1.16;
}

.markdown-document :deep(h1) {
  margin-top: 0;
  font-size: 2rem;
  letter-spacing: -0.03em;
}

.markdown-document :deep(h2) {
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}

.markdown-document :deep(h3) {
  font-size: 1.12rem;
}

.markdown-document :deep(p) {
  margin: 0.7rem 0;
}

.markdown-document :deep(a) {
  color: #111111;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.markdown-document :deep(ul),
.markdown-document :deep(ol) {
  margin: 0.7rem 0;
  padding-left: 1.3rem;
}

.markdown-document :deep(blockquote) {
  margin: 1rem 0;
  padding: 0.2rem 0 0.2rem 1rem;
  border-left: 3px solid #d4d4d4;
  color: #525252;
}

.markdown-document :deep(pre),
.markdown-document :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
}

.markdown-document :deep(pre) {
  overflow: auto;
  padding: 0.9rem;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #f7f7f7;
}

.markdown-document :deep(code) {
  padding: 0.08rem 0.24rem;
  border-radius: 4px;
  background: #f0f0f0;
  font-size: 0.88em;
}

.markdown-document :deep(pre code) {
  padding: 0;
  background: transparent;
}

.preview-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid #ececec;
  background: #ffffff;
}

.preview-summary.stacked {
  display: grid;
  align-content: start;
  padding: 0;
  border: none;
  background: transparent;
}

.preview-summary span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 0.52rem;
  border: 1px solid #e1e1e1;
  border-radius: 6px;
  background: #fafafa;
  color: #525252;
  font-size: 0.72rem;
  font-weight: 650;
}

.data-table-wrap {
  overflow: auto;
  max-height: 68vh;
}

.data-table-wrap table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.data-table-wrap th,
.data-table-wrap td {
  max-width: 280px;
  padding: 0.62rem 0.75rem;
  border-bottom: 1px solid #ececec;
  color: #242424;
  text-align: left;
  vertical-align: top;
}

.data-table-wrap th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #fafafa;
  color: #525252;
  font-size: 0.72rem;
  font-weight: 760;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.data-table-wrap td {
  overflow: hidden;
  color: #404040;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-preview pre {
  overflow: auto;
  max-height: 70vh;
  margin: 0;
  padding: 1rem;
  border-radius: 0 0 10px 10px;
  background: #171717;
  color: #e5e7eb;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.84rem;
  line-height: 1.58;
}

.geojson-preview {
  padding: 1rem;
}

.geojson-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
  gap: 1rem;
  align-items: stretch;
}

.geo-map-frame {
  overflow: hidden;
  min-height: 420px;
  border: 1px solid #e5e5e5;
  border-radius: 9px;
  background: #fafafa;
}

.geo-map-frame svg {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 420px;
}

.geo-map-bg {
  fill: #fbfbfb;
}

.geo-shape.polygon {
  fill: rgba(17, 17, 17, 0.08);
  stroke: #111111;
  stroke-width: 1.4;
}

.geo-shape.line {
  fill: none;
  stroke: #111111;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.geo-shape.point {
  fill: #111111;
  stroke: #ffffff;
  stroke-width: 1.5;
}

.geojson-side {
  display: grid;
  gap: 1rem;
  align-content: start;
}

.properties-preview {
  display: grid;
  gap: 0.45rem;
}

.properties-preview h4 {
  margin: 0;
  color: #111111;
  font-size: 0.82rem;
  font-weight: 750;
}

.property-row {
  display: grid;
  gap: 0.2rem;
  padding: 0.7rem;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
}

.property-row strong {
  color: #242424;
  font-size: 0.78rem;
}

.property-row span {
  overflow: hidden;
  color: #737373;
  font-size: 0.75rem;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.structured-error {
  display: grid;
  gap: 0.3rem;
  margin: 1rem;
  padding: 1rem;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fafafa;
  color: #525252;
}

.structured-error strong {
  color: #111111;
}

.html-frame,
.pdf-frame {
  display: block;
  width: 100%;
  min-height: 72vh;
  border: none;
  border-radius: 0 0 10px 10px;
  background: #ffffff;
}

.archive-preview {
  background: #ffffff;
}

.archive-list {
  display: grid;
  max-height: 68vh;
  overflow: auto;
}

.archive-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 96px 136px;
  align-items: center;
  gap: 0.7rem;
  min-height: 38px;
  padding: 0 1rem;
  border-bottom: 1px solid #ececec;
  color: #525252;
  font-size: 0.82rem;
}

.archive-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 21px;
  border: 1px solid #e1e1e1;
  border-radius: 5px;
  color: #737373;
  font-size: 0.62rem;
  font-weight: 760;
}

.archive-name {
  overflow: hidden;
  color: #242424;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-size,
.archive-date {
  color: #8a8a8a;
  font-size: 0.74rem;
  font-weight: 600;
  text-align: right;
}

.document-body {
  overflow: visible;
}

.code-sheet {
  display: grid;
  min-height: 0;
  padding: 0;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.88rem;
  line-height: 1.55;
  border-radius: 0 0 10px 10px;
  overflow-x: auto;
}

.code-sheet.code {
  background: #171717;
  color: #e5e7eb;
}

.code-sheet.text {
  background: #fff;
  color: #242424;
}

.code-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  min-height: 24px;
}

.code-row:hover {
  background: rgba(115, 115, 115, 0.08);
}

.line-number {
  padding: 0 0.85rem;
  color: #a3a3a3;
  text-align: right;
  user-select: none;
}

.code-sheet.code .line-number {
  color: rgba(229, 231, 235, 0.38);
}

.line-content {
  overflow-x: auto;
  padding-right: 1rem;
  white-space: pre;
}

.unsupported-panel {
  min-height: 360px;
  display: grid;
  place-items: center;
}

.unsupported-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
  max-width: 520px;
  padding: 1.25rem;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.unsupported-mark {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border: 1px solid #d8dee9;
  border-radius: 7px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.86rem;
  font-weight: 900;
  letter-spacing: 0.05em;
}

.unsupported-copy h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
}

.unsupported-copy p {
  margin: 0.4rem 0 0.8rem;
  color: #64748b;
  line-height: 1.5;
}

.ghost-btn {
  min-height: 34px;
  padding: 0 0.75rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  font-weight: 800;
}

@media (max-width: 1100px) {
  .case-asset-nav {
    right: 1rem;
    left: 1rem;
  }

  .case-nav-actions {
    justify-content: flex-end;
  }

  .case-overview-strip {
    grid-template-columns: 1fr;
  }

  .case-overview-strip.with-visual {
    grid-template-columns: 1fr;
  }

  .case-hero-aside {
    justify-content: start;
    min-height: 210px;
  }

  .case-visual-float {
    width: min(100%, 480px);
    min-height: 210px;
    justify-self: start;
  }

  .asset-workspace {
    grid-template-columns: 260px minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .asset-workspace {
    grid-template-columns: 1fr;
    padding-bottom: 2.5rem;
  }

  .workspace-sidebar {
    position: relative;
    top: auto;
    max-height: none;
  }

  .explorer-tree {
    max-height: 320px;
  }

  .case-overview-strip {
    grid-template-columns: 1fr;
  }

  .case-hero-aside {
    min-height: 195px;
  }

  .case-visual-float {
    min-height: 195px;
  }

  .case-hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .case-asset-nav {
    top: auto;
    right: 1rem;
    bottom: 0.85rem;
    left: 1rem;
    gap: 0.5rem;
  }

  .case-asset-page.with-site-nav .case-asset-nav {
    top: auto;
  }

  .nav-brand {
    flex: 0 0 auto;
    min-width: 0;
    padding: 0 0.62rem;
    white-space: nowrap;
  }

  .case-nav-actions {
    flex: 0 1 auto;
    gap: 0.5rem;
  }

  .fork-btn {
    flex: 0 1 auto;
    min-width: 0;
    padding: 0 0.5rem;
    font-size: 0.76rem;
    white-space: nowrap;
  }

  .fork-btn.secondary {
    min-width: 86px;
  }

  .case-nav-actions .fork-btn:not(.secondary) {
    min-width: 118px;
  }

  .geojson-layout {
    grid-template-columns: 1fr;
  }

  .archive-row {
    grid-template-columns: 48px minmax(0, 1fr) 82px;
  }

  .archive-date {
    display: none;
  }
}

@media (max-width: 560px) {
  .case-hero-metrics {
    gap: 0.58rem 1rem;
  }

  .case-hero-metrics .metric-wide {
    max-width: 100%;
  }

  .case-overview-copy h2 {
    font-size: clamp(1.78rem, 11vw, 2.42rem);
  }

  .case-visual-float {
    min-height: 178px;
  }

  .case-visual-aura,
  .case-visual-image {
    max-height: 178px;
  }
}
</style>
