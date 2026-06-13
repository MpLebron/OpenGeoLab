<template>
  <div class="shared-preview-page">
    <header class="workspace-nav">
      <button class="nav-brand" type="button" @click="goBack">
        <span aria-hidden="true">&larr;</span>
        <span>OpenGeoLab</span>
      </button>

        <div v-if="project" class="workspace-heading">
          <div class="workspace-title-row">
            <h1>{{ project.name }}</h1>
            <span class="workspace-badge">PUBLIC WORKSPACE</span>
          </div>
        <p class="workspace-meta">
          <span>{{ owner }}</span>
          <span>{{ formatDateTime(project.modifiedAt) }}</span>
        </p>
      </div>

      <div class="workspace-actions">
        <button class="fork-btn" type="button" @click="forkProject" :disabled="isForking">
          {{ isForking ? 'Fork 中...' : 'Fork 到我的空间' }}
        </button>
      </div>
    </header>

    <main class="workspace-shell">
      <div v-if="loading" class="page-state">
        <div class="spinner"></div>
        <p>正在加载共享项目...</p>
      </div>

      <div v-else-if="error" class="page-state error">
        <div class="state-icon">!</div>
        <p>{{ error }}</p>
        <button type="button" class="ghost-btn" @click="loadProject">重试</button>
      </div>

      <template v-else-if="project">
        <aside class="workspace-sidebar">
          <div class="explorer-header">
            <p class="explorer-title">EXPLORER</p>
            <div class="explorer-actions">
              <button class="tool-btn" type="button" title="Expand all folders" @click="expandAllFolders">+</button>
              <button class="tool-btn" type="button" title="Collapse all folders" @click="collapseAllFolders">−</button>
              <button class="tool-btn" type="button" title="Refresh explorer" @click="refreshExplorer">↻</button>
            </div>
          </div>

          <label class="explorer-search">
            <span class="search-icon">⌕</span>
            <input v-model.trim="searchQuery" type="text" placeholder="Search files..." />
          </label>

          <p v-if="forkMessage" class="fork-message">{{ forkMessage }}</p>

          <div v-if="visibleExplorerEntries.length" class="explorer-tree" role="tree" aria-label="Project explorer">
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
            <p>{{ searchQuery ? 'No files match the current search.' : 'This workspace has no visible artifacts.' }}</p>
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
              <strong>{{ project.name }}</strong>
            </template>
          </div>

          <section v-if="!selectedFile" class="info-panel">
            <div class="info-card">
              <div class="info-card-head">
                <div>
                  <p class="sidebar-eyebrow">Workspace overview</p>
                  <h3>{{ project.name }}</h3>
                </div>
              </div>

              <div class="overview-grid">
                <div class="overview-block">
                  <span class="overview-label">Description</span>
                  <p>{{ projectDescription }}</p>
                </div>
                <div class="overview-block">
                  <span class="overview-label">Artifacts</span>
                  <p>{{ artifactCount }} files · {{ folderCount }} folders</p>
                </div>
                <div class="overview-block">
                  <span class="overview-label">Preview policy</span>
                  <p>Notebook 使用 Jupyter Lab 模板进行只读渲染；脚本与文本文档提供结构化预览；暂不支持在线预览的文件会给出明确提示。</p>
                </div>
              </div>
            </div>
          </section>

          <template v-else>
            <div v-if="loadingPreview" class="page-state preview-state">
              <div class="spinner"></div>
              <p>正在准备预览内容...</p>
            </div>

            <div v-else-if="previewError" class="page-state error preview-state">
              <div class="state-icon">!</div>
              <p>{{ previewError }}</p>
            </div>

            <section v-else-if="selectedFile.previewKind === 'notebook'" class="document-panel notebook-panel">
              <div class="document-head">
                <div class="document-title">
                  <span class="doc-badge notebook">NB</span>
                  <div>
                    <h3>{{ selectedFile.name }}</h3>
                    <p>{{ fileSubtitle(selectedFile) }}</p>
                  </div>
                </div>

                <div class="document-actions">
                  <span class="readonly-badge">READ ONLY</span>
                  <button class="icon-btn" type="button" @click="downloadSelectedFile" title="下载文件">↓</button>
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
                    <p>{{ fileSubtitle(selectedFile) }}</p>
                  </div>
                </div>

                <div class="document-actions">
                  <span class="readonly-badge">READ ONLY</span>
                  <button class="icon-btn" type="button" @click="copySelectedContent" title="复制内容">⧉</button>
                  <button class="icon-btn" type="button" @click="downloadSelectedFile" title="下载文件">↓</button>
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
                  <div class="unsupported-actions">
                    <button v-if="selectedFile.type !== 'folder'" class="ghost-btn" type="button" @click="downloadSelectedFile">下载文件</button>
                    <button class="ghost-btn" type="button" @click="forkProject" :disabled="isForking">Fork 后查看</button>
                  </div>
                </div>
              </div>
            </section>
          </template>
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
const project = ref(null)
const selectedFile = ref(null)
const loadingPreview = ref(false)
const previewError = ref('')
const fileContent = ref('')
const notebookPreviewHtml = ref('')
const searchQuery = ref('')
const expandedFolders = ref(new Set())
const isForking = ref(false)
const forkMessage = ref('')

