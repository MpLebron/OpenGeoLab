<template>
  <div class="case-library-page" :class="{ embedded: props.embedded }">
    <header v-if="!props.embedded" class="library-nav">
      <div class="nav-left">
        <button class="back-btn" @click="goBack">
          <span>&larr;</span>
          <span>Back to Dashboard</span>
        </button>
      </div>
      <div class="nav-center">
        <h1>Case Library</h1>
      </div>
      <div class="nav-right"></div>
    </header>

    <main class="library-content">
      <section v-if="!props.embedded" class="library-hero">
        <div class="hero-left">
          <p class="hero-kicker">Public Workflow Library</p>
          <h2>Discover reusable geoscience projects</h2>
          <p class="hero-subtitle">
            Browse public runnable projects, curated cases, datasets, and notebooks shared by the community.
          </p>
        </div>
      </section>

      <section class="toolbar-panel" aria-label="Case search and sorting">
        <div class="toolbar-left">
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="Search by project, tag, scenario, or owner"
          >
        </div>
        <div class="toolbar-right">
          <span class="case-count-label">{{ resultCountLabel }}</span>
          <label class="sort-label" for="sortBy">Sort</label>
          <select id="sortBy" v-model="sortBy" class="sort-select">
            <option value="updated">Recently updated</option>
            <option value="files">Most files</option>
            <option value="size">Largest size</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </section>

      <section class="case-directory" aria-label="Public runnable cases">
        <div v-if="loading" class="case-list-state">
          <span class="case-list-spinner"></span>
          <p>Loading cases...</p>
        </div>

        <div v-else-if="error" class="case-list-state">
          <p>{{ error }}</p>
          <button type="button" class="case-list-retry" @click="loadCases">Retry</button>
        </div>

        <div v-else-if="!filteredCases.length" class="case-list-state">
          <p>{{ searchQuery.trim() ? 'No matching cases' : 'No cases found yet' }}</p>
          <span>Cases appear after a project is published to the Case Library.</span>
        </div>

        <div v-else class="case-table">
          <div class="case-table-header" aria-hidden="true">
            <span>Case</span>
            <span>Tags</span>
            <span>Files</span>
            <span>Size</span>
            <span>Runtime</span>
            <span>Owner</span>
            <span>Updated</span>
            <span></span>
          </div>

          <article
            v-for="item in visibleCases"
            :key="caseKey(item)"
            class="case-row"
            @dblclick="openCase(item)"
          >
            <button class="case-main" type="button" @click="openCase(item)">
              <span class="case-thumbnail" :title="caseThumbnailTitle(item)">
                <img
                  v-if="caseThumbnailSrc(item)"
                  :src="caseThumbnailSrc(item)"
                  :alt="caseThumbnailAlt(item)"
                  loading="lazy"
                >
                <span v-else class="case-thumbnail-fallback">
                  <span>{{ caseMarkLabel(item) }}</span>
                </span>
              </span>

              <span class="case-copy">
                <span class="case-title-line">
                  <strong>{{ caseTitle(item) }}</strong>
                  <span v-if="item.isCase" class="case-status-badge">Case</span>
                </span>
                <span class="case-summary">{{ caseSummary(item) }}</span>
              </span>
            </button>

            <div class="case-tags-column">
              <span
                v-for="tag in caseTags(item)"
                :key="`${caseKey(item)}-${tag}`"
                class="case-tag"
              >
                {{ tag }}
              </span>
              <span v-if="!caseTags(item).length" class="case-muted">No tags</span>
            </div>

            <div class="case-data-column">
              <span>Files</span>
              <strong>{{ Number(item.fileCount || 0) }}</strong>
            </div>

            <div class="case-data-column">
              <span>Size</span>
              <strong>{{ caseSize(item) }}</strong>
            </div>

            <div class="case-data-column runtime">
              <span>Runtime</span>
              <strong :title="caseRuntimeFull(item)">{{ caseRuntime(item) }}</strong>
            </div>

            <div class="case-data-column owner">
              <span>Owner</span>
              <strong>
                <span class="owner-avatar" aria-hidden="true">{{ ownerInitials(item) }}</span>
                <span class="owner-name">@{{ ownerLabel(item) }}</span>
              </strong>
            </div>

            <div class="case-data-column">
              <span>Updated</span>
              <strong>{{ caseUpdated(item) }}</strong>
            </div>

            <div class="case-actions">
              <button
                type="button"
                class="case-action-btn"
                aria-label="Open case"
                data-tooltip="Open case"
                @click.stop="openCase(item)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                  <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                  <path d="M2.5 12C3.8 8 7.6 5 12 5s8.2 3 9.5 7c-1.3 4-5.1 7-9.5 7s-8.2-3-9.5-7z"/>
                </svg>
              </button>
              <button
                v-if="canForkCase(item)"
                type="button"
                class="case-action-btn"
                aria-label="Fork case"
                data-tooltip="Fork to My Space"
                @click.stop="forkCaseProject(item)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                  <path d="M7 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 9v3a4 4 0 0 0 4 4h4"/>
                  <path d="M17 5v10"/>
                </svg>
              </button>
            </div>
          </article>
        </div>

        <footer v-if="filteredCases.length" class="case-pagination-footer">
          <span>{{ pageRangeLabel }}</span>
          <PaginationControl
            v-if="totalPages > 1"
            :current-page="currentPage"
            :total-pages="totalPages"
            previous-label="Previous cases page"
            next-label="Next cases page"
            @change="currentPage = $event"
          />
        </footer>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import PaginationControl from '../components/PaginationControl.vue'
