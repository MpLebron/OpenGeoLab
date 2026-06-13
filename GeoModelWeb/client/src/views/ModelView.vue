<template>
  <div class="catalog-page">
    <div class="catalog-shell">
      <aside class="catalog-sidebar">
        <h2 class="catalog-sidebar-title font-headline">Repository Filters</h2>

        <div class="catalog-filter-block">
          <button
            :class="['catalog-filter-item', { active: activeDomain === 'all' }]"
            @click="selectDomain('all')"
          >
            <span v-if="activeDomain === 'all'" class="catalog-filter-indicator"></span>
            <span>All Models</span>
            <strong>{{ facetTotal || total || 0 }}</strong>
          </button>

          <button
            v-for="option in domainOptions"
            :key="option.label"
            :class="['catalog-filter-item', { active: activeDomain === option.label }]"
            @click="selectDomain(option.label)"
          >
            <span v-if="activeDomain === option.label" class="catalog-filter-indicator"></span>
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </div>

        <div class="catalog-status-block">
          <p class="catalog-label">Status</p>

          <label class="catalog-check">
            <input v-model="filterOnline" type="checkbox">
            <span>Online &amp; Ready</span>
          </label>
          <label class="catalog-check">
            <input v-model="filterPublic" type="checkbox">
            <span>Public Access</span>
          </label>
          <label class="catalog-check">
            <input v-model="filterInstitutional" type="checkbox">
            <span>Institutional Only</span>
          </label>
        </div>

      </aside>

      <section class="catalog-main">
        <header class="catalog-header">
          <div class="catalog-header-copy">
            <h1 class="font-headline">{{ $t('ogmsModelView.title') }}</h1>
            <p>{{ $t('ogmsModelView.subtitle') }}</p>
          </div>

          <div class="catalog-search">
            <span class="catalog-search-icon">⌕</span>
            <input
              v-model="searchQuery"
              @keyup.enter="handleSearch"
              type="text"
              :placeholder="$t('ogmsModelView.searchPlaceholder')"
            >
          </div>
        </header>

        <div v-if="loading && !models.length" class="catalog-loading">
          <div class="spinner"></div>
          <p>{{ $t('ogmsModelView.loading') }}</p>
        </div>

        <div v-else class="catalog-list">
          <ModelCard
            v-for="model in models"
            :key="model.id"
            :model="model"
            @run="openRunModal"
          />

          <div v-if="!models.length" class="catalog-empty">
            <p>No models match the current filters.</p>
          </div>
        </div>

        <PaginationControl
          v-if="totalPages > 1"
          class="catalog-pagination"
          :current-page="currentPage"
          :total-pages="totalPages"
          :disabled="loading"
          :previous-label="$t('modelView.previous')"
          :next-label="$t('modelView.next')"
          @change="changePage"
        />
      </section>
    </div>

    <ModelRunModal
      :visible="showRunModal"
      :model="selectedModel"
      @close="closeRunModal"
      @execute="handleExecutionStart"
    />

    <ResultModal
      :visible="showResultModal"
      :result="executionResult"
      :title="`${selectedModel?.name || 'Model'} - Execution Result`"
      @close="closeResultModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import ModelCard from '../components/ModelCard.vue'
import ModelRunModal from '../components/ModelRunModal.vue'
import PaginationControl from '../components/PaginationControl.vue'
import ResultModal from '../components/ResultModal.vue'
import { notify } from '../utils/systemFeedback.js'

const searchQuery = ref('')
const models = ref([])
const loading = ref(false)
const currentPage = ref(1)
const total = ref(0)
const limit = 12
const facetTotal = ref(0)
const domainOptions = ref([])

const activeDomain = ref('all')
const filterOnline = ref(false)
const filterPublic = ref(false)
const filterInstitutional = ref(false)

const showRunModal = ref(false)
const selectedModel = ref(null)
const executing = ref(false)
const showResultModal = ref(false)
const executionResult = ref(null)
const taskInfo = ref(null)

const totalPages = computed(() => Math.ceil(total.value / limit))

const fetchModels = async (page = 1) => {
  loading.value = true
  try {
    const response = await axios.get('/api/ogms/models', {
      params: {
        page,
        limit,
        q: searchQuery.value,
        domain: activeDomain.value,
        online: filterOnline.value,
        public: filterPublic.value,
        institutional: filterInstitutional.value
      }
    })
    models.value = response.data.data
    total.value = response.data.total
    currentPage.value = response.data.page
  } catch (error) {
    console.error('Failed to fetch models:', error)
  } finally {
    loading.value = false
  }
}

