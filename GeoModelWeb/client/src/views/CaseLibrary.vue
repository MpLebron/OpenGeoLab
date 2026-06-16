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

      <section class="toolbar-panel">
        <div class="toolbar-left">
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="Search by project, tag, scenario, or owner"
          >
        </div>
        <div class="toolbar-right">
          <label class="sort-label" for="sortBy">Sort</label>
          <select id="sortBy" v-model="sortBy" class="sort-select">
            <option value="updated">Recently updated</option>
            <option value="files">Most files</option>
            <option value="size">Largest size</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>
      </section>

      <WorkspaceProjectList
        :items="visibleCases"
        :actions="caseLibraryActions"
        :loading="loading"
        :error="error"
        :empty-title="searchQuery.trim() ? 'No matching cases' : 'No cases found yet'"
        empty-hint="Cases appear after a project is published to the Case Library."
        loading-text="Loading cases..."
        show-owner
        :show-created="false"
        @open="openCase"
        @action="handleCaseLibraryAction"
        @retry="loadCases"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import WorkspaceProjectList from '../components/WorkspaceProjectList.vue'
import {
  buildWorkspaceProjectRoutePath,
  getWorkspaceProjectSearchText,
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

const caseLibraryActions = [
  { key: 'open', title: 'Open project', icon: 'open' },
  {
    key: 'fork',
    title: 'Fork to my space',
    icon: 'fork',
    visible: project => !currentUsername.value || project.owner !== currentUsername.value
  }
]

const getToken = () => localStorage.getItem('jupyter_token')
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

const visibleCases = computed(() => {
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

const openCase = (item) => {
  router.push(`/jupyter/cases/${encodeURIComponent(item.owner)}/${encodeURIComponent(item.projectName)}`)
}

const handleCaseLibraryAction = ({ action, project }) => {
  if (action === 'open') return openCase(project)
  if (action === 'fork') return forkCaseProject(project)
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

onMounted(() => {
  Promise.all([
    loadCurrentUser(),
    loadCases()
  ])
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
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  gap: 8px;
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

@media (max-width: 900px) {
  .library-hero {
    flex-direction: column;
  }

  .hero-left h2 {
    font-size: 24px;
  }

  .toolbar-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    max-width: 100%;
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
</style>