import {
  buildWorkspaceProjectRoutePath,
  formatWorkspaceProjectSize,
  getWorkspaceProjectOwnerInitials,
  getWorkspaceProjectOwnerLabel,
  getWorkspaceProjectRuntimeImage,
  getWorkspaceProjectRuntimeLabel,
  getWorkspaceProjectSearchText,
  getWorkspaceProjectSummary,
  getWorkspaceProjectTags,
  getWorkspaceProjectThumbnailDownloadPath,
  getWorkspaceProjectTitle
} from '../utils/workspaceProjectDisplay.js'
import { confirmDialog, notify } from '../utils/systemFeedback.js'
import { createApiClient } from '../utils/apiClient.js'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const loading = ref(true)
const error = ref('')
const cases = ref([])
const currentUsername = ref('')
const searchQuery = ref('')
const sortBy = ref('updated')
const currentPage = ref(1)
const pageSize = 10
const thumbnailUrls = ref({})
const thumbnailRequests = new Set()

const getToken = () => {
  try {
    return window.localStorage?.getItem('jupyter_token') || ''
  } catch (error) {
    return ''
  }
}
const authAxios = () => {
  const token = getToken()
  return createApiClient({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const loadCases = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await authAxios().get('/api/jupyter/cases')
    cases.value = res.data.cases || []
  } catch (e) {
    error.value = 'Failed to load projects: ' + (e.response?.data?.error || e.message)
  } finally {
    loading.value = false
  }
}

const loadCurrentUser = async () => {
  try {
    const res = await authAxios().get('/api/auth/me')
    currentUsername.value = res.data?.username || ''
  } catch (e) {
    currentUsername.value = ''
  }
}

const sortedCases = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  let result = cases.value.filter(item => {
    if (!query) return true
    return getWorkspaceProjectSearchText(item).includes(query)
  })

  result = [...result]
  if (sortBy.value === 'files') {
    result.sort((a, b) => (b.fileCount || 0) - (a.fileCount || 0))
  } else if (sortBy.value === 'size') {
    result.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))
  } else if (sortBy.value === 'title') {
    result.sort((a, b) => getWorkspaceProjectTitle(a).localeCompare(getWorkspaceProjectTitle(b)))
  } else {
    result.sort((a, b) => new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0))
  }

  return result.map(item => ({
    ...item,
    isPublic: true
  }))
})

const filteredCases = sortedCases

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCases.value.length / pageSize)))

const visibleCases = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredCases.value.slice(start, start + pageSize)
})

const resultCountLabel = computed(() => {
  const count = filteredCases.value.length
  return `${count} case${count === 1 ? '' : 's'}`
})

