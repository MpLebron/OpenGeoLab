<template>
  <div class="jupyter-project-page">
    <!-- 顶部导航 -->
    <header class="project-nav">
      <div class="nav-left">
        <RouterLink to="/" class="logo-link">
          <img :src="withAppBasePath('logo.png')" alt="OpenGeoLab" class="logo">
        </RouterLink>
        <router-link to="/jupyter" class="back-link">
          <AppIcon class="back-icon" name="arrowLeft" :size="16" :stroke-width="2" />
          <span>返回 Dashboard</span>
        </router-link>
      </div>
      <div class="nav-center">
        <h1 class="project-title">
          <span class="project-icon"></span>
          {{ projectName }}
        </h1>
        <p v-if="projectRuntimeLabel" class="project-runtime-chip">
          Runtime · {{ projectRuntimeLabel }}
          <span v-if="projectRuntimeSource === 'default_fallback'">default</span>
        </p>
      </div>
      <div class="nav-right">
        <button
          class="jupyter-btn"
          :class="{ running: jupyterStatus === 'running', starting: isStarting }"
          @click="toggleJupyter"
          :disabled="isStarting || isStopping"
        >
          <span v-if="isStarting" class="loading-spinner"></span>
          <span v-else-if="jupyterStatus === 'running'" class="status-dot"></span>
          <span v-else class="jupyter-icon"></span>
          <span v-if="isStarting">启动中...</span>
          <span v-else-if="jupyterStatus === 'running'">打开 JupyterLab</span>
          <span v-else>启动运行环境</span>
        </button>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="project-container">
      <aside class="file-sidebar explorer-sidebar">
        <div class="explorer-header">
          <p class="explorer-title">EXPLORER</p>
          <div class="explorer-actions">
            <button class="tool-btn" type="button" title="Expand loaded folders" aria-label="Expand loaded folders" @click="expandAllFolders">
              <AppIcon name="plus" :size="15" :stroke-width="1.9" />
            </button>
            <button class="tool-btn" type="button" title="Collapse folders" aria-label="Collapse folders" @click="collapseAllFolders">
              <AppIcon name="minus" :size="15" :stroke-width="1.9" />
            </button>
            <button class="tool-btn" type="button" title="Refresh explorer" aria-label="Refresh explorer" @click="refreshExplorer">
              <AppIcon name="refresh" :size="15" :stroke-width="1.9" />
            </button>
          </div>
        </div>

        <div class="explorer-search">
          <StyledSearch v-model="searchQuery" placeholder="Search files..." />
        </div>

        <section v-if="shouldShowProjectDataStrip" class="project-data-strip">
          <div class="project-data-head">
            <div>
              <p class="project-data-kicker">{{ projectDataDisplay.title }}</p>
              <span>{{ projectDataDisplay.countLabel }}</span>
            </div>
            <button
              v-if="projectDataDisplay.canAdd"
              class="tool-btn add-data-btn"
              type="button"
              title="Add from My Data"
              @click="openAttachDataModal"
            >
              <AppIcon name="plus" :size="15" :stroke-width="1.9" />
            </button>
          </div>

          <div v-if="visibleProjectDataBindings.length" class="project-data-list">
            <article
              v-for="binding in visibleProjectDataBindings"
              :key="binding.id"
              class="project-data-row"
              :class="dataBindingStatus(binding).className"
            >
              <span class="project-data-badge">{{ getDataItemBadge(binding) }}</span>
              <div class="project-data-copy">
                <strong :title="binding.name">{{ binding.name }}</strong>
                <span>{{ binding.mountPath }}</span>
              </div>
              <button
                v-if="canRemoveProjectDataBinding(binding)"
                class="project-data-remove"
                type="button"
                title="Remove Project Data binding"
                @click="removeProjectDataBinding(binding)"
              >
                <AppIcon name="x" :size="14" :stroke-width="2" />
              </button>
            </article>
          </div>
          <p v-else class="project-data-empty">Attach reusable assets from My Data.</p>
        </section>

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
          <p>{{ searchQuery ? 'No files match the current search.' : 'This project has no visible artifacts.' }}</p>
        </div>
      </aside>

      <main class="preview-area">
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
            <strong>{{ projectName }}</strong>
          </template>
        </div>

        <section v-if="!selectedFile" class="document-panel empty-preview-panel">
          <div class="empty-state">
            <span class="empty-icon"></span>
            <p>选择左侧文件进行预览</p>
          </div>
        </section>

        <section v-else-if="isLoadingPreview" class="document-panel preview-state">
          <span class="loading-spinner"></span>
          <span>正在准备预览内容...</span>
        </section>

        <section v-else-if="previewError" class="document-panel preview-state error-state">
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
              <span class="preview-badge">PREVIEW</span>
              <button class="icon-btn" type="button" title="Download file" aria-label="Download file" @click="downloadSelectedFile">
                <AppIcon name="download" :size="15" :stroke-width="1.9" />
              </button>
              <button class="action-btn primary" type="button" @click="openInJupyter" :disabled="isStarting">
                打开当前 Notebook
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
              <span class="preview-badge">PREVIEW</span>
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
      </main>
    </div>

    <!-- Jupyter 运行状态浮动条 -->
    <div v-if="jupyterStatus === 'running'" class="jupyter-floating-bar">
      <div class="floating-info">
        <span class="status-dot running"></span>
        <span>JupyterLab 运行中</span>
      </div>
      <div class="floating-actions">
        <a :href="jupyterUrl" target="_blank" class="floating-btn open">打开</a>
        <button class="floating-btn stop" @click="stopJupyter" :disabled="isStopping">
          {{ isStopping ? '停止中...' : '停止' }}
        </button>
      </div>
    </div>

    <div v-if="showAttachDataModal" class="attach-data-backdrop" @click.self="closeAttachDataModal">
      <section class="attach-data-dialog" role="dialog" aria-modal="true" aria-labelledby="attach-data-title">
        <header class="attach-data-header">
          <div>
            <p class="project-data-kicker">MY DATA</p>
            <h2 id="attach-data-title">Attach data to project</h2>
          </div>
          <button class="attach-close-btn" type="button" title="Close" @click="closeAttachDataModal">
            <AppIcon name="x" :size="16" :stroke-width="2" />
          </button>
        </header>

        <div class="attach-search">
          <StyledSearch v-model="attachDataSearch" placeholder="Search My Data assets..." />
        </div>

        <div v-if="isLoadingAttachData" class="attach-state">Loading My Data...</div>
        <div v-else-if="attachableDataItems.length === 0" class="attach-state">
          No attachable data assets found.
        </div>
        <div v-else class="attach-data-list">
          <button
            v-for="item in attachableDataItems"
            :key="item.id"
            type="button"
            class="attach-data-row"
            :disabled="isAttachingData || isDataAlreadyAttached(item)"
            @click="attachDataToProject(item)"
          >
            <span class="project-data-badge">{{ getDataItemBadge(item) }}</span>
            <span class="attach-data-main">
              <strong>{{ getDataItemTitle(item) }}</strong>
              <em>{{ getDataItemSubtitle(item) }}</em>
            </span>
            <span class="attach-data-action">{{ isDataAlreadyAttached(item) ? 'Attached' : 'Attach' }}</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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
