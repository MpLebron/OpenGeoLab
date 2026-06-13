<template>
  <div class="case-asset-page">
    <header class="case-asset-nav">
      <button class="nav-brand" type="button" @click="goBack">
        <span aria-hidden="true">&larr;</span>
        <span>Case Library</span>
      </button>

      <div v-if="caseData" class="case-nav-heading">
        <div class="case-title-row">
          <h1>{{ caseTitle }}</h1>
          <span class="case-public-badge">{{ caseData.isCase ? 'Case library' : 'Shared workspace' }}</span>
        </div>
        <p class="case-nav-meta">
          <span>@{{ caseData.owner }}</span>
          <span>{{ formatDateTime(caseData.modifiedAt) }}</span>
          <span>{{ caseData.fileCount }} files</span>
          <span>{{ formatSize(caseData.sizeBytes) }}</span>
          <span v-if="caseRuntimeImage">Based on {{ caseRuntimeImage }}</span>
        </p>
      </div>

      <div v-if="caseData" class="case-nav-actions">
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
        <section class="case-overview-strip">
          <div class="case-mark" aria-hidden="true">
            <span>{{ caseData.isCase ? 'CASE' : 'PUBLIC' }}</span>
            <strong>{{ caseData.isCase ? 'CASE' : 'WS' }}</strong>
          </div>
          <div class="case-overview-copy">
            <p class="case-eyebrow">{{ caseData.isCase ? 'Research case' : 'Shared Jupyter workspace' }}</p>
            <h2>{{ caseTitle }}</h2>
            <p>{{ caseSummary }}</p>
            <div v-if="caseTags.length" class="case-tags">
              <span v-for="tag in caseTags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <aside class="case-facts">
            <div>
              <span>Runtime image</span>
              <strong>{{ caseRuntimeImage || caseRuntime }}</strong>
            </div>
            <div>
              <span>Entry notebook</span>
              <strong>{{ entryNotebookLabel }}</strong>
            </div>
          </aside>
        </section>

        <section class="asset-workspace">
          <aside class="workspace-sidebar">
            <div class="explorer-header">
              <p class="explorer-title">EXPLORER</p>
              <div class="explorer-actions">
                <button class="tool-btn" type="button" title="Expand folders" aria-label="Expand folders" @click="expandAllFolders">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <button class="tool-btn" type="button" title="Collapse folders" aria-label="Collapse folders" @click="collapseAllFolders">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <button class="tool-btn" type="button" title="Refresh" aria-label="Refresh explorer" @click="refreshExplorer">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 11a8.1 8.1 0 0 0-14.2-4.9L4 8" />
                    <path d="M4 4v4h4" />
                    <path d="M4 13a8.1 8.1 0 0 0 14.2 4.9L20 16" />
                    <path d="M20 20v-4h-4" />
                  </svg>
                </button>
              </div>
            </div>

            <label class="explorer-search">
              <span class="search-icon">⌕</span>
              <input v-model.trim="searchQuery" type="text" placeholder="Search files..." />
            </label>

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
                <span v-if="entry.type === 'folder'" class="tree-chevron">{{ isFolderExpanded(entry.path) ? '⌄' : '›' }}</span>
                <span v-else class="tree-chevron placeholder"></span>
                <span class="tree-icon" :class="treeIconClass(entry)">
                  <span v-if="entry.type === 'folder'" class="folder-shape" aria-hidden="true"></span>
                  <span v-else>{{ treeBadge(entry) }}</span>
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
                  <span class="doc-badge notebook">NB</span>
                  <div>
                    <h3>{{ selectedFile.name }}</h3>
                    <p>{{ fileSubtitle(selectedFile, formatSize) }}</p>
                  </div>
                </div>
                <div class="document-actions">
                  <span class="readonly-badge">Preview</span>
                  <button class="icon-btn" type="button" title="Download file" aria-label="Download file" @click="downloadSelectedFile">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4v11" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 20h14" />
                    </svg>
                  </button>
                </div>
              </div>

              <iframe
                v-if="notebookPreviewHtml"
                class="notebook-frame"
                :srcdoc="notebookPreviewHtml"
                sandbox="allow-scripts allow-same-origin"
                title="Notebook preview"
              ></iframe>
            </section>

            <section v-else-if="selectedFile.previewKind === 'code' || selectedFile.previewKind === 'text'" class="document-panel">
              <div class="document-head">
                <div class="document-title">
                  <span class="doc-badge" :class="selectedFile.previewKind">{{ fileBadge(selectedFile) }}</span>
                  <div>
                    <h3>{{ selectedFile.name }}</h3>
                    <p>{{ fileSubtitle(selectedFile, formatSize) }}</p>
                  </div>
                </div>
                <div class="document-actions">
                  <span class="readonly-badge">Preview</span>
                  <button class="icon-btn" type="button" title="Copy content" aria-label="Copy content" @click="copySelectedContent">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="8" y="8" width="10" height="10" rx="1" />
                      <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <button class="icon-btn" type="button" title="Download file" aria-label="Download file" @click="downloadSelectedFile">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4v11" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 20h14" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="document-body" :class="selectedFile.previewKind">
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
                <div class="unsupported-mark">{{ selectedFile.previewKind === 'folder' ? 'DIR' : 'NA' }}</div>
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
import { computed, onMounted, ref } from 'vue'
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
  fileBadge,
  fileLanguage,
  fileSubtitle,
  normalizeFile,
  pickPreferredPreviewFile,
  splitLines,
  treeBadge
} from '../utils/filePreview.js'
import { buildWorkspaceProjectRoutePath } from '../utils/workspaceProjectDisplay.js'
import { notify } from '../utils/systemFeedback.js'