const NOTEBOOK_EXTENSIONS = new Set(['.ipynb'])
const CODE_EXTENSIONS = new Set(['.py', '.js', '.ts', '.jsx', '.tsx', '.sh', '.bash', '.zsh', '.r', '.sql'])
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.json', '.geojson', '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.log', '.csv', '.tsv'])

const getToken = () => localStorage.getItem('jupyter_token')
const authAxios = () => {
  const token = getToken()
  return axios.create({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const projectFiles = computed(() => {
  if (!Array.isArray(project.value?.files)) {
    return []
  }
  return project.value.files.map(normalizeFile)
})

const explorerTree = computed(() => {
  if (!Array.isArray(project.value?.fileTree)) {
    return []
  }
  return project.value.fileTree.map(normalizeTreeNode)
})

const artifactCount = computed(() => projectFiles.value.filter(file => file.type === 'file').length)
const folderCount = computed(() => projectFiles.value.filter(file => file.type === 'folder').length)
const projectDescription = computed(() => {
  const description = String(project.value?.description || '').trim()
  return description || '该共享项目没有单独填写描述，当前视图聚焦于文件组织、Notebook 复现实验和数据制品浏览。'
})

const selectedFilePathSegments = computed(() => {
  if (!selectedFile.value?.path) {
    return []
  }
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
    if (!line) {
      return '&nbsp;'
    }
    if (!language) {
      return escapeHtml(line)
    }
    try {
      return hljs.highlight(line, { language, ignoreIllegals: true }).value || '&nbsp;'
    } catch (err) {
      return escapeHtml(line)
    }
  })
})

function getExtension(name) {
  const match = String(name || '').toLowerCase().match(/(\.[^.\/]+)$/)
  return match ? match[1] : ''
}

function normalizeFile(file) {
  const extension = file.extension || getExtension(file.name)
  const previewKind = file.previewKind || inferPreviewKind(file, extension)
  const previewSupported = typeof file.previewSupported === 'boolean'
    ? file.previewSupported
    : previewKind === 'code' || previewKind === 'text' || previewKind === 'notebook'

  return {
    ...file,
    path: file.path || file.name,
    extension,
    previewKind,
    previewSupported,
    previewReason: file.previewReason || inferPreviewReason(file, previewKind, extension)
  }
}

function normalizeTreeNode(node) {
  const normalized = normalizeFile(node)
  return {
    ...normalized,
    children: Array.isArray(node.children) ? node.children.map(normalizeTreeNode) : []
  }
}

function inferPreviewKind(file, extension) {
  if (file.type === 'folder') return 'folder'
  if (NOTEBOOK_EXTENSIONS.has(extension)) return 'notebook'
  if (CODE_EXTENSIONS.has(extension)) return 'code'
  if (TEXT_EXTENSIONS.has(extension)) return 'text'
  return 'unsupported'
}

function inferPreviewReason(file, previewKind, extension) {
  if (file.type === 'folder') return '文件夹暂不支持直接预览'
  if (!extension) return '缺少可识别的文件后缀，暂不支持在线预览'
  if (previewKind === 'unsupported') return '该类文件暂不支持在线预览'
  return ''
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
    if (node.type === 'folder' && !node.name.startsWith('__')) {
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
  if (!keyword) {
    return true
  }

  const lowerName = String(node.name || '').toLowerCase()
  const lowerPath = String(node.path || '').toLowerCase()
  if (lowerName.includes(keyword) || lowerPath.includes(keyword)) {
    return true
  }

  return Array.isArray(node.children) && node.children.some(child => matchesSearch(child, keyword))
}

function collectVisibleExplorerEntries(nodes, depth = 0) {
  const keyword = searchQuery.value.toLowerCase()
  const revealAllMatches = Boolean(keyword)
  const entries = []

  nodes.forEach(node => {
    if (!matchesSearch(node, keyword)) {
      return
    }

    entries.push({ ...node, depth })

    if (node.type !== 'folder' || !node.children?.length) {
      return
    }

    const expanded = revealAllMatches || isFolderExpanded(node.path)
    if (expanded) {
      entries.push(...collectVisibleExplorerEntries(node.children, depth + 1))
    }
  })

  return entries
}

function pickInitialFile(files) {
  const previewableFiles = files.filter(file => file.type === 'file' && file.previewSupported)
  if (!previewableFiles.length) {
    return files.find(file => file.type === 'file') || null
  }

  const priority = {
    notebook: 0,
    code: 1,
    text: 2,
    unsupported: 3
  }

  return [...previewableFiles].sort((left, right) => {
    const leftPriority = priority[left.previewKind] ?? 99
    const rightPriority = priority[right.previewKind] ?? 99
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority
    }

    const leftDepth = String(left.path).split('/').length
    const rightDepth = String(right.path).split('/').length
    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth
    }

    return String(left.name).localeCompare(String(right.name), 'en', { sensitivity: 'base', numeric: true })
  })[0]
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
  loadProject()
}