import {
  canRemoveProjectDataBinding,
  canAttachMyDataItem,
  getDataItemBadge,
  getDataItemSubtitle,
  getDataItemTitle,
  getProjectDataSectionDisplay,
  getProjectDataStatus,
  getVisibleProjectDataBindings,
  shouldShowProjectDataSection
} from '../utils/dataLibraryDisplay.js'
import { getJupyterLaunchErrorMessage } from '../utils/jupyterLaunchErrors.js'
import {
  buildJupyterFileUrl,
  shouldRefreshJupyterLaunchUrl
} from '../utils/jupyterLaunchUrl.js'
import { buildWorkspaceProjectRoutePath } from '../utils/workspaceProjectDisplay.js'
import StyledSearch from '../components/StyledSearch.vue'
import AppIcon from '../components/AppIcon.vue'
import FileKindIcon from '../components/FileKindIcon.vue'
import { notify } from '../utils/systemFeedback.js'
import { createApiClient, withAppBasePath } from '../utils/apiClient.js'

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

// 状态
const projectRouteId = computed(() => String(route.params.projectId || route.params.projectName || ''))
const resolvedProjectName = ref('')
const project = ref(null)
const projectName = computed(() => resolvedProjectName.value || project.value?.name || projectRouteId.value)
const encodedProjectName = computed(() => encodeURIComponent(projectName.value))
const files = ref([])
const selectedFile = ref(null)
const notebookPreviewHtml = ref('')
const fileContent = ref('')
const directPreviewUrl = ref('')
const archivePreview = ref(null)
const isLoadingPreview = ref(false)
const previewError = ref('')
const isStarting = ref(false)
const isStopping = ref(false)
const jupyterStatus = ref('stopped')
const jupyterUrl = ref('')
const jupyterToken = ref('')

// 文件树相关状态
const expandedFolders = ref(new Set())
const folderContents = ref({}) // 存储各文件夹的内容
const searchQuery = ref('')
const projectDataBindings = ref([])
const showAttachDataModal = ref(false)
const attachDataSearch = ref('')
const attachDataItems = ref([])
const isLoadingAttachData = ref(false)
const isAttachingData = ref(false)

const projectRuntimeLabel = computed(() => (
  project.value?.runtime?.label ||
  project.value?.runtime?.imageName ||
  project.value?.runtimeImageId ||
  ''
))
const projectRuntimeSource = computed(() => project.value?.runtimeSource || '')
const visibleProjectDataBindings = computed(() => getVisibleProjectDataBindings(projectDataBindings.value))
const projectDataDisplay = computed(() => getProjectDataSectionDisplay(projectDataBindings.value))
const shouldShowProjectDataStrip = computed(() => shouldShowProjectDataSection(projectDataBindings.value, project.value))

// 需要隐藏的文件/文件夹
const hiddenPatterns = [
  '.ipynb_checkpoints',
  '.git',
  '.DS_Store',
  'Thumbs.db',
  '.pyc',
  '.pyo',
  '__MACOSX'
]

// 过滤隐藏文件
const shouldHideFile = (name) => {
  return hiddenPatterns.some(pattern =>
    name === pattern || name.endsWith(pattern) || name.startsWith('.')
  )
}

const normalizeProjectFile = (file) => normalizeFile({
  ...file,
  type: file.type === 'notebook' ? 'file' : file.type
})

// 构建文件树结构
const fileTree = computed(() => {
  // 过滤并排序文件
  const filteredFiles = files.value
    .filter(f => !shouldHideFile(f.name))
    .map(normalizeProjectFile)

  // 分离文件夹和文件
  const folders = filteredFiles.filter(f => f.type === 'folder')
  const regularFiles = filteredFiles.filter(f => f.type !== 'folder')

  // 文件夹排在前面，然后是文件，都按名称排序
  const sortedItems = [
    ...folders.sort((a, b) => a.name.localeCompare(b.name)),
    ...regularFiles.sort((a, b) => a.name.localeCompare(b.name))
  ]

  // 构建树结构
  return sortedItems.map(file => {
    const itemPath = file.path || file.name
    const item = {
      ...file,
      path: itemPath
    }

    // 如果是文件夹，添加子内容
    if (file.type === 'folder') {
      const children = folderContents.value[itemPath] || []
      item.children = buildChildrenTree(children, itemPath)
    }

    return item
  })
})

