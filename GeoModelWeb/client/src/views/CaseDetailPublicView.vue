<template>
  <div class="case-detail-page">
    <section class="case-detail-shell page-top">
      <RouterLink class="back-link" :to="{ name: 'Cases' }">
        <span aria-hidden="true">&larr;</span>
        {{ $t('caseDetail.back') }}
      </RouterLink>

      <div v-if="loading" class="detail-state">
        <div class="spinner"></div>
        <p>{{ $t('caseDetail.loading') }}</p>
      </div>

      <div v-else-if="error" class="detail-state">
        <p>{{ error }}</p>
        <button type="button" @click="fetchCase">{{ $t('casesView.retry') }}</button>
      </div>

      <template v-else-if="caseItem">
        <section class="hero-panel">
          <div class="hero-cover">
            <img v-if="caseItem.coverImageUrl && !imageFailed" :src="caseItem.coverImageUrl" :alt="caseItem.title"
              @error="imageFailed = true">
            <div v-else class="hero-cover-fallback" aria-hidden="true">
              <span></span>
            </div>
          </div>

          <div class="hero-copy">
            <p class="hero-eyebrow">{{ caseItem.domain || 'GeoAI Case' }}</p>
            <h1 class="font-headline">{{ caseItem.title }}</h1>
            <p class="hero-summary">{{ caseItem.summary || caseItem.description || $t('casesView.noSummary') }}</p>

            <div class="hero-meta">
              <span>{{ $t('caseDetail.author') }}: {{ compactAuthorLine }}</span>
              <span>{{ $t('caseDetail.updated') }}: {{ caseItem.timeLabel || formattedPublishedAt }}</span>
              <span>{{ files.length }} {{ $t('caseDetail.files') }}</span>
            </div>

            <div class="hero-tags" v-if="caseTags.length">
              <span v-for="tag in caseTags" :key="tag">{{ tag }}</span>
            </div>
          </div>

          <aside class="hero-actions">
            <button class="action-btn primary" type="button" @click="runCase" :disabled="isRunning">
              {{ isRunning ? $t('caseDetail.running') : $t('caseDetail.runCase') }}
            </button>
            <button class="action-btn" type="button" @click="openCoreNotebook" :disabled="!selectedNotebookPath">
              {{ $t('caseDetail.previewNotebook') }}
            </button>
            <p v-if="actionStatus" class="action-status">{{ actionStatus }}</p>
          </aside>
        </section>
      </template>
    </section>

    <section v-if="caseItem" class="case-detail-shell detail-board">
      <article class="content-panel detail-main-panel">
        <div class="panel-heading">
          <span class="panel-menu-icon" aria-hidden="true"></span>
          <h2>{{ $t('caseDetail.overview') }}</h2>
        </div>

        <div class="overview-copy">
          <p>{{ caseItem.description || caseItem.summary || $t('casesView.noSummary') }}</p>
        </div>

        <div class="overview-grid">
          <div class="overview-block">
            <h3>{{ $t('caseDetail.steps') }}</h3>
            <ol v-if="caseSteps.length">
              <li v-for="step in caseSteps" :key="step">{{ step }}</li>
            </ol>
            <p v-else>{{ $t('caseDetail.none') }}</p>
          </div>

          <div class="overview-block">
            <h3>{{ $t('caseDetail.results') }}</h3>
            <ul v-if="expectedResults.length">
              <li v-for="item in expectedResults" :key="item">{{ item }}</li>
            </ul>
            <p v-else>{{ $t('caseDetail.none') }}</p>
          </div>
        </div>
      </article>

      <aside class="detail-sidebar">
        <section class="content-panel files-panel">
          <div class="side-heading">
            <h2>{{ $t('caseDetail.caseFiles') }}</h2>
            <p>{{ files.length }} {{ $t('caseDetail.files') }}</p>
          </div>

          <div class="file-list">
            <button v-for="file in files" :key="file.path" type="button" class="file-item"
              :class="{ active: selectedFile?.path === file.path }" @click="selectFile(file)">
              <span class="file-kind">{{ fileBadge(file) }}</span>
              <span class="file-name" :title="file.path">{{ file.path }}</span>
            </button>
          </div>
        </section>
      </aside>
    </section>

    <section v-if="caseItem" class="case-detail-shell preview-board">
      <article class="content-panel preview-panel">
        <div class="side-heading">
          <h2>{{ previewTitle }}</h2>
          <p>{{ selectedFile?.path || caseItem.coreNotebook || '' }}</p>
        </div>

        <div v-if="previewLoading" class="preview-state">
          <div class="spinner"></div>
          <p>{{ $t('caseDetail.loadingPreview') }}</p>
        </div>

        <div v-else-if="previewError" class="preview-state">
          <p>{{ previewError }}</p>
        </div>

        <div v-else-if="isNotebook" class="notebook-cells">
          <div v-for="(cell, index) in notebookCells" :key="`${selectedFile?.path}-${index}`"
            :class="['notebook-cell', cell.cell_type || 'code']">
            <div class="cell-header">
              <span>{{ cell.cell_type || 'cell' }}</span>
              <span>[{{ index + 1 }}]</span>
            </div>
            <pre class="cell-content"><code>{{ joinCellSource(cell.source) }}</code></pre>
          </div>
        </div>

        <pre v-else-if="fileContent" class="code-content"><code>{{ fileContent }}</code></pre>

        <div v-else class="preview-state">
          <p>{{ $t('caseDetail.noPreview') }}</p>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { notify } from '../utils/systemFeedback.js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const caseItem = ref(null)