async function loadProject() {
  loading.value = true
  error.value = ''
  previewError.value = ''
  forkMessage.value = ''

  try {
    const response = await authAxios().get(
      `/api/jupyter/shared-projects/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}`
    )

    const rawProject = response.data.project || {}
    project.value = {
      ...rawProject,
      files: Array.isArray(rawProject.files) ? rawProject.files.map(normalizeFile) : [],
      fileTree: Array.isArray(rawProject.fileTree) ? rawProject.fileTree.map(normalizeTreeNode) : []
    }

    const initialFile = pickInitialFile(project.value.files)

    expandedFolders.value = deriveInitialExpandedFolders(project.value.fileTree, initialFile?.path || '')

    if (initialFile) {
      await selectFile(initialFile)
    } else {
      selectedFile.value = null
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message || '加载共享项目失败'
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
        `/api/jupyter/shared-projects/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}/files/${encodeURIComponent(activePath)}/preview`
      )

      if (selectedFile.value?.path === activePath) {
        notebookPreviewHtml.value = String(response.data.html || '')
      }
      return
    }

    const response = await authAxios().get(
      `/api/jupyter/shared-projects/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}/files/${encodeURIComponent(activePath)}/content`
    )

    if (selectedFile.value?.path === activePath) {
      fileContent.value = String(response.data.content || '')
    }
  } catch (err) {
    previewError.value = err.response?.data?.error || err.message || '预览加载失败'
  } finally {
    if (selectedFile.value?.path === activePath) {
      loadingPreview.value = false
    }
  }
}

async function forkProject() {
  isForking.value = true
  forkMessage.value = ''

  try {
    const response = await authAxios().post(
      `/api/jupyter/fork/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}`
    )
    const forkedName = response.data?.project?.name
    forkMessage.value = forkedName
      ? `已复制到你的空间：${forkedName}`
      : '项目已成功复制到你的空间。'
  } catch (err) {
    forkMessage.value = `Fork 失败：${err.response?.data?.error || err.message}`
  } finally {
    isForking.value = false
  }
}