// 递归构建子文件树
const buildChildrenTree = (items, parentPath) => {
  const filteredItems = items
    .filter(f => !shouldHideFile(f.name))
    .map(normalizeProjectFile)
  const folders = filteredItems.filter(f => f.type === 'folder')
  const regularFiles = filteredItems.filter(f => f.type !== 'folder')

  const sortedItems = [
    ...folders.sort((a, b) => a.name.localeCompare(b.name)),
    ...regularFiles.sort((a, b) => a.name.localeCompare(b.name))
  ]

  return sortedItems.map(file => {
    const itemPath = file.path || `${parentPath}/${file.name}`
    const item = {
      ...file,
      path: itemPath
    }

    if (file.type === 'folder') {
      const children = folderContents.value[itemPath] || []
      item.children = buildChildrenTree(children, itemPath)
    }

    return item
  })
}

// 文件计数（排除隐藏文件）
const fileCount = computed(() => {
  return files.value.filter(f => !shouldHideFile(f.name)).length
})

const selectedFilePathSegments = computed(() => {
  if (!selectedFile.value?.path) return []
  return ['root', ...String(selectedFile.value.path).split('/').filter(Boolean)]
})

const visibleExplorerEntries = computed(() => collectVisibleExplorerEntries(fileTree.value))

const attachableDataItems = computed(() => {
  const keyword = attachDataSearch.value.toLowerCase()
  return attachDataItems.value
    .filter(canAttachMyDataItem)
    .filter(item => {
      if (!keyword) return true
      return [
        item.name,
        item.path,
        item.description,
        item.metadata?.domain,
        item.metadata?.formatLabel
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(keyword))
    })
})

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

const matchesSearch = (node, keyword) => {
  if (!keyword) return true

  const lowerName = String(node.name || '').toLowerCase()
  const lowerPath = String(node.path || '').toLowerCase()
  if (lowerName.includes(keyword) || lowerPath.includes(keyword)) {
    return true
  }

  return Array.isArray(node.children) && node.children.some(child => matchesSearch(child, keyword))
}

const collectVisibleExplorerEntries = (nodes, depth = 0) => {
  const keyword = searchQuery.value.toLowerCase()
  const revealAllMatches = Boolean(keyword)
  const entries = []

  nodes.forEach(node => {
    if (!matchesSearch(node, keyword)) return

    entries.push({ ...node, depth })

    if (node.type !== 'folder' || !node.children?.length) return

    if (revealAllMatches || expandedFolders.value.has(node.path)) {
      entries.push(...collectVisibleExplorerEntries(node.children, depth + 1))
    }
  })

  return entries
}

const collectLoadedFolderPaths = (nodes, set = new Set()) => {
  nodes.forEach(node => {
    if (node.type === 'folder') {
      set.add(node.path)
      collectLoadedFolderPaths(node.children || [], set)
    }
  })
  return set
}

const isFolderExpanded = (folderPath) => expandedFolders.value.has(folderPath)

const treeIconClass = (file) => {
  const normalized = normalizeFile(file)
  if (normalized.type === 'folder') return 'icon-folder'
  if (normalized.previewKind === 'notebook') return 'icon-notebook'
  if (normalized.previewKind === 'code') return 'icon-code'
  if (normalized.previewKind === 'text') return 'icon-text'
  return 'icon-data'
}

// 切换文件夹展开/折叠
const toggleFolder = async (folderPath) => {
  const newSet = new Set(expandedFolders.value)
  if (newSet.has(folderPath)) {
    newSet.delete(folderPath)
  } else {
    // 如果还没有加载过这个文件夹的内容，先加载
    if (!folderContents.value[folderPath]) {
      await loadFolderContents(folderPath)
    }
    newSet.add(folderPath)
  }
  expandedFolders.value = newSet
}

const expandAllFolders = async () => {
  for (const node of fileTree.value) {
    if (node.type === 'folder' && !folderContents.value[node.path]) {
      await loadFolderContents(node.path)
    }
  }
  expandedFolders.value = collectLoadedFolderPaths(fileTree.value)
}

const collapseAllFolders = () => {
  expandedFolders.value = new Set()
}

const refreshExplorer = async () => {
  folderContents.value = {}
  expandedFolders.value = new Set()
  await loadProject()
}