const fetchModelFacets = async () => {
  try {
    const response = await axios.get('/api/ogms/models/facets', {
      params: {
        q: searchQuery.value,
        online: filterOnline.value,
        public: filterPublic.value,
        institutional: filterInstitutional.value
      }
    })

    facetTotal.value = response.data.total || 0
    domainOptions.value = Array.isArray(response.data.domains) ? response.data.domains : []
  } catch (error) {
    console.error('Failed to fetch model facets:', error)
    facetTotal.value = total.value
    domainOptions.value = []
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchModelFacets()
  fetchModels(1)
}

const selectDomain = (domain) => {
  activeDomain.value = domain
  currentPage.value = 1
  fetchModels(1)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    fetchModels(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const openRunModal = (model) => {
  selectedModel.value = model
  showRunModal.value = true
}

const closeRunModal = () => {
  showRunModal.value = false
  selectedModel.value = null
}

const handleExecutionStart = (result) => {
  taskInfo.value = result.data
  pollTaskStatus(result.data.tid)
}

const pollTaskStatus = async (tid) => {
  executing.value = true
  const pollInterval = setInterval(async () => {
    try {
      const res = await axios.post('/api/ogms/models/refresh', { tid })
      const status = res.data.data.status

      if (status === 2) {
        clearInterval(pollInterval)
        executing.value = false
        executionResult.value = res.data.data
        showResultModal.value = true
      } else if (status === -1) {
        clearInterval(pollInterval)
        executing.value = false
        notify('Task failed. Please check the model parameters and try again.', 'error', { duration: 6000 })
      }
    } catch (error) {
      console.error('Polling error', error)
      clearInterval(pollInterval)
      executing.value = false
    }
  }, 2000)
}

const closeResultModal = () => {
  showResultModal.value = false
  executionResult.value = null
}

onMounted(() => {
  fetchModelFacets()
  fetchModels()
})

watch([filterOnline, filterPublic, filterInstitutional], () => {
  currentPage.value = 1
  fetchModelFacets()
  fetchModels(1)
})
</script>

<style scoped>
.catalog-page {
  padding: 1.6rem 1.5rem 2.6rem;
  background: var(--bg-color);
}

.catalog-shell {
  max-width: 1560px;
  margin: 0 auto;
}

.catalog-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 1.6rem;
  align-items: start;
}

.catalog-sidebar {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
}

.catalog-sidebar-title {
  margin: 0;
  color: var(--primary-strong);
}

.catalog-sidebar-title {
  font-size: 0.98rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.catalog-filter-block,
.catalog-status-block {
  margin-top: 1rem;
}

.catalog-filter-item {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 3.35rem;
  align-items: center;
  column-gap: 0.65rem;
  min-height: 40px;
  margin-bottom: 0.18rem;
  padding: 0.45rem 0.7rem 0.45rem 0.9rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.catalog-filter-item > span:not(.catalog-filter-indicator) {
  min-width: 0;
  line-height: 1.45;
}

.catalog-filter-item:hover {
  background: #f8fafc;
  color: var(--primary-strong);
}

.catalog-filter-item.active {
  background: #eef2f7;
  border-color: var(--border-light);
  color: var(--primary-strong);
  font-weight: 700;
}

.catalog-filter-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 24px;
  border-radius: 0;
  background: var(--accent-color);
  transform: translateY(-50%);
}

.catalog-filter-item strong {
  min-width: 0;
  justify-self: end;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-align: right;
}

.catalog-filter-item.active strong {
  color: var(--primary-strong);
}

.catalog-label {
  margin: 0 0 0.7rem;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--text-muted);
}

.catalog-check {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.65rem;
  color: var(--text-secondary);
}

.catalog-check input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent-color);
}

.catalog-main {
  min-width: 0;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1.25rem;
  padding-top: 0.25rem;
}

.catalog-header-copy h1 {
  margin: 0;
  font-size: clamp(2rem, 2.7vw, 2.65rem);
  line-height: 1.02;
  letter-spacing: -0.025em;
  color: var(--primary-strong);
}

.catalog-header-copy p {
  max-width: 660px;
  margin: 0.55rem 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.catalog-search {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.65rem;
  width: 320px;
  min-height: 44px;
  padding: 0 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--surface-card);
  box-shadow: none;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.catalog-search:focus-within {
  background: #ffffff;
  border-color: rgba(15, 118, 110, 0.55);
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.1);
}

.catalog-search-icon {
  color: var(--text-muted);
}

.catalog-search input {
  border: none;
  background: transparent;
  font: inherit;
  color: var(--primary-strong);
  outline: none;
}

.catalog-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1.2rem;
}

.catalog-loading,
.catalog-empty {
  display: grid;
  justify-items: center;
  gap: 0.6rem;
  padding: 2rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
  box-shadow: none;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 104, 118, 0.15);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1080px) {
  .catalog-shell {
    grid-template-columns: 1fr;
  }

  .catalog-header {
    flex-direction: column;
    align-items: stretch;
  }

  .catalog-search {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .catalog-page {
    padding-left: 1rem;
    padding-right: 1rem;
  }

}
</style>