async function downloadSelectedFile() {
  if (!selectedFile.value) {
    return
  }

  try {
    const response = await authAxios().get(
      `/api/jupyter/shared-projects/${encodeURIComponent(owner.value)}/${encodeURIComponent(projectName.value)}/files/${encodeURIComponent(selectedFile.value.path)}/download`,
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
    forkMessage.value = `下载失败：${err.response?.data?.error || err.message}`
  }
}

async function copySelectedContent() {
  if (!fileContent.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(fileContent.value)
    forkMessage.value = `已复制 ${selectedFile.value?.name || '当前文件'} 的文本内容`
  } catch (err) {
    forkMessage.value = '复制失败，请检查浏览器剪贴板权限'
  }
}

function fileBadge(file) {
  const normalized = normalizeFile(file)
  if (normalized.previewKind === 'notebook') return 'NB'
  if (normalized.previewKind === 'code') return normalized.extension.replace('.', '').toUpperCase().slice(0, 4)
  if (normalized.previewKind === 'text') return normalized.extension.replace('.', '').toUpperCase().slice(0, 4) || 'TXT'
  if (normalized.previewKind === 'folder') return 'DIR'
  return normalized.extension ? normalized.extension.replace('.', '').toUpperCase().slice(0, 4) : 'NA'
}

function treeBadge(file) {
  const normalized = normalizeFile(file)
  if (normalized.previewKind === 'notebook') return 'NB'
  if (normalized.previewKind === 'code') return normalized.extension === '.py' ? 'PY' : '</>'
  if (normalized.previewKind === 'text') return 'TXT'
  if (normalized.previewKind === 'unsupported') return normalized.extension ? normalized.extension.replace('.', '').slice(0, 3).toUpperCase() : 'NA'
  return ''
}

function treeIconClass(file) {
  const normalized = normalizeFile(file)
  if (normalized.type === 'folder') return 'icon-folder'
  if (normalized.previewKind === 'notebook') return 'icon-notebook'
  if (normalized.previewKind === 'code') return 'icon-code'
  if (normalized.previewKind === 'text') return 'icon-text'
  return 'icon-data'
}

function fileSubtitle(file) {
  const sizeLabel = formatSize(file.size)
  if (file.previewKind === 'notebook') return `Jupyter Notebook • ${sizeLabel}`
  if (file.previewKind === 'code') return `${languageLabel(file)} • ${sizeLabel}`
  if (file.previewKind === 'text') return `${textLabel(file)} • ${sizeLabel}`
  return sizeLabel
}

function languageLabel(file) {
  const labels = {
    '.py': 'Python Script',
    '.js': 'JavaScript File',
    '.ts': 'TypeScript File',
    '.sh': 'Shell Script',
    '.r': 'R Script',
    '.sql': 'SQL Script'
  }
  return labels[file.extension] || 'Code File'
}

function textLabel(file) {
  if (file.extension === '.txt') return 'Plain Text Document'
  if (file.extension === '.md') return 'Markdown Document'
  if (file.extension === '.json') return 'JSON Document'
  return 'Text Document'
}

function fileLanguage(file) {
  const map = {
    '.py': 'python',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.xml': 'xml',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash'
  }
  return map[file.extension] || ''
}

function splitLines(value) {
  return String(value || '').replace(/\r\n/g, '\n').split('\n')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** power)
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
  router.push('/jupyter')
}

onMounted(() => {
  loadProject()
})
</script>

<style scoped>
.shared-preview-page {
  min-height: 100vh;
  background: #f7f9fc;
  color: #0f172a;
}

.workspace-nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  min-height: 72px;
  padding: 0 1.5rem;
  background: #1b2336;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  border: none;
  background: transparent;
  color: #ffffff;
  font-size: 1.02rem;
  font-weight: 800;
  cursor: pointer;
}

.workspace-heading {
  min-width: 0;
}

.workspace-title-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.workspace-title-row h1 {
  margin: 0;
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 800;
}

.workspace-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 0.55rem;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.workspace-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0.36rem 0 0;
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.84rem;
  font-weight: 600;
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
  min-height: 42px;
  padding: 0 1.15rem;
  border: 1px solid #0f172a;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 900;
}