const loading = ref(false)
const error = ref('')
const imageFailed = ref(false)
const files = ref([])
const selectedFile = ref(null)
const previewLoading = ref(false)
const previewError = ref('')
const fileContent = ref('')
const notebookCells = ref([])
const isRunning = ref(false)
const actionStatus = ref('')

const getToken = () => localStorage.getItem('jupyter_token')
const authAxios = () => {
  const token = getToken()
  return axios.create({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const fetchCase = async () => {
  loading.value = true
  error.value = ''
  imageFailed.value = false

  try {
    const response = await axios.get(`/api/cases/${encodeURIComponent(route.params.slug)}`)
    caseItem.value = response.data
    files.value = Array.isArray(response.data.files) ? response.data.files.filter(item => item.type !== 'folder') : []

    const preferredPath = caseItem.value?.coreNotebook
    const preferredFile = files.value.find(item => item.path === preferredPath)
      || files.value.find(item => item.path?.toLowerCase().endsWith('.ipynb'))
      || files.value[0]

    if (preferredFile) {
      await selectFile(preferredFile)
    }
  } catch (err) {
    console.error('Failed to fetch case detail:', err)
    caseItem.value = null
    files.value = []
    error.value = err.response?.data?.message || err.message || t('caseDetail.notFound')
  } finally {
    loading.value = false
  }
}

const caseTags = computed(() => {
  return Array.isArray(caseItem.value?.tags) ? caseItem.value.tags.filter(Boolean) : []
})

const caseSteps = computed(() => {
  return Array.isArray(caseItem.value?.steps) ? caseItem.value.steps.filter(Boolean) : []
})

const expectedResults = computed(() => {
  return Array.isArray(caseItem.value?.expectedResults) ? caseItem.value.expectedResults.filter(Boolean) : []
})

const compactAuthorLine = computed(() => {
  const value = String(caseItem.value?.authorLine || '').trim()
  return value || t('caseDetail.unknownAuthor')
})

const formattedPublishedAt = computed(() => {
  if (!caseItem.value?.publishedAt) {
    return '-'
  }

  const date = new Date(caseItem.value.publishedAt)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
})

const isNotebook = computed(() => {
  return selectedFile.value?.path?.toLowerCase().endsWith('.ipynb')
})

const previewTitle = computed(() => {
  return isNotebook.value ? t('caseDetail.notebookPreview') : t('caseDetail.filePreview')
})

const selectedNotebookPath = computed(() => {
  return selectedFile.value?.path || caseItem.value?.coreNotebook || ''
})

const joinCellSource = source => {
  if (Array.isArray(source)) {
    return source.join('')
  }
  return String(source || '')
}

const fileBadge = file => {
  const lowerPath = String(file?.path || '').toLowerCase()
  if (lowerPath.endsWith('.ipynb')) return 'NB'
  if (/\.(csv|json|geojson|txt|xml|nc|tif|tiff)$/i.test(lowerPath)) return 'DATA'
  if (/\.(py|js|ts|r|sh|m)$/i.test(lowerPath)) return 'CODE'
  if (/\.(zip|rar|7z|tar|gz)$/i.test(lowerPath)) return 'ZIP'
  return 'FILE'
}

const selectFile = async file => {
  if (!file?.path) {
    return
  }

  selectedFile.value = file
  previewLoading.value = true
  previewError.value = ''
  fileContent.value = ''
  notebookCells.value = []

  try {
    const response = await axios.get(`/api/cases/${encodeURIComponent(route.params.slug)}/content`, {
      params: { path: file.path }
    })

    if (file.path.toLowerCase().endsWith('.ipynb')) {
      const notebook = JSON.parse(response.data.content)
      notebookCells.value = Array.isArray(notebook.cells) ? notebook.cells : []
    } else {
      fileContent.value = response.data.content || ''
    }
  } catch (err) {
    previewError.value = err.response?.data?.message || err.message || t('caseDetail.previewError')
  } finally {
    previewLoading.value = false
  }
}

const openNotebookFromJupyterUrl = (url, token, notebookName, popupWindow) => {
  if (!url) return false

  const baseUrl = url.split('?')[0]
  let targetUrl = url

  if (notebookName) {
    if (token) {
      targetUrl = `${baseUrl}/tree/${encodeURIComponent(notebookName)}?token=${encodeURIComponent(token)}`
    } else {
      targetUrl = `${baseUrl}/tree/${encodeURIComponent(notebookName)}`
    }
  }

  if (popupWindow) {
    popupWindow.location.href = targetUrl
    return true
  }

  window.open(targetUrl, '_blank')
  return true
}

const runCase = async () => {
  if (!caseItem.value || isRunning.value) {
    return
  }

  if (!getToken()) {
    notify(t('caseDetail.loginFirst'), 'warning')
    router.push('/jupyter')
    return
  }

  isRunning.value = true
  actionStatus.value = t('caseDetail.preparing')
  const popupWindow = window.open('', '_blank')

  try {
    const forkResponse = await authAxios().post(`/api/cases/${encodeURIComponent(caseItem.value.slug)}/fork`)
    const projectName = forkResponse.data?.project?.name

    if (!projectName) {
      throw new Error('Fork succeeded but project name is missing.')
    }

    actionStatus.value = t('caseDetail.starting')
    const startResponse = await authAxios().post('/api/jupyter/start', {
      projectName,
      imageId: caseItem.value.runtimeImageId || 'geomodel-jupyter'
    })

    const status = startResponse.data?.status
    if (status !== 'started' && status !== 'already_running') {
      throw new Error(startResponse.data?.error || 'Failed to start runtime.')
    }

    openNotebookFromJupyterUrl(
      startResponse.data?.url,
      startResponse.data?.token,
      caseItem.value.coreNotebook,
      popupWindow
    )

    actionStatus.value = t('caseDetail.ready')
    router.push(`/jupyter/project/${encodeURIComponent(projectName)}`)
  } catch (err) {
    if (popupWindow) popupWindow.close()
    actionStatus.value = ''
    notify(err.response?.data?.error || err.message || t('caseDetail.runFailed'), 'error', { duration: 6000 })
  } finally {
    isRunning.value = false
    window.setTimeout(() => {
      actionStatus.value = ''
    }, 2600)
  }
}

const openCoreNotebook = async () => {
  if (!selectedNotebookPath.value) {
    return
  }
  const file = files.value.find(item => item.path === selectedNotebookPath.value)
  if (file) {
    await selectFile(file)
  }
  window.scrollTo({ top: document.body.scrollHeight * 0.42, behavior: 'smooth' })
}

watch(
  () => route.params.slug,
  () => {
    fetchCase()
  }
)

onMounted(() => {
  fetchCase()
})
</script>

<style scoped>
.case-detail-page {
  min-height: 100vh;
  padding-bottom: 4rem;
  background: var(--bg-color);
}

.case-detail-shell {
  width: min(100%, 1320px);
  margin: 0 auto;
  padding: 0 1.5rem;
}

.page-top {
  padding-top: 2.1rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 700;
}

.hero-panel {
  margin-top: 1.2rem;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 260px;
  gap: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
  box-shadow: none;
  padding: 1rem;
}

.hero-cover {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(0, 30, 64, 0.06);
}

.hero-cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.hero-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #111827;
}

.hero-cover-fallback span {
  width: 66px;
  height: 66px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.62);
}

.hero-copy {
  display: flex;
  flex-direction: column;
}

.hero-eyebrow {
  margin: 0;
  color: var(--accent-color);
  font-size: 0.84rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero-copy h1 {
  margin: 0.4rem 0 0;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.05;
}

.hero-summary {
  margin: 1rem 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.hero-meta {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.hero-meta span,
.hero-tags span {
  border-radius: 3px;
  padding: 0.42rem 0.68rem;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.hero-tags {
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.action-btn {
  min-height: 48px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-weight: 850;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.action-btn:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f8fafc;
  color: #0f172a;
}

.action-btn.primary {
  border-color: #0f172a;
  background: #0f172a;
  color: #fff;
}

.action-btn.primary:hover:not(:disabled) {
  background: #111827;
  border-color: #111827;
  box-shadow: none;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-status {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.detail-board,
.preview-board {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 1rem;
}

.preview-board {
  grid-template-columns: 1fr;
}

.content-panel {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
  box-shadow: none;
  padding: 1rem;
}

.panel-heading,
.side-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-heading h2,
.side-heading h2 {
  margin: 0;
  font-size: 1.08rem;
}

.panel-heading p,
.side-heading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.panel-menu-icon {
  width: 18px;
  height: 14px;
  display: inline-block;
  border-top: 2px solid rgba(0, 104, 118, 0.72);
  border-bottom: 2px solid rgba(0, 104, 118, 0.72);
  position: relative;
  margin-right: 0.7rem;
}

.panel-menu-icon::after {
  content: '';
  position: absolute;
  inset: 4px 0;
  border-top: 2px solid rgba(0, 104, 118, 0.72);
}

.detail-main-panel {
  min-height: 100%;
}

.overview-copy p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.75;
}

.overview-grid {
  margin-top: 1.2rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.overview-block {
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 0.95rem;
  background: rgba(244, 247, 252, 0.68);
}

.overview-block h3 {
  margin: 0 0 0.65rem;
  font-size: 0.96rem;
}

.overview-block p,
.overview-block li {
  color: var(--text-secondary);
  font-size: 0.94rem;
}

.overview-block ol,
.overview-block ul {
  margin: 0;
  padding-left: 1.2rem;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #ffffff;
  padding: 0.72rem 0.8rem;
  cursor: pointer;
  text-align: left;
}

.file-item.active {
  border-color: #9aa7ba;
  background: #f1f5f9;
}

.file-kind {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  min-height: 28px;
  padding: 0 0.45rem;
  border-radius: 3px;
  background: #eef2f7;
  color: var(--text-primary);
  font-size: 0.72rem;
  font-weight: 800;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.preview-state,
.detail-state {
  min-height: 240px;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  text-align: center;
  color: var(--text-secondary);
}

.detail-state button {
  min-height: 42px;
  padding: 0 1rem;
  border: 1px solid #0f172a;
  border-radius: 4px;
  background: #0f172a;
  color: #fff;
  font-weight: 850;
  cursor: pointer;
}

.notebook-cells {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notebook-cell,
.code-content {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  background: rgba(248, 250, 253, 0.94);
}

.cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
}

.cell-content,
.code-content {
  margin: 0;
  padding: 1rem;
  overflow-x: auto;
  font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
  font-size: 0.86rem;
  line-height: 1.65;
  color: var(--text-primary);
}

.notebook-cell.markdown {
  background: #ffffff;
}

.notebook-cell.markdown .cell-content {
  white-space: pre-wrap;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 104, 118, 0.16);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {

  .hero-panel,
  .detail-board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .case-detail-shell {
    padding: 0 1rem;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