hljs.registerLanguage('python', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('bash', bash)

const route = useRoute()
const router = useRouter()

const owner = computed(() => route.params.owner)
const projectName = computed(() => route.params.projectName)

const loading = ref(true)
const error = ref('')
const caseData = ref(null)
const selectedFile = ref(null)
const loadingPreview = ref(false)
const previewError = ref('')
const fileContent = ref('')
const notebookPreviewHtml = ref('')
const searchQuery = ref('')
const expandedFolders = ref(new Set())
const isForking = ref(false)
const forkMessage = ref('')

const getToken = () => localStorage.getItem('jupyter_token')
const authAxios = () => {
  const token = getToken()
  return axios.create({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const caseTitle = computed(() => {
  return caseData.value?.case?.title || caseData.value?.title || caseData.value?.caseTitle || caseData.value?.projectName || 'Untitled case'
})

const caseSummary = computed(() => {
  return caseData.value?.case?.summary || caseData.value?.description || 'Public read-only Jupyter workspace shared through OpenGeoLab Case Library.'
})

const caseTags = computed(() => Array.isArray(caseData.value?.case?.tags) ? caseData.value.case.tags.filter(Boolean) : [])
const caseRuntime = computed(() => caseData.value?.case?.environment || 'Default Jupyter environment')
const caseRuntimeImage = computed(() => {
  return String(
    caseData.value?.runtime?.imageName ||
    caseData.value?.runtime?.imageId ||
    caseData.value?.runtimeImageId ||
    ''
  ).trim()
})
const entryNotebook = computed(() => caseData.value?.case?.coreNotebook || '')

const projectFiles = computed(() => {
  if (!Array.isArray(caseData.value?.files)) return []
  return caseData.value.files.map(normalizeFile)
})

const entryNotebookLabel = computed(() => {
  if (entryNotebook.value) return entryNotebook.value

  const mainNotebook = projectFiles.value.find(file => file.previewKind === 'notebook' && file.name?.toLowerCase() === 'main.ipynb')
  if (mainNotebook) return mainNotebook.path || mainNotebook.name

  const firstNotebook = projectFiles.value.find(file => file.previewKind === 'notebook')
  return firstNotebook?.path || firstNotebook?.name || 'Auto selected'
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

async function loadCase() {
  loading.value = true
  error.value = ''
  previewError.value = ''
  forkMessage.value = ''

  try {
    const response = await authAxios().get(
      `/api/jupyter/cases/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}`
    )

    const rawCase = response.data.case || {}
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

  if (!normalized.previewSupported || normalized.type === 'folder') {
    return
  }

  loadingPreview.value = true
  const activePath = normalized.path

  try {
    if (normalized.previewKind === 'notebook') {
      const response = await authAxios().get(
        `/api/jupyter/cases/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}/files/${encodeURIComponent(activePath)}/preview`
      )

      if (selectedFile.value?.path === activePath) {
        notebookPreviewHtml.value = sanitizeNotebookPreviewHtml(response.data.html)
      }
      return
    }

    const response = await authAxios().get(
      `/api/jupyter/cases/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}/files/${encodeURIComponent(activePath)}/content`
    )

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
    notify('Please sign in first to fork this case.', 'warning')
    router.push('/jupyter')
    return
  }

  isForking.value = true
  forkMessage.value = ''

  try {
    const response = await authAxios().post(
      `/api/jupyter/fork/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}`
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

async function downloadSelectedFile() {
  if (!selectedFile.value || selectedFile.value.type === 'folder') return

  try {
    const response = await authAxios().get(
      `/api/jupyter/cases/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}/files/${encodeURIComponent(selectedFile.value.path)}/download`,
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
  if (normalized.previewKind === 'text') return 'icon-text'
  return 'icon-data'
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
  router.push('/jupyter/cases')
}

onMounted(() => {
  loadCase()
})
</script>

<style scoped>
.case-asset-page {
  min-height: 100vh;
  background: #f6f8fc;
  color: #0f172a;
}

.case-asset-nav {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  min-height: 72px;
  padding: 0 1.4rem;
  background: #162033;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 1rem;
  font-weight: 850;
  cursor: pointer;
}

.case-nav-heading {
  min-width: 0;
}

.case-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.case-title-row h1 {
  margin: 0;
  overflow: hidden;
  color: #fff;
  font-size: 1.12rem;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-public-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 0.48rem;
  border-radius: 3px;
  font-size: 0.68rem;
  font-weight: 760;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.case-public-badge {
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.84);
}

.case-nav-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin: 0.34rem 0 0;
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.82rem;
  font-weight: 650;
}

.case-nav-actions {
  display: flex;
  justify-content: flex-end;
}

.fork-btn,
.ghost-btn,
.icon-btn {
  border-radius: 4px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.fork-btn {
  min-height: 38px;
  padding: 0 1rem;
  border: 1px solid rgba(248, 250, 252, 0.88);
  background: #f8fafc;
  color: #0f172a;
  font-size: 0.86rem;
  font-weight: 820;
}

.fork-btn:hover:not(:disabled) {
  border-color: #ffffff;
  background: #ffffff;
}

.fork-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.case-asset-shell {
  min-height: calc(100vh - 72px);
}

.page-state.full {
  min-height: calc(100vh - 72px);
}

.case-overview-strip {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) minmax(280px, auto);
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.4rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.72);
  background: #fff;
}

.case-mark {
  display: grid;
  align-content: center;
  gap: 0.24rem;
  width: 56px;
  min-height: 56px;
  padding: 0.5rem;
  border: 1px solid #d5dbe7;
  border-radius: 4px;
  background: #ffffff;
  text-align: center;
}

.case-mark span {
  color: #7b8494;
  font-size: 0.56rem;
  font-weight: 760;
  letter-spacing: 0.06em;
}

.case-mark strong {
  color: #0f172a;
  font-size: 0.86rem;
  font-weight: 850;
}

.case-overview-copy {
  min-width: 0;
}

.case-eyebrow {
  margin: 0 0 0.25rem;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 820;
  letter-spacing: 0.03em;
}

.case-overview-copy h2 {
  margin: 0;
  color: #061f40;
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.case-overview-copy p {
  display: -webkit-box;
  margin: 0.35rem 0 0;
  max-width: 900px;
  overflow: hidden;
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.case-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.34rem;
  margin-top: 0.55rem;
}

.case-tags span {
  border: 1px solid #cfd6e3;
  border-radius: 3px;
  padding: 0.16rem 0.45rem;
  background: #ffffff;
  color: #344054;
  font-size: 0.68rem;
  font-weight: 720;
}

.case-facts {
  display: grid;
  gap: 0.6rem;
  min-width: 280px;
}

.case-facts div {
  display: grid;
  gap: 0.18rem;
  padding-left: 0.9rem;
  border-left: 1px solid #dbe3ef;
}

.case-facts span {
  color: #7c8aa2;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.case-facts strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 0.86rem;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-workspace {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: calc(100vh - 193px);
}

.workspace-sidebar {
  border-right: 1px solid rgba(148, 163, 184, 0.26);
  background: #f8fbff;
}

.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.2rem 0.85rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.72);
}

.explorer-title {
  margin: 0;
  color: #4b5563;
  font-size: 0.76rem;
  font-weight: 950;
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
  border-radius: 3px;
  background: transparent;
  color: #475569;
  font-size: 0;
  line-height: 0;
}

.tool-btn:hover,
.icon-btn:hover {
  border-color: #cfd6e3;
  background: #eef2f6;
  color: #0f172a;
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
  position: relative;
  display: block;
  padding: 0.95rem 1rem 0.9rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.72);
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 1.65rem;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 0.95rem;
}

.explorer-search input {
  width: 100%;
  height: 38px;
  padding: 0 0.95rem 0 2.2rem;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 4px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
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
  border: 1px solid rgba(93, 215, 206, 0.28);
  border-radius: 4px;
  background: rgba(118, 228, 220, 0.12);
  color: #0f766e;
  font-weight: 750;
}

.explorer-tree {
  max-height: calc(100vh - 300px);
  overflow: auto;
  padding: 0.6rem 0 1rem;
}

.tree-row {
  --depth: 0;
  display: grid;
  grid-template-columns: calc(var(--depth) * 18px) 16px 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45rem;
  min-height: 40px;
  width: 100%;
  padding: 0 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.18s ease;
}

.tree-row:hover {
  background: rgba(226, 232, 240, 0.55);
}

.tree-row.active {
  background: #e8eef6;
  box-shadow: inset 2px 0 0 #475569;
}

.tree-indent,
.tree-chevron.placeholder {
  height: 1px;
}

.tree-chevron {
  color: #475569;
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
  border: 1px solid #d6dce7;
  border-radius: 3px;
  background: #ffffff;
  color: #475569;
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

.folder-shape {
  position: relative;
  display: block;
  width: 18px;
  height: 12px;
  border: 1.6px solid #667085;
  border-radius: 2px;
}

.folder-shape::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 1px;
  width: 8px;
  height: 4px;
  border: 1.6px solid #667085;
  border-bottom: none;
  border-radius: 2px 2px 0 0;
  background: #f8fbff;
}

.icon-notebook {
  color: #9a3412;
}

.icon-code {
  color: #344054;
}

.icon-text {
  color: #475569;
}

.icon-data {
  color: #0f766e;
}

.tree-label {
  overflow: hidden;
  color: #1f2937;
  font-size: 0.92rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-size {
  min-width: 52px;
  color: #6b7280;
  font-size: 0.74rem;
  font-weight: 750;
  text-align: right;
}

.explorer-empty {
  padding: 1rem;
}

.workspace-main {
  min-width: 0;
  padding: 1.35rem 1.55rem 1.7rem;
}

.breadcrumb-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1rem;
  color: #64748b;
  font-size: 0.92rem;
  font-weight: 750;
}

.breadcrumb-row strong {
  color: #1e293b;
}

.page-state,
.info-card,
.document-panel {
  border: 1px solid rgba(203, 213, 225, 0.62);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
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
  color: #475569;
  font-weight: 700;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 4px;
  background: #eef2f7;
  color: #334155;
  font-weight: 900;
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid #d7dce5;
  border-top-color: #0f766e;
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
  overflow: hidden;
}

.document-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.76);
  background: #f7f9fd;
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
  border: 1px solid #d8dee9;
  border-radius: 4px;
  background: #ffffff;
  color: #344054;
  font-size: 0.68rem;
  font-weight: 820;
}

.doc-badge.notebook {
  color: #9a3412;
}

.doc-badge.code {
  color: #344054;
}

.doc-badge.text {
  color: #475569;
}

.document-title h3 {
  margin: 0;
  overflow: hidden;
  color: #111827;
  font-size: 1rem;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.document-title p {
  margin: 0.18rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
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
  border: 1px solid #ccd6e6;
  border-radius: 3px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 760;
  letter-spacing: 0.02em;
}

.notebook-frame {
  display: block;
  width: 100%;
  min-height: calc(100vh - 335px);
  border: none;
  background: #fff;
}

.document-body {
  max-height: calc(100vh - 335px);
  overflow: auto;
}

.code-sheet {
  display: grid;
  min-height: calc(100vh - 335px);
  padding: 0;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 0.88rem;
  line-height: 1.55;
}

.code-sheet.code {
  background: #213247;
  color: #dbeafe;
}

.code-sheet.text {
  background: #fff;
  color: #334155;
}

.code-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  min-height: 24px;
}

.code-row:hover {
  background: rgba(148, 163, 184, 0.12);
}

.line-number {
  padding: 0 0.85rem;
  color: #94a3b8;
  text-align: right;
  user-select: none;
}

.code-sheet.code .line-number {
  color: rgba(203, 213, 225, 0.38);
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
    grid-template-columns: 1fr;
    align-items: stretch;
    padding: 0.9rem 1rem;
  }

  .case-nav-actions {
    justify-content: flex-start;
  }

  .case-overview-strip {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .case-facts {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-workspace {
    grid-template-columns: 280px minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .asset-workspace {
    grid-template-columns: 1fr;
  }

  .workspace-sidebar {
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.26);
  }

  .explorer-tree {
    max-height: 320px;
  }

  .case-overview-strip {
    grid-template-columns: 1fr;
  }

  .case-mark {
    display: none;
  }

  .case-facts {
    min-width: 0;
    grid-template-columns: 1fr;
  }
}
</style>