const pageRangeLabel = computed(() => {
  const total = filteredCases.value.length
  if (!total) return 'No cases'
  const start = (currentPage.value - 1) * pageSize + 1
  const end = Math.min(start + pageSize - 1, total)
  return `Showing ${start}-${end} of ${total}`
})

const caseKey = (item = {}) => `${item.owner || 'unknown'}/${item.projectName || item.name || item.projectId || 'case'}`
const caseTitle = getWorkspaceProjectTitle
const caseSummary = getWorkspaceProjectSummary
const caseTags = item => getWorkspaceProjectTags(item, 4)
const ownerLabel = getWorkspaceProjectOwnerLabel
const ownerInitials = getWorkspaceProjectOwnerInitials
const caseRuntime = item => getWorkspaceProjectRuntimeLabel(item)
const caseRuntimeFull = item => getWorkspaceProjectRuntimeImage(item) || '-'
const caseSize = item => formatWorkspaceProjectSize(item.sizeBytes)
const caseMarkLabel = item => (item.isCase ? 'CASE' : 'WS')
const caseUpdated = (item = {}) => {
  const value = item.modifiedAt || item.updatedAt || item.createdAt
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}

const caseThumbnailTitle = (item = {}) => item.thumbnail?.name ? `Result thumbnail: ${item.thumbnail.name}` : 'No result thumbnail'
const caseThumbnailAlt = (item = {}) => `${caseTitle(item)} result thumbnail`
const caseThumbnailSrc = (item = {}) => thumbnailUrls.value[caseKey(item)] || ''

const canForkCase = (item = {}) => !currentUsername.value || item.owner !== currentUsername.value

const openCase = (item) => {
  router.push(`/jupyter/cases/${encodeURIComponent(item.owner)}/${encodeURIComponent(item.projectName)}`)
}

const forkCaseProject = async (project) => {
  const title = getWorkspaceProjectTitle(project)
  const confirmed = await confirmDialog({
    title: 'Fork case',
    message: `Create a private copy of "${title}" in My Space?`,
    confirmText: 'Fork to My Space'
  })
  if (!confirmed) return

  try {
    const res = await authAxios().post(
      `/api/jupyter/fork/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.projectName)}`
    )
    const forkedProject = res.data?.project
    if (forkedProject?.name) {
      router.push(buildWorkspaceProjectRoutePath(forkedProject))
      return
    }
    router.push('/jupyter')
  } catch (e) {
    notify(e.response?.data?.error || e.message || 'Failed to fork project.', 'error', { duration: 6000 })
  }
}

const goBack = () => {
  router.push('/jupyter')
}

const loadThumbnailForCase = async (project) => {
  const downloadPath = getWorkspaceProjectThumbnailDownloadPath(project)
  const key = caseKey(project)
  if (!downloadPath || thumbnailUrls.value[key] || thumbnailRequests.has(key)) return

  thumbnailRequests.add(key)
  try {
    const response = await authAxios().get(downloadPath, { responseType: 'blob' })
    const blob = response.data
    if (!blob || !String(blob.type || '').startsWith('image/')) return
    const objectUrl = URL.createObjectURL(blob)
    thumbnailUrls.value = {
      ...thumbnailUrls.value,
      [key]: objectUrl
    }
  } catch (error) {
    console.warn('Failed to load case thumbnail:', key, error?.message || error)
  } finally {
    thumbnailRequests.delete(key)
  }
}

const loadVisibleThumbnails = () => {
  for (const project of visibleCases.value) {
    loadThumbnailForCase(project)
  }
}

watch([searchQuery, sortBy], () => {
  currentPage.value = 1
})

watch(totalPages, (value) => {
  if (currentPage.value > value) currentPage.value = value
})

watch(visibleCases, () => {
  loadVisibleThumbnails()
})

onMounted(() => {
  Promise.all([
    loadCurrentUser(),
    loadCases()
  ]).then(loadVisibleThumbnails)
})

onBeforeUnmount(() => {
  for (const objectUrl of Object.values(thumbnailUrls.value)) {
    URL.revokeObjectURL(objectUrl)
  }
})
</script>

<style scoped>
.case-library-page {
  min-height: 100vh;
  background: #f4f6fa;
  color: #111827;
}

.case-library-page.embedded {
  min-height: auto;
  background: transparent;
}

