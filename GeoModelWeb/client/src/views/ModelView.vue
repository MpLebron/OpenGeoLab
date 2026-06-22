<template>
  <div class="catalog-page">
    <div class="catalog-shell">
      <aside class="catalog-sidebar">
        <div class="catalog-sidebar-head">
          <span class="catalog-sidebar-kicker">Filters</span>
          <h2 class="catalog-sidebar-title font-headline">Model Repository</h2>
          <p>{{ facetTotal || total || 0 }} models</p>
        </div>

        <div class="catalog-filter-block">
          <p class="catalog-label">Model Domain</p>
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

          <button
            v-if="hasActiveFilters"
            class="catalog-reset-btn"
            type="button"
            @click="clearFilters"
          >
            Reset filters
          </button>
        </div>

      </aside>

      <section class="catalog-main">
        <header class="catalog-header">
          <div class="catalog-header-copy">
            <h1 class="font-headline">{{ $t('ogmsModelView.title') }}</h1>
            <p>{{ $t('ogmsModelView.subtitle') }}</p>
          </div>

          <StyledSearch
            v-model="searchQuery"
            class="catalog-search"
            :placeholder="$t('ogmsModelView.searchPlaceholder')"
            @enter="handleSearch"
          />
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
import StyledSearch from '../components/StyledSearch.vue'
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
const hasActiveFilters = computed(() => (
  Boolean(searchQuery.value.trim()) ||
  activeDomain.value !== 'all' ||
  filterOnline.value ||
  filterPublic.value ||
  filterInstitutional.value
))

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

const clearFilters = () => {
  searchQuery.value = ''
  activeDomain.value = 'all'
  filterOnline.value = false
  filterPublic.value = false
  filterInstitutional.value = false
  currentPage.value = 1
  fetchModelFacets()
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
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.catalog-sidebar {
  position: sticky;
  top: 6.25rem;
  max-height: calc(100vh - 7rem);
  overflow: auto;
  padding: 0.85rem;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: none;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}

.catalog-sidebar::-webkit-scrollbar {
  width: 8px;
}

.catalog-sidebar::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #d4d4d4;
}

.catalog-sidebar-head {
  padding: 0.05rem 0.05rem 0.85rem;
  border-bottom: 1px solid #ececec;
}

.catalog-sidebar-title {
  margin: 0.2rem 0 0;
  color: #111111;
}

.catalog-sidebar-title {
  font-size: 0.98rem;
  font-weight: 650;
  letter-spacing: 0;
  text-transform: none;
}

.catalog-sidebar-kicker {
  color: #737373;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.catalog-sidebar-head p {
  margin: 0.32rem 0 0;
  color: #8a8a8a;
  font-size: 0.78rem;
  font-weight: 500;
}

.catalog-filter-block,
.catalog-status-block {
  margin-top: 1rem;
}

.catalog-status-block {
  padding-top: 0.95rem;
  border-top: 1px solid #ececec;
}

.catalog-filter-item {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 34px;
  margin-bottom: 1px;
  padding: 0.4rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #525252;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.catalog-filter-item > span:not(.catalog-filter-indicator) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-filter-item:hover {
  background: #f7f7f7;
  color: #111111;
}

.catalog-filter-item.active {
  background: #f0f0f0;
  border-color: #e7e7e7;
  color: #111111;
  font-weight: 650;
  box-shadow: none;
}

.catalog-filter-indicator {
  display: none;
}

.catalog-filter-item strong {
  justify-self: end;
  min-width: 2rem;
  padding: 0;
  color: #8a8a8a;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-align: right;
}

.catalog-filter-item.active strong {
  color: #111111;
}

.catalog-label {
  margin: 0 0 0.55rem;
  color: #8a8a8a;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.catalog-check {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  min-height: 34px;
  margin-bottom: 1px;
  padding: 0.4rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #525252;
  font-size: 0.86rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.catalog-check:hover {
  background: #f7f7f7;
  color: #111111;
}

.catalog-check input {
  appearance: none;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  margin: 0;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  background: #ffffff;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.catalog-check input::after {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: #111111;
  transform: scale(0);
  transition: transform 0.12s ease;
}

.catalog-check input:checked {
  border-color: #111111;
  background: #ffffff;
}

.catalog-check input:checked::after {
  transform: scale(1);
}

.catalog-check:has(input:checked) {
  border-color: #e7e7e7;
  background: #f0f0f0;
  color: #111111;
  font-weight: 650;
}

.catalog-reset-btn {
  width: 100%;
  min-height: 34px;
  margin-top: 0.55rem;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #242424;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.catalog-reset-btn:hover {
  border-color: #d4d4d4;
  background: #f7f7f7;
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
  width: 320px;
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