// 加载文件夹内容
const loadFolderContents = async (folderPath) => {
  const token = getToken()
  if (!token) return

  try {
    const response = await axios.get(`/api/jupyter/projects/${encodedProjectName.value}/folder`, {
      params: { path: folderPath },
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data && response.data.files) {
      folderContents.value[folderPath] = response.data.files
    }
  } catch (error) {
    console.error('Failed to load folder contents:', error)
  }
}

// 处理文件选择
const handleTreeRowClick = async (item) => {
  if (item.type === 'folder') {
    await toggleFolder(item.path)
    return
  }

  selectFile(item)
}

const handleFileSelect = (item) => {
  selectFile(normalizeProjectFile(item))
}

// 获取存储的 token
const getToken = () => localStorage.getItem('jupyter_token')

// 创建带认证的 axios 实例
const authAxios = () => {
  const token = getToken()
  return createApiClient({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const dataBindingStatus = (binding) => getProjectDataStatus(binding)

const loadProjectDataBindings = async () => {
  try {
    const res = await authAxios().get(`/api/jupyter/projects/${encodedProjectName.value}/data-bindings`)
    projectDataBindings.value = res.data.dataBindings || []
  } catch (e) {
    console.error('Failed to load Project Data bindings:', e)
    projectDataBindings.value = []
  }
}

const openAttachDataModal = async () => {
  showAttachDataModal.value = true
  attachDataSearch.value = ''
  isLoadingAttachData.value = true
  try {
    const res = await authAxios().get('/api/jupyter/my-data')
    attachDataItems.value = res.data.dataList || []
  } catch (e) {
    console.error('Failed to load My Data:', e)
    attachDataItems.value = []
    notify('无法加载 My Data。', 'error')
  } finally {
    isLoadingAttachData.value = false
  }
}

const closeAttachDataModal = () => {
  if (isAttachingData.value) return
  showAttachDataModal.value = false
}

const isDataAlreadyAttached = (item) => (
  projectDataBindings.value.some(binding => String(binding.dataId) === String(item.id))
)

const attachDataToProject = async (item) => {
  if (!canAttachMyDataItem(item) || isDataAlreadyAttached(item)) return
  isAttachingData.value = true
  try {
    const res = await authAxios().post(`/api/jupyter/projects/${encodedProjectName.value}/data-bindings`, {
      dataId: item.id
    })
    projectDataBindings.value = res.data.dataBindings || []
    if (project.value) {
      project.value = {
        ...project.value,
        dataBindings: projectDataBindings.value,
        dataBindingCount: projectDataBindings.value.length
      }
    }
    notify('Data asset added to this project.', 'success')
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to attach data asset.', 'error')
  } finally {
    isAttachingData.value = false
  }
}

const removeProjectDataBinding = async (binding) => {
  if (!canRemoveProjectDataBinding(binding)) return
  try {
    const res = await authAxios().delete(
      `/api/jupyter/projects/${encodedProjectName.value}/data-bindings/${encodeURIComponent(binding.id)}`
    )
    projectDataBindings.value = res.data.dataBindings || []
    if (project.value) {
      project.value = {
        ...project.value,
        dataBindings: projectDataBindings.value,
        dataBindingCount: projectDataBindings.value.length
      }
    }
    notify('Project Data binding removed.', 'success')
  } catch (e) {
    notify(e.response?.data?.error || 'Failed to remove Project Data binding.', 'error')
  }
}

// 加载项目详情
const loadProject = async () => {
  try {
    const res = await authAxios().get(`/api/jupyter/projects/${encodeURIComponent(projectRouteId.value)}`)
    project.value = res.data.project
    resolvedProjectName.value = res.data.project?.name || res.data.project?.projectName || projectRouteId.value
    const canonicalProjectRoute = buildWorkspaceProjectRoutePath(res.data.project)
    if (res.data.project?.projectId && projectRouteId.value !== res.data.project?.projectId) {
      router.replace(canonicalProjectRoute)
    }
    files.value = res.data.files
    projectDataBindings.value = res.data.project?.dataBindings || []

    const initialFile = pickPreferredPreviewFile(
      files.value.map(normalizeProjectFile),
      project.value?.coreNotebook || project.value?.case?.coreNotebook || ''
    )
    if (initialFile) {
      selectFile(initialFile)
    }
  } catch (e) {
    console.error('Failed to load project:', e)
    if (e.response?.status === 404) {
      notify('项目不存在。请返回工作空间重新选择项目。', 'error')
      router.push('/jupyter')
    }
  }
}

// 选择文件
const selectFile = async (file) => {
  const normalized = normalizeProjectFile(file)
  selectedFile.value = normalized
  notebookPreviewHtml.value = ''
  fileContent.value = ''
  releaseDirectPreviewUrl()
  archivePreview.value = null
  previewError.value = ''

  const filePath = normalized.path || normalized.name

  if (!normalized.previewSupported || normalized.type === 'folder') {
    return
  }

  if (DIRECT_PREVIEW_KINDS.has(normalized.previewKind)) {
    await loadDirectFilePreview(filePath)
    return
  }

  if (normalized.previewKind === 'notebook') {
    await loadNotebookPreview(filePath)
  } else if (normalized.previewKind === 'archive') {
    await loadArchivePreview(filePath)
  } else if (CONTENT_PREVIEW_KINDS.has(normalized.previewKind)) {
    await loadTextFileContent(filePath)
  } else {
    previewError.value = normalized.previewReason || 'Preview is not available for this file.'
  }
}

const encodeProjectFilePath = (filePath = '') => (
  String(filePath || '')
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
)

const projectFileEndpoint = (filePath = '', kind = 'content') => {
  return `/api/jupyter/projects/${encodedProjectName.value}/files/${encodeProjectFilePath(filePath)}/${kind}`
}

// 加载文本文件内容
const loadTextFileContent = async (filePath) => {
  isLoadingPreview.value = true
  try {
    const res = await authAxios().get(
      projectFileEndpoint(filePath, 'content')
    )
    if (selectedFile.value?.path === filePath) {
      fileContent.value = String(res.data.content || '')
    }
  } catch (e) {
    console.error('Failed to load text file:', e)
    previewError.value = e.response?.data?.error || e.message || '无法加载文件内容'
  } finally {
    if (selectedFile.value?.path === filePath) {
      isLoadingPreview.value = false
    }
  }
}

// 加载 Notebook 预览
const loadNotebookPreview = async (notebookPath) => {
  isLoadingPreview.value = true
  try {
    const res = await authAxios().get(
      projectFileEndpoint(notebookPath, 'preview')
    )
    if (selectedFile.value?.path === notebookPath) {
      notebookPreviewHtml.value = sanitizeNotebookPreviewHtml(res.data.html)
    }
  } catch (e) {
    console.error('Failed to load notebook preview:', e)
    previewError.value = e.response?.data?.error || e.message || 'Notebook 预览加载失败'
  } finally {
    if (selectedFile.value?.path === notebookPath) {
      isLoadingPreview.value = false
    }
  }
}

const loadArchivePreview = async (filePath) => {
  isLoadingPreview.value = true
  try {
    const res = await authAxios().get(projectFileEndpoint(filePath, 'preview'))
    if (selectedFile.value?.path === filePath) {
      archivePreview.value = res.data.archive || { entries: [], totalEntries: 0, truncated: false, error: '' }
    }
  } catch (e) {
    console.error('Failed to load archive preview:', e)
    previewError.value = e.response?.data?.error || e.message || '压缩包预览加载失败'
  } finally {
    if (selectedFile.value?.path === filePath) {
      isLoadingPreview.value = false
    }
  }
}

const loadDirectFilePreview = async (filePath) => {
  isLoadingPreview.value = true
  try {
    const res = await authAxios().get(projectFileEndpoint(filePath, 'preview'), {
      responseType: 'blob'
    })
    if (selectedFile.value?.path === filePath) {
      releaseDirectPreviewUrl()
      directPreviewUrl.value = window.URL.createObjectURL(res.data)
    }
  } catch (e) {
    console.error('Failed to load direct file preview:', e)
    previewError.value = e.response?.data?.error || e.message || '文件预览加载失败'
  } finally {
    if (selectedFile.value?.path === filePath) {
      isLoadingPreview.value = false
    }
  }
}

const releaseDirectPreviewUrl = () => {
  if (directPreviewUrl.value?.startsWith('blob:')) {
    window.URL.revokeObjectURL(directPreviewUrl.value)
  }
  directPreviewUrl.value = ''
}

const sanitizeNotebookPreviewHtml = (html) => {
  return String(html || '').replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
}

// 获取 Jupyter 状态（基于项目）
const fetchJupyterStatus = async () => {
  try {
    const res = await authAxios().get(`/api/jupyter/status?projectName=${encodeURIComponent(projectName.value)}`)
    if (res.data.status === 'running') {
      jupyterStatus.value = 'running'
      jupyterUrl.value = res.data.url
      jupyterToken.value = res.data.token
    } else {
      jupyterStatus.value = 'stopped'
    }
  } catch (e) {
    jupyterStatus.value = 'stopped'
  }
}

// 启动/打开 Jupyter
const toggleJupyter = async () => {
  if (jupyterStatus.value === 'running') {
    if (shouldRefreshJupyterLaunchUrl(jupyterStatus.value, jupyterUrl.value, jupyterToken.value)) {
      await startJupyter()
      return
    }
    // 直接打开 JupyterLab（项目目录已挂载为根目录）
    window.open(jupyterUrl.value, '_blank')
  } else {
    await startJupyter()
  }
}

// 启动 Jupyter（使用项目绑定 runtime）
const startJupyter = async ({ openAfterStart = true } = {}) => {
  isStarting.value = true
  try {
    const res = await authAxios().post('/api/jupyter/start', {
      projectName: projectName.value
    })
    if (res.data.status === 'started' || res.data.status === 'already_running') {
      jupyterStatus.value = 'running'
      jupyterUrl.value = res.data.url
      jupyterToken.value = res.data.token
      if (res.data.runtime && project.value) {
        project.value = {
          ...project.value,
          runtime: res.data.runtime,
          runtimeSource: res.data.runtimeSource || project.value.runtimeSource
        }
      }
      if (Array.isArray(res.data.dataBindingWarnings) && res.data.dataBindingWarnings.length) {
        notify('Jupyter started, but Project Data manifest could not be fully prepared.', 'warning', { duration: 6000 })
      }

      // 直接打开 JupyterLab（项目已挂载为根目录）
      if (openAfterStart) {
        setTimeout(() => {
          window.open(jupyterUrl.value, '_blank')
        }, 2000)
      }
      return true
    }
  } catch (e) {
    notify('启动失败：' + getJupyterLaunchErrorMessage(e), 'error', { duration: 6000 })
    return false
  } finally {
    isStarting.value = false
  }
  return false
}

// 停止 Jupyter（传入项目名）
const stopJupyter = async () => {
  isStopping.value = true
  try {
    await authAxios().post('/api/jupyter/stop', {
      projectName: projectName.value
    })
    jupyterStatus.value = 'stopped'
    jupyterUrl.value = ''
    jupyterToken.value = ''
  } catch (e) {
    notify('停止失败：' + (e.response?.data?.error || e.message), 'error', { duration: 5000 })
  } finally {
    isStopping.value = false
  }
}

// 在 Jupyter 中打开当前文件
const openInJupyter = async () => {
  if (
    jupyterStatus.value !== 'running' ||
    shouldRefreshJupyterLaunchUrl(jupyterStatus.value, jupyterUrl.value, jupyterToken.value)
  ) {
    const started = await startJupyter({ openAfterStart: false })
    if (!started) return
    // 等待启动完成
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  if (jupyterUrl.value && selectedFile.value) {
    // 项目目录已挂载为 /home/jovyan/work，文件直接在根目录
    const targetPath = selectedFile.value.path || selectedFile.value.name
    const url = buildJupyterFileUrl(jupyterUrl.value, jupyterToken.value, targetPath)
    window.open(url, '_blank')
  }
}

const downloadSelectedFile = async () => {
  if (!selectedFile.value || selectedFile.value.type === 'folder') return

  try {
    const response = await authAxios().get(
      projectFileEndpoint(selectedFile.value.path || selectedFile.value.name, 'download'),
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
  } catch (e) {
    notify(`下载失败：${e.response?.data?.error || e.message}`, 'error', { duration: 5000 })
  }
}

const copySelectedContent = async () => {
  if (!fileContent.value) return

  try {
    await navigator.clipboard.writeText(fileContent.value)
    notify(`已复制 ${selectedFile.value?.name || '当前文件'}`, 'success')
  } catch (e) {
    notify('复制失败，请检查浏览器剪贴板权限。', 'error', { duration: 5000 })
  }
}

const summarizeProperties = (properties = {}) => {
  const entries = Object.entries(properties)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 4)

  if (!entries.length) return 'No properties'
  return entries.map(([key, value]) => `${key}: ${String(value).slice(0, 48)}`).join(' · ')
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

// 初始化
onMounted(async () => {
  if (!getToken()) {
    router.push('/jupyter')
    return
  }

  await loadProject()
  await fetchJupyterStatus()
})

onBeforeUnmount(() => {
  releaseDirectPreviewUrl()
})

// 监听项目路由变化
watch(projectRouteId, async () => {
  resolvedProjectName.value = ''
  await loadProject()
  await fetchJupyterStatus()
})
</script>

<style scoped>
.jupyter-project-page {
  min-height: 100vh;
  background: #f5f7fa;
  color: #303133;
}

/* 顶部导航 */
.project-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.25rem;
  height: 58px;
  background: #000000;
  border-bottom: none;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.logo-link {
  display: flex;
  align-items: center;
}

.logo {
  height: 32px;
  width: auto;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #ffffff;
}

.back-icon {
  font-size: 1.1rem;
}

.nav-center {
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.project-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.project-icon {
  font-size: 1.5rem;
}

.project-runtime-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.project-runtime-chip span {
  padding: 1px 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.58);
}

.nav-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

/* Jupyter 按钮 */
.jupyter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 18px;
  background: #0f172a;
  border: 1px solid #0f172a;
  border-radius: 7px;
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 850;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.jupyter-btn:hover:not(:disabled) {
  background: #111827;
  border-color: #111827;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
}

.jupyter-btn:disabled {
  background: #e5e7eb;
  border-color: #d1d5db;
  color: #6b7280;
  opacity: 1;
  cursor: not-allowed;
  box-shadow: none;
}

.jupyter-btn.running {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #0f172a;
}

.jupyter-btn.starting {
  background: #f3f4f6;
  border-color: #cbd5e1;
  color: #334155;
}

.jupyter-btn .status-dot {
  width: 8px;
  height: 8px;
  background: #0f172a;
  border-radius: 50%;
}

.jupyter-btn .loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(100, 116, 139, 0.28);
  border-top-color: #334155;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 主容器 */
.project-container {
  display: flex;
  height: calc(100vh - 64px);
}

/* 左侧文件栏 */
.file-sidebar {
  width: 320px;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fb;
}

.sidebar-header h2 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.file-count {
  font-size: 0.75rem;
  color: #909399;
}

.version-switcher {
  padding: 10px 12px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
}

.version-switcher label {
  font-size: 12px;
  color: #606266;
  min-width: 52px;
}

.version-select {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #303133;
  font-size: 12px;
  padding: 6px 8px;
}

.workspace-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #f8f9fb;
}

.workspace-tab {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #ffffff;
  color: #606266;
  padding: 7px 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.workspace-tab:hover {
  border-color: #94a3b8;
  color: #0f172a;
  background: #f8fafc;
}

.workspace-tab.active {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.workspace-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 文件树样式 */
.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.tab-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}

.tab-title {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.data-file-list,
.version-list,
.fork-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-file-item {
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.data-file-item:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.data-file-item .file-name {
  color: #303133;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-file-item .file-size {
  color: #909399;
  font-size: 11px;
  flex-shrink: 0;
}

.version-item {
  width: 100%;
  text-align: left;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.version-item:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.version-item.active {
  border-color: #0f172a;
  background: #f8fafc;
}

.version-name {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.version-time {
  font-size: 11px;
  color: #606266;
}

.version-note {
  font-size: 11px;
  color: #909399;
}

.fork-item {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fork-title {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}

.fork-time {
  font-size: 11px;
  color: #606266;
}

.fork-note {
  font-size: 11px;
  color: #909399;
}

.tree-root {
  user-select: none;
}

.tree-item {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  padding-left: 8px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 13px;
}

.tree-item:hover {
  background: rgba(64, 158, 255, 0.08);
}

.tree-item.selected {
  background: rgba(64, 158, 255, 0.15);
}

.tree-item.root-item {
  padding: 8px 12px;
  padding-left: 8px;
  font-weight: 500;
  background: transparent;
}

.tree-item.root-item:hover {
  background: rgba(64, 158, 255, 0.05);
}

.chevron {
  width: 18px;
  font-size: 11px;
  color: #909399;
  transition: transform 0.15s;
  display: inline-block;
  text-align: center;
  flex-shrink: 0;
}

.chevron.expanded {
  transform: rotate(90deg);
}

.chevron-placeholder {
  width: 18px;
  flex-shrink: 0;
}

.folder-emoji {
  font-size: 16px;
  margin-right: 8px;
}

.file-emoji {
  font-size: 16px;
  margin-right: 8px;
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
}

.item-name.root-name {
  color: #303133;
  font-weight: 600;
}

.tree-children {
  /* 子文件缩进 */
}

.tree-children .tree-item {
  padding-left: 28px;
}

.empty-tree {
  padding: 24px 16px;
  text-align: center;
  color: #909399;
  font-size: 12px;
}

.empty-tree p {
  margin: 4px 0;
}

.empty-tree .hint {
  font-size: 11px;
  color: #c0c4cc;
}

/* 右侧预览区 */
.preview-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f7fa;
}

.explorer-sidebar {
  background: #f8fbff;
  box-shadow: none;
}

.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.05rem 0.8rem;
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
  gap: 0.4rem;
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
}

.tool-btn:hover {
  background: rgba(226, 232, 240, 0.8);
  color: #0f172a;
}

.explorer-search {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.72);
}

.project-data-strip {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(203, 213, 225, 0.72);
  background: #ffffff;
}

.project-data-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.project-data-kicker {
  margin: 0 0 0.15rem;
  color: #4b5563;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.11em;
}

.project-data-head span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 750;
}

.add-data-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
}

.project-data-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 190px;
  overflow-y: auto;
}

.project-data-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 50px;
  padding: 0.45rem 0.5rem;
  border: 1px solid #d8dee9;
  border-radius: 7px;
  background: #f8fafc;
}

.project-data-row.missing {
  border-style: dashed;
}

.project-data-badge {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #d8dee9;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.project-data-copy {
  display: grid;
  gap: 0.14rem;
  min-width: 0;
}

.project-data-copy strong,
.project-data-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-data-copy strong {
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 900;
}

.project-data-copy span,
.project-data-empty {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 700;
}

.project-data-empty {
  margin: 0;
}

.project-data-remove {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: #64748b;
  font-size: 1rem;
  cursor: pointer;
}

.project-data-remove:hover {
  border-color: #d8dee9;
  background: #ffffff;
  color: #7f1d1d;
}

.explorer-tree {
  flex: 1;
  min-height: 0;
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
  padding: 0 0.95rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
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
}

.icon-folder {
  position: relative;
  width: 22px;
  height: 18px;
  background: transparent;
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
  font-size: 0.93rem;
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
  color: #64748b;
  font-size: 0.88rem;
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

.document-panel {
  overflow: hidden;
  border: 1px solid rgba(203, 213, 225, 0.62);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.empty-preview-panel,
.preview-state {
  display: grid;
  place-items: center;
  gap: 0.85rem;
  min-height: 520px;
  text-align: center;
  color: #64748b;
}

.error-state {
  color: #991b1b;
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
  border: 1px solid #d8dee9;
  border-radius: 7px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.76rem;
  font-weight: 900;
}

.doc-badge.notebook {
  background: #f8fafc;
  color: #111827;
}

.doc-badge.code {
  background: #f8fafc;
  color: #111827;
}

.doc-badge.text {
  background: #f8fafc;
  color: #111827;
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

.preview-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 0.8rem;
  border: 1px solid #d8dee9;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #d8dee9;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.icon-btn:hover {
  border-color: #94a3b8;
  background: #f8fafc;
  color: #0f172a;
}

.ghost-btn {
  justify-self: start;
  min-height: 34px;
  margin-top: 0.75rem;
  padding: 0 0.85rem;
  border: 1px solid #d8dee9;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 800;
}

.ghost-btn:hover {
  border-color: #94a3b8;
  background: #f8fafc;
  color: #0f172a;
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

.image-preview-frame {
  display: grid;
  place-items: center;
  min-height: 420px;
  padding: 1rem;
  background: #fafafa;
}

.image-preview-frame img {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  border: 1px solid #e2e8f0;
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
}

.markdown-document :deep(h2) {
  font-size: 1.45rem;
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
  border: 1px solid #e5e7eb;
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

.no-selection {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.empty-state {
  text-align: center;
  color: #909399;
}

.empty-state .empty-icon {
  font-size: 2.2rem;
  display: block;
  margin-bottom: 10px;
}

/* Notebook 预览 */
.notebook-preview {
  max-width: 1000px;
  margin: 0 auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.preview-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.action-btn {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 850;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.action-btn:hover:not(:disabled) {
  border-color: #94a3b8;
  color: #0f172a;
  background: #f8fafc;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #0f172a;
  border-color: #0f172a;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #111827;
  border-color: #111827;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
}

.preview-meta {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: #ffffff;
  border-radius: 8px;
  margin-bottom: 24px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.meta-item {
  display: flex;
  gap: 8px;
}

.meta-label {
  color: #909399;
}

.meta-value {
  color: #303133;
}

.loading-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: #909399;
}

/* Notebook Cells */
.notebook-cells {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cell-preview {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.cell-preview.code {
  border-left: 3px solid #cbd5e1;
}

.cell-preview.markdown {
  border-left: 3px solid #cbd5e1;
}

.cell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fb;
  font-size: 0.8rem;
  color: #606266;
  border-bottom: 1px solid #e4e7ed;
}

.cell-type {
  font-weight: 500;
}

.cell-index {
  color: #909399;
}

.cell-content {
  padding: 16px;
  font-size: 0.9rem;
  line-height: 1.5;
  max-height: 300px;
  overflow: auto;
}

.cell-content.code {
  background: #f8f9fb;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.cell-content.code code {
  color: #24292f;
}

.cell-content.markdown {
  color: #606266;
  white-space: pre-wrap;
}

/* 输出区域 */
.cell-outputs {
  border-top: 1px dashed #e4e7ed;
  background: #f8f9fb;
}

.cell-output {
  padding: 12px 16px;
}

.output-stream {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.85rem;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-stream.stderr {
  color: #f56c6c;
}

.output-text {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.85rem;
  color: #67c23a;
  white-space: pre-wrap;
}

.output-error {
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.85rem;
  color: #f56c6c;
  white-space: pre-wrap;
}

.output-image {
  max-width: 100%;
  overflow: auto;
}

.output-image img {
  max-width: 100%;
  height: auto;
}

.more-cells {
  text-align: center;
  padding: 24px;
  color: #909399;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.more-cells p {
  margin-bottom: 16px;
}

/* 文件预览 */
.file-preview {
  max-width: 600px;
  margin: 0 auto;
}

.file-info-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-info-card p {
  margin: 12px 0;
  color: #606266;
}

/* 文本文件预览 */
.text-file-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.text-file-preview .preview-header {
  flex-shrink: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 16px;
}

.text-file-preview .preview-header h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #303133;
}

.text-file-preview .preview-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.text-content-wrapper {
  flex: 1;
  overflow: auto;
  background: #f8f9fb;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.text-content {
  margin: 0;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
  word-wrap: break-word;
  tab-size: 4;
}

.text-content code {
  font-family: inherit;
  background: none;
}

/* 浮动条 */
.jupyter-floating-bar {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
  z-index: 1000;
}

.floating-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.status-dot.running {
  width: 8px;
  height: 8px;
  background: #0f172a;
  border-radius: 50%;
}

.floating-actions {
  display: flex;
  gap: 8px;
}

.floating-btn {
  min-height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 850;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  text-decoration: none;
}

.floating-btn.open {
  background: #0f172a;
  border: 1px solid #0f172a;
  color: white;
}

.floating-btn.open:hover {
  background: #111827;
}

.floating-btn.stop {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
}

.floating-btn.stop:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

.floating-btn.stop:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.attach-data-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(15, 23, 42, 0.42);
}

.attach-data-dialog {
  width: min(760px, 100%);
  max-height: min(760px, 88vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #d8dee9;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
}

.attach-data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
}

.attach-data-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.2rem;
  font-weight: 900;
}

.attach-close-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #334155;
  font-size: 1.1rem;
  cursor: pointer;
}

.attach-close-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.attach-search {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
}

.attach-data-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  overflow: auto;
  padding: 1rem 1.25rem 1.25rem;
}

.attach-data-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.85rem;
  min-height: 66px;
  padding: 0.7rem 0.85rem;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.attach-data-row:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f8fafc;
}

.attach-data-row:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.attach-data-main {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.attach-data-main strong,
.attach-data-main em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attach-data-main strong {
  color: #0f172a;
  font-size: 0.92rem;
  font-weight: 900;
}

.attach-data-main em {
  color: #64748b;
  font-size: 0.8rem;
  font-style: normal;
  font-weight: 700;
}

.attach-data-action {
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 900;
}

.attach-data-row:disabled .attach-data-action {
  color: #64748b;
}

.attach-state {
  padding: 2rem;
  color: #64748b;
  text-align: center;
  font-weight: 800;
}

/* 动画 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 滚动条 */
.file-list::-webkit-scrollbar,
.preview-area::-webkit-scrollbar,
.cell-content::-webkit-scrollbar {
  width: 6px;
}

.file-list::-webkit-scrollbar-track,
.preview-area::-webkit-scrollbar-track,
.cell-content::-webkit-scrollbar-track {
  background: transparent;
}

.file-list::-webkit-scrollbar-thumb,
.preview-area::-webkit-scrollbar-thumb,
.cell-content::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.file-list::-webkit-scrollbar-thumb:hover,
.preview-area::-webkit-scrollbar-thumb:hover,
.cell-content::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

@media (max-width: 1080px) {
  .file-sidebar {
    width: 290px;
  }
}

@media (max-width: 768px) {
  .project-container {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 64px);
  }

  .file-sidebar {
    width: 100%;
    height: 46vh;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
    box-shadow: none;
  }

  .preview-area {
    padding: 14px;
  }
}

/* ========== Scientific Workbench Normalization ========== */
.jupyter-project-page {
  --workbench-bg: #f3f5f7;
  --workbench-panel: #ffffff;
  --workbench-sidebar: #f6f8fb;
  --workbench-border: #cfd6df;
  --workbench-border-soft: #dde3ea;
  --workbench-text: #111827;
  --workbench-muted: #5f6b7a;
  --workbench-primary: #0f172a;
  --workbench-accent: #007783;
  --workbench-radius: 5px;
  background: var(--workbench-bg);
  color: var(--workbench-text);
}

.project-nav {
  height: 56px;
  padding: 0 18px;
  background: #05070a;
  border-bottom: 1px solid #1f2937;
  box-shadow: none;
}

.logo {
  height: 28px;
}

.back-link {
  min-height: 32px;
  padding: 0 8px;
  border-radius: var(--workbench-radius);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.84rem;
  font-weight: 700;
}

.back-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.project-title {
  font-size: 1.05rem;
  font-weight: 760;
}

.project-icon {
  display: none;
}

.project-runtime-chip {
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.7rem;
}

.jupyter-btn {
  min-height: 36px;
  padding: 0 14px;
  border-radius: var(--workbench-radius);
  font-size: 0.84rem;
  font-weight: 780;
  box-shadow: none;
}

.jupyter-btn:hover:not(:disabled) {
  background: #1f2937;
  border-color: #1f2937;
  color: #ffffff;
  box-shadow: none;
}

.jupyter-btn.running {
  background: #ffffff;
  border-color: #cfd6df;
  color: #111827;
}

.jupyter-btn.running:hover:not(:disabled) {
  background: #f4f7fb;
  border-color: #aeb9c6;
  color: #111827;
}

.project-container {
  height: calc(100vh - 56px);
}

.file-sidebar {
  width: 324px;
  background: var(--workbench-sidebar);
  border-right: 1px solid var(--workbench-border);
  box-shadow: none;
}

.explorer-sidebar {
  background: var(--workbench-sidebar);
}

.explorer-header {
  min-height: 52px;
  padding: 0 14px;
  border-bottom: 1px solid var(--workbench-border-soft);
}

.explorer-title {
  color: #394352;
  font-size: 0.72rem;
  letter-spacing: 0.11em;
}

.explorer-actions {
  gap: 4px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: var(--workbench-radius);
  background: transparent;
  color: #4b5563;
  font-size: 0;
  box-shadow: none;
}

.tool-btn svg {
  width: 16px;
  height: 16px;
  display: block;
}

.tool-btn:hover {
  border-color: #c3ccd7;
  background: #ffffff;
  color: #111827;
}

.explorer-search {
  padding: 12px 14px;
}

.project-data-strip {
  background: #ffffff;
}

.tree-row {
  min-height: 34px;
}

.tree-row.active {
  background: #dceaff;
}

.preview-area {
  background: var(--workbench-bg);
}

.document-panel {
  border-color: var(--workbench-border-soft);
  border-radius: var(--workbench-radius);
  box-shadow: none;
}

.document-head {
  min-height: 80px;
}

.document-actions {
  align-items: center;
}

.preview-badge {
  min-height: 36px;
  border-radius: var(--workbench-radius);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: var(--workbench-radius);
  line-height: 1;
  box-shadow: none;
}

.action-btn.primary {
  background: var(--workbench-primary);
  border-color: var(--workbench-primary);
  color: #ffffff;
}

.action-btn.primary:hover:not(:disabled) {
  background: #1f2937;
  border-color: #1f2937;
  color: #ffffff;
  box-shadow: none;
}

.jupyter-floating-bar {
  right: 20px;
  bottom: 18px;
  min-height: 46px;
  padding: 8px 10px 8px 14px;
  border-color: var(--workbench-border);
  border-radius: var(--workbench-radius);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
}

.floating-info {
  min-height: 32px;
  color: #273142;
  font-size: 0.88rem;
  font-weight: 650;
}

.floating-actions {
  align-items: center;
}

.floating-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  min-height: 32px;
  padding: 0 12px;
  border-radius: var(--workbench-radius);
  line-height: 1;
}

.floating-btn.open {
  background: var(--workbench-primary);
  border-color: var(--workbench-primary);
  color: #ffffff;
}

.floating-btn.open:hover {
  background: #1f2937;
  color: #ffffff;
}

.floating-btn.stop {
  background: #ffffff;
  color: #273142;
}
</style>