.fork-btn:hover:not(:disabled),
.ghost-btn:hover,
.icon-btn:hover {
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.fork-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.workspace-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: calc(100vh - 72px);
}

.workspace-sidebar {
  border-right: 1px solid rgba(148, 163, 184, 0.26);
  background: #f8fbff;
  padding: 0;
}

.sidebar-eyebrow {
  margin: 0 0 0.3rem;
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.2rem 0.85rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.72);
}

.explorer-title {
  margin: 0;
  color: #4b5563;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.explorer-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.tool-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.tool-btn:hover {
  background: rgba(226, 232, 240, 0.8);
  color: #0f172a;
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
  height: 44px;
  padding: 0 0.95rem 0 2.2rem;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 8px;
  background: #eef4ff;
  color: #0f172a;
  font: inherit;
}

.explorer-search input::placeholder {
  color: #94a3b8;
}

.fork-message,
.explorer-empty p {
  margin: 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.5;
}

.fork-message {
  margin: 0.9rem 1rem 0;
  padding: 0.8rem 0.9rem;
  border: 1px solid rgba(93, 215, 206, 0.28);
  border-radius: 8px;
  background: rgba(118, 228, 220, 0.12);
  color: #0f766e;
  font-weight: 700;
}

.explorer-tree {
  max-height: calc(100vh - 210px);
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
  background: #dce9ff;
  box-shadow: inset 3px 0 0 #0f766e;
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
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.icon-folder {
  position: relative;
  width: 22px;
  height: 18px;
  background: transparent;
}

.folder-shape {
  position: relative;
  display: block;
  width: 18px;
  height: 12px;
  border: 1.7px solid #6b7280;
  border-radius: 2px;
}

.folder-shape::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 1px;
  width: 8px;
  height: 4px;
  border: 1.7px solid #6b7280;
  border-bottom: none;
  border-radius: 2px 2px 0 0;
  background: #f8fbff;
}

.icon-notebook {
  color: #ea580c;
  border: 1px solid rgba(251, 146, 60, 0.32);
  background: rgba(255, 237, 213, 0.72);
}

.icon-code {
  color: #1d4ed8;
  background: rgba(219, 234, 254, 0.8);
}

.icon-text {
  color: #475569;
  background: rgba(226, 232, 240, 0.72);
}

.icon-data {
  color: #0f766e;
  background: rgba(204, 251, 241, 0.85);
}

.tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;
  font-size: 0.94rem;
  font-weight: 700;
}

.tree-size {
  min-width: 52px;
  color: #6b7280;
  font-size: 0.76rem;
  font-weight: 700;
  text-align: right;
}

.explorer-empty {
  padding: 1rem;
}

.workspace-main {
  padding: 1.45rem 1.55rem 1.75rem;
}

.breadcrumb-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1rem;
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 700;
}

.breadcrumb-row strong {
  color: #1e293b;
}

.page-state,
.info-card,
.document-panel {
  border: 1px solid rgba(203, 213, 225, 0.62);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.page-state {
  display: grid;
  place-items: center;
  gap: 0.85rem;
  min-height: 260px;
  text-align: center;
}

.page-state.error {
  color: #991b1b;
}

.preview-state {
  min-height: 560px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(148, 163, 184, 0.26);
  border-top-color: #334155;
  border-radius: 999px;
  animation: spin 0.9s linear infinite;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: #334155;
  font-size: 1rem;
  font-weight: 900;
}

.ghost-btn {
  min-height: 40px;
  padding: 0 1rem;
  border: 1px solid rgba(148, 163, 184, 0.38);
  background: #ffffff;
  color: #0f172a;
  font-size: 0.88rem;
  font-weight: 800;
}

.info-card {
  padding: 1.35rem 1.45rem;
}

.info-card-head {
  margin-bottom: 1rem;
}

.info-card-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.3rem;
  font-weight: 900;
}

.overview-grid,
.metadata-grid {
  display: grid;
  gap: 1rem;
}

.overview-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-block {
  padding: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: #f8fafc;
}