.library-nav {
  height: 64px;
  background: #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.nav-center h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.back-btn {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: #fff;
  border-radius: 7px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.library-content {
  max-width: 1240px;
  margin: 0 auto;
  padding: 22px 18px;
}

.case-library-page.embedded .library-content {
  max-width: none;
  padding: 0;
}

.library-hero {
  border: none;
  border-bottom: 1px solid #d9dce8;
  border-radius: 0;
  background: transparent;
  padding: 0 0 1rem;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0;
}

.hero-kicker {
  margin: 0 0 0.48rem;
  color: #4f5b73;
  font-family: 'Manrope', sans-serif;
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-left h2 {
  margin: 0;
  color: #10182d;
  font-family: 'Manrope', sans-serif;
  font-size: 2.12rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.05;
}

.hero-subtitle {
  max-width: 760px;
  margin: 0.62rem 0 0;
  color: #5b6680;
  font-size: 0.92rem;
  font-weight: 650;
  line-height: 1.45;
}

.toolbar-panel {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  margin-bottom: 1rem;
  border: none;
  border-bottom: 1px solid #d9dce8;
  border-radius: 0;
  background: transparent;
}

.case-library-page.embedded .toolbar-panel {
  padding: 0 0 1rem;
  margin-bottom: 1rem;
}

.toolbar-left {
  flex: 1;
}

.search-input {
  width: 100%;
  max-width: 520px;
  height: 42px;
  padding: 0 0.9rem;
  border: 1px solid #c8d0e3;
  border-radius: 5px;
  background: transparent;
  color: #172037;
  font-size: 0.86rem;
  font-weight: 650;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.search-input:focus {
  border-color: #7da0ea;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 3px rgba(47, 108, 246, 0.12);
}

.toolbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
}

.case-count-label {
  color: #4f5b73;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
}

.sort-label {
  color: #4f5b73;
  font-size: 0.8rem;
  font-weight: 900;
}

.sort-select {
  height: 42px;
  padding: 0 0.75rem;
  border: 1px solid #c8d0e3;
  border-radius: 5px;
  background: transparent;
  color: #172037;
  font-family: 'Manrope', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  outline: none;
}

.case-directory {
  display: grid;
  gap: 0.9rem;
}

.case-table {
  display: grid;
  gap: 0.55rem;
}

.case-table-header,
.case-row {
  display: grid;
  grid-template-columns:
    minmax(340px, 1fr)
    minmax(150px, 0.28fr)
    76px
    90px
    minmax(128px, 0.18fr)
    minmax(150px, 0.2fr)
    94px
    72px;
  align-items: center;
  column-gap: 0.85rem;
}

.case-table-header {
  min-height: 34px;
  padding: 0 1rem;
  color: #7a8498;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.case-row {
  min-height: 124px;
  padding: 0.92rem 1rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.case-row:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.36);
}

.case-main {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  align-items: center;
  gap: 0.95rem;
  min-width: 0;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.case-thumbnail {
  position: relative;
  width: 128px;
  height: 82px;
  overflow: hidden;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: #eef2f7;
}

.case-thumbnail img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.case-thumbnail-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e8eefb, #f8fafc);
  color: #172037;
}

.case-thumbnail-fallback span {
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.case-copy {
  min-width: 0;
  display: grid;
  gap: 0.42rem;
}

.case-title-line {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.case-title-line strong {
  min-width: 0;
  overflow: hidden;
  color: #171d31;
  font-family: 'Manrope', sans-serif;
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-status-badge {
  flex: 0 0 auto;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 0.5rem;
  border: 1px solid #f0d7ae;
  border-radius: 3px;
  background: #fff0d6;
  color: #815100;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.case-summary {
  display: -webkit-box;
  overflow: hidden;
  color: #4f5668;
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.38;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.case-tags-column {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.34rem;
  min-width: 0;
}

.case-tag {
  max-width: 100%;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 0.48rem;
  border: 1px solid #cbd2e5;
  border-radius: 3px;
  background: rgba(232, 239, 255, 0.55);
  color: #25324a;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-muted {
  color: #8b95a8;
  font-size: 0.78rem;
  font-weight: 700;
}

.case-data-column {
  min-width: 0;
  display: grid;
  gap: 0.26rem;
  align-content: center;
}

.case-data-column > span {
  display: none;
  color: #8b95a8;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.case-data-column strong {
  min-width: 0;
  overflow: hidden;
  color: #171d31;
  font-size: 0.82rem;
  font-weight: 850;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-data-column.runtime strong {
  color: #29344d;
}

.case-data-column.owner strong {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.owner-avatar {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #bdc8df;
  border-radius: 50%;
  background: #e8effc;
  color: #172037;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.owner-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
}

.case-action-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #4f586d;
  cursor: pointer;
}

.case-action-btn svg {
  width: 17px;
  height: 17px;
}

.case-action-btn:hover {
  background: #e6ebfb;
  color: #171d31;
}

.case-action-btn::before,
.case-action-btn::after {
  position: absolute;
  left: 50%;
  z-index: 30;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.case-action-btn::before {
  content: attr(data-tooltip);
  bottom: calc(100% + 9px);
  width: max-content;
  max-width: 180px;
  padding: 5px 8px;
  border-radius: 4px;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 760;
  line-height: 1.2;
  white-space: nowrap;
}

.case-action-btn::after {
  content: '';
  bottom: calc(100% + 4px);
  width: 8px;
  height: 8px;
  background: #0f172a;
  transform: translate(-50%, 4px) rotate(45deg);
}

.case-action-btn:hover::before,
.case-action-btn:focus-visible::before,
.case-action-btn:hover::after,
.case-action-btn:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.case-action-btn:hover::after,
.case-action-btn:focus-visible::after {
  transform: translate(-50%, 0) rotate(45deg);
}

.case-pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0 0;
  color: #4f5b73;
  font-size: 0.82rem;
  font-weight: 800;
}

.case-pagination-footer :deep(.pagination-control) {
  margin-top: 0;
}

.case-pagination-footer :deep(.pagination-nav),
.case-pagination-footer :deep(.pagination-page) {
  min-width: 34px;
  height: 34px;
  font-size: 0.78rem;
}

.case-pagination-footer :deep(.pagination-nav) {
  font-size: 1.25rem;
}

.case-list-state {
  min-height: 260px;
  display: grid;
  place-items: center;
  gap: 0.72rem;
  border: 1px dashed #cfd4e5;
  border-radius: 5px;
  background: transparent;
  color: #64748b;
  text-align: center;
}

.case-list-state p {
  margin: 0;
  color: #26364f;
  font-weight: 800;
}

.case-list-state span {
  color: #64748b;
  font-size: 0.85rem;
}

.case-list-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #d7dce5;
  border-top-color: #2f6cf6;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.case-list-retry {
  border: none;
  border-radius: 5px;
  background: #2f6cf6;
  color: #fff;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  font-weight: 800;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .library-hero {
    flex-direction: column;
  }

  .hero-left h2 {
    font-size: 24px;
  }

  .toolbar-panel {
    grid-template-columns: 1fr;
  }

  .search-input {
    max-width: 100%;
  }

  .toolbar-right {
    justify-content: space-between;
  }

  .case-table-header {
    display: none;
  }

  .case-row {
    grid-template-columns: 1fr;
    row-gap: 0.8rem;
  }

  .case-main {
    grid-template-columns: 116px minmax(0, 1fr);
  }

  .case-thumbnail {
    width: 116px;
    height: 76px;
  }

  .case-tags-column,
  .case-actions {
    justify-content: flex-start;
  }

  .case-data-column {
    grid-template-columns: 88px minmax(0, 1fr);
    align-items: center;
    min-height: 28px;
    padding-top: 0.25rem;
    border-top: 1px solid #d9dce8;
  }

  .case-data-column > span {
    display: block;
  }

  .case-pagination-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .library-content {
    padding: 14px;
  }

  .library-nav {
    padding: 0 10px;
  }

  .nav-center h1 {
    font-size: 18px;
  }
}

@media (max-width: 560px) {
  .toolbar-right {
    align-items: stretch;
    flex-direction: column;
  }

  .case-main {
    grid-template-columns: 1fr;
  }

  .case-thumbnail {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .case-title-line {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
