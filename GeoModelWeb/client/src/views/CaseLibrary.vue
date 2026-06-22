<template>
  <div class="case-library-page" :class="{ embedded: props.embedded }">
    <header v-if="!props.embedded" class="library-nav">
      <div class="nav-left">
        <button class="back-btn" @click="goBack">
          <AppIcon name="arrowLeft" :size="16" :stroke-width="2" />
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
        <div class="hero-controls" aria-label="Case search and sorting">
          <div class="toolbar-left">
            <StyledSearch
              ref="searchInputRef"
              v-model="searchQueryModel"
              class="case-search-control"
              placeholder="Search by project, tag, scenario, or owner"
              shortcut-label="⌘ K"
            />
          </div>
          <div class="toolbar-right">
            <label class="sort-label" for="case-library-sort">Sort by</label>
            <StyledSelect
              id="case-library-sort"
              v-model="sortByModel"
              class="case-sort-select-wrap"
              :options="caseSortOptions"
              aria-label="Sort cases"
            />
          </div>
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
          <p>{{ searchQueryModel.trim() ? 'No matching cases' : 'No cases found yet' }}</p>
          <span>Cases appear after a project is published to the Case Library.</span>
        </div>

        <div v-else class="case-table">
          <div class="case-table-header" aria-hidden="true">
            <span>Case</span>
            <span>Files</span>
            <span>Size</span>
            <span>Based on</span>
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
                <span v-if="caseTags(item).length" class="case-inline-tags">
                  <span
                    v-for="tag in caseTags(item)"
                    :key="`${caseKey(item)}-${tag}`"
                    class="case-tag"
                  >
                    {{ tag }}
                  </span>
                </span>
              </span>
            </button>

            <div class="case-data-column">
              <span>Files</span>
              <strong class="case-file-count">
                <AppIcon name="fileText" :size="15" :stroke-width="1.8" />
                <span>{{ caseFileCountLabel(item) }}</span>
              </strong>
            </div>

            <div class="case-data-column">
              <span>Size</span>
              <strong>{{ caseSize(item) }}</strong>
            </div>

            <div class="case-data-column runtime">
              <span>Based on</span>
              <strong :title="caseRuntimeFull(item)">{{ caseRuntimeFull(item) }}</strong>
            </div>

            <div class="case-data-column owner">
              <span>Owner</span>
              <strong>
                <span class="owner-avatar" aria-hidden="true">
                  <img
                    :src="ownerAvatarSrc(item)"
                    :alt="`${ownerLabel(item)} avatar`"
                    loading="lazy"
                    @error="markOwnerAvatarFailed(item)"
                  >
                </span>
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
                <AppIcon name="eye" :size="16" :stroke-width="1.8" />
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
import StyledSearch from '../components/StyledSearch.vue'
import StyledSelect from '../components/StyledSelect.vue'
import AppIcon from '../components/AppIcon.vue'
import {
  formatWorkspaceProjectSize,
  getWorkspaceProjectOwnerAvatarUrl,
  getWorkspaceProjectOwnerLabel,
  getWorkspaceProjectRuntimeImage,
  getWorkspaceProjectRuntimeLabel,
  getWorkspaceProjectSearchText,
  getWorkspaceProjectSummary,
  getWorkspaceProjectTags,
  getWorkspaceProjectThumbnailDownloadPath,
  getWorkspaceProjectTitle
} from '../utils/workspaceProjectDisplay.js'
import { createApiClient, resolvePublicResourceUrl } from '../utils/apiClient.js'
import { CASE_SORT_OPTIONS } from '../utils/caseSortOptions.js'
import { buildGithubStyleIdenticonDataUri } from '../utils/generatedAvatar.js'

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false
  },
  searchQuery: {
    type: String,
    default: ''
  },
  sortBy: {
    type: String,
    default: 'updated'
  }
})

const emit = defineEmits(['update:searchQuery', 'update:sortBy', 'result-count-change'])

const router = useRouter()
const loading = ref(true)
const error = ref('')
const cases = ref([])
const localSearchQuery = ref(props.searchQuery)
const searchInputRef = ref(null)
const localSortBy = ref(props.sortBy || 'updated')
const caseSortOptions = CASE_SORT_OPTIONS
const currentPage = ref(1)
const pageSize = 10
const thumbnailUrls = ref({})
const thumbnailRequests = new Set()
const avatarFailures = ref({})

const searchQueryModel = computed({
  get: () => localSearchQuery.value,
  set: value => {
    localSearchQuery.value = value
    emit('update:searchQuery', value)
  }
})

const sortByModel = computed({
  get: () => localSortBy.value,
  set: value => {
    localSortBy.value = value
    emit('update:sortBy', value)
  }
})

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