.overview-label {
  display: block;
  margin-bottom: 0.45rem;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.overview-block p {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

.metadata-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.meta-pair {
  display: grid;
  gap: 0.35rem;
  padding: 1rem;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: #f8fafc;
}

.meta-pair span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.meta-pair strong {
  color: #0f172a;
  font-size: 0.96rem;
}

.document-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.92);
}

.document-title {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.doc-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
  border-radius: 9px;
  font-size: 0.76rem;
  font-weight: 900;
}

.doc-badge.notebook {
  background: rgba(14, 165, 233, 0.14);
  color: #0369a1;
}

.doc-badge.code {
  background: rgba(37, 99, 235, 0.14);
  color: #1d4ed8;
}

.doc-badge.text {
  background: rgba(191, 219, 254, 0.52);
  color: #1e3a8a;
}

.document-title h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 900;
}

.document-title p {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 700;
}

.document-actions {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.readonly-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 8px;
  background: #eef3ff;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background: #ffffff;
  color: #334155;
  font-size: 1rem;
}

.document-body.code,
.document-body.text {
  padding: 0;
}

.code-sheet {
  overflow: auto;
}

.code-sheet.code {
  background: #24364b;
}

.code-sheet.text {
  background: #ffffff;
}

.code-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  min-height: 34px;
}

.code-sheet.code .code-row {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.code-sheet.text .code-row {
  border-top: 1px solid rgba(226, 232, 240, 0.72);
}

.code-row:first-child {
  border-top: none;
}

.line-number {
  padding: 0.55rem 0.85rem 0.55rem 0.65rem;
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  color: rgba(148, 163, 184, 0.92);
  text-align: right;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
  font-size: 0.8rem;
  user-select: none;
}

.line-content {
  display: block;
  padding: 0.55rem 1rem;
  white-space: pre;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.55;
  overflow-x: auto;
}

.code-sheet.code .line-content {
  color: #e5eef9;
}

.code-sheet.text .line-content {
  color: #334155;
}

.line-content :deep(.hljs-keyword),
.line-content :deep(.hljs-built_in),
.line-content :deep(.hljs-literal) {
  color: #89b4ff;
}

.line-content :deep(.hljs-string),
.line-content :deep(.hljs-attr) {
  color: #f6c177;
}

.line-content :deep(.hljs-comment) {
  color: #7dd3c7;
}

.line-content :deep(.hljs-number),
.line-content :deep(.hljs-symbol) {
  color: #f59e0b;
}

.line-content :deep(.hljs-title),
.line-content :deep(.hljs-function) {
  color: #c4b5fd;
}

.notebook-panel {
  background: #ffffff;
}

.notebook-frame {
  display: block;
  width: 100%;
  min-height: 78vh;
  border: none;
  background: #ffffff;
}

.unsupported-panel {
  padding: 1.2rem;
}

.unsupported-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
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
  margin: 0 0 0.45rem;
  color: #0f172a;
  font-size: 1.12rem;
  font-weight: 900;
}

.unsupported-copy p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.unsupported-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .workspace-shell {
    grid-template-columns: 1fr;
  }

  .workspace-sidebar {
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.26);
  }

  .explorer-tree {
    max-height: none;
  }

  .overview-grid,
  .metadata-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 820px) {
  .workspace-nav {
    grid-template-columns: 1fr;
    justify-items: start;
    padding: 1rem;
    min-height: auto;
  }

  .workspace-main {
    padding: 1rem;
  }

  .document-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .document-actions {
    width: 100%;
    justify-content: flex-start;
  }

}

@media (max-width: 640px) {
  .explorer-header,
  .explorer-search {
    padding-left: 0.9rem;
    padding-right: 0.9rem;
  }

  .tree-row {
    grid-template-columns: calc(var(--depth) * 14px) 14px 20px minmax(0, 1fr);
    padding-left: 0.9rem;
    padding-right: 0.9rem;
  }

  .tree-size {
    display: none;
  }

  .unsupported-card {
    grid-template-columns: 1fr;
  }

  .code-row {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .line-number {
    padding-right: 0.55rem;
  }
}
</style>