const sortedCases = computed(() => {
  const query = searchQueryModel.value.trim().toLowerCase()

  let result = cases.value.filter(item => {
    if (!query) return true
    return getWorkspaceProjectSearchText(item).includes(query)
  })

  result = [...result]
  if (sortByModel.value === 'files') {
    result.sort((a, b) => (b.fileCount || 0) - (a.fileCount || 0))
  } else if (sortByModel.value === 'size') {
    result.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))
  } else if (sortByModel.value === 'title') {
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
const caseRuntimeFull = item => getWorkspaceProjectRuntimeImage(item) || getWorkspaceProjectRuntimeLabel(item) || '-'
const caseSize = item => formatWorkspaceProjectSize(item.sizeBytes)
const caseFileCountLabel = (item = {}) => {
  const count = Number(item.fileCount || 0)
  return `${count} file${count === 1 ? '' : 's'}`
}
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
const ownerAvatarSrc = (item = {}) => {
  const key = caseKey(item)
  const avatarUrl = getWorkspaceProjectOwnerAvatarUrl(item)
  if (avatarUrl && !avatarFailures.value[key]) {
    return resolvePublicResourceUrl(avatarUrl)
  }

  return buildGithubStyleIdenticonDataUri(ownerLabel(item))
}

const markOwnerAvatarFailed = (item = {}) => {
  avatarFailures.value = {
    ...avatarFailures.value,
    [caseKey(item)]: true
  }
}

const openCase = (item) => {
  router.push(`/jupyter/cases/${encodeURIComponent(item.owner)}/${encodeURIComponent(item.projectName)}`)
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

watch(() => props.searchQuery, value => {
  const nextValue = value || ''
  if (nextValue !== localSearchQuery.value) {
    localSearchQuery.value = nextValue
  }
})

watch(() => props.sortBy, value => {
  const nextValue = value || 'updated'
  if (nextValue !== localSortBy.value) {
    localSortBy.value = nextValue
  }
})

watch([searchQueryModel, sortByModel], () => {
  currentPage.value = 1
})

watch(totalPages, (value) => {
  if (currentPage.value > value) currentPage.value = value
})

watch(visibleCases, () => {
  loadVisibleThumbnails()
})

watch(() => filteredCases.value.length, value => {
  emit('result-count-change', value)
}, { immediate: true })

const focusCaseSearch = () => {
  if (!searchInputRef.value) return false
  searchInputRef.value.focus()
  searchInputRef.value.select?.()
  return true
}

const handleSearchShortcut = event => {
  const isSearchShortcut = (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key?.toLowerCase() === 'k'

  if (!isSearchShortcut || !focusCaseSearch()) return
  event.preventDefault()
}

onMounted(() => {
  loadCases().then(loadVisibleThumbnails)
  window.addEventListener('keydown', handleSearchShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSearchShortcut)
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
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(520px, 0.82fr);
  align-items: start;
  gap: 1.25rem;
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

.hero-controls {
  display: grid;
  grid-template-columns: minmax(280px, 420px) auto;
  align-items: center;
  justify-content: end;
  gap: 0.75rem;
  padding-top: 0.12rem;
}

.toolbar-left {
  flex: 1;
}

.case-search-control {
  width: 100%;
}

.toolbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
}

.sort-label {
  color: #4d5a70;
  font-size: 0.9rem;
  font-weight: 900;
  white-space: nowrap;
}

.case-sort-select-wrap {
  position: relative;
  min-width: 210px;
  display: block;
}

.case-directory {
  display: grid;
  gap: 0.45rem;
}

.case-table {
  --case-grid-columns:
    minmax(560px, 1fr)
    96px
    112px
    minmax(170px, 0.24fr)
    minmax(150px, 0.2fr)
    108px
    96px;

  display: grid;
  gap: 0.48rem;
}

.case-table-header,
.case-row {
  display: grid;
  grid-template-columns: var(--case-grid-columns);
  align-items: center;
  column-gap: 1.25rem;
}

.case-table-header {
  min-height: 58px;
  padding: 0 1.35rem;
  border-bottom: 1px solid #dfe4ef;
  color: #707b91;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.085em;
  text-transform: uppercase;
}

.case-row {
  min-height: 124px;
  padding: 0.92rem 1.35rem;
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
  gap: 0.44rem;
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

.case-inline-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.34rem;
  min-width: 0;
  min-height: 22px;
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

.case-file-count {
  display: inline-flex;
  align-items: center;
  gap: 0.48rem;
}

.case-file-count svg {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  color: #3f4658;
}

.case-data-column.runtime strong {
  color: #29344d;
  line-height: 1.4;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
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
  overflow: hidden;
}

.owner-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.owner-avatar span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  justify-content: center;
}

.case-action-btn {
  position: relative;
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dfe5ee;
  border-radius: 12px;
  background: #ffffff;
  color: #31394a;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.case-action-btn svg {
  width: 22px;
  height: 22px;
}

.case-action-btn:hover {
  border-color: #c6d0e1;
  background: #f8fafc;
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

@media (max-width: 1360px) {
  .library-hero {
    grid-template-columns: 1fr;
  }

  .hero-controls {
    justify-content: start;
  }
}

@media (max-width: 900px) {
  .library-hero {
    grid-template-columns: 1fr;
  }

  .hero-left h2 {
    font-size: 24px;
  }

  .hero-controls {
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
