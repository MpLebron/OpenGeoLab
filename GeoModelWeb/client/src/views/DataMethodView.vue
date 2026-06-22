<template>
  <div class="catalog-page">
    <div class="catalog-shell">
      <aside class="catalog-sidebar">
        <div class="catalog-sidebar-head">
          <span class="catalog-sidebar-kicker">Filters</span>
          <h2 class="catalog-sidebar-title font-headline">Method Library</h2>
          <p>{{ facetTotal || total || 0 }} methods</p>
        </div>

        <div class="catalog-filter-summary" v-if="hasActiveFilters">
          <span>Filtered view</span>
          <button v-if="hasActiveFilters" type="button" @click="clearFilters">Clear</button>
        </div>

        <div class="catalog-filter-block">
          <p class="catalog-label">Method Categories</p>
          <button
            :class="['catalog-filter-item', { active: activeFacet === 'all' }]"
            @click="selectFacet('all')"
          >
            <span v-if="activeFacet === 'all'" class="catalog-filter-indicator"></span>
            <span>All Methods</span>
            <strong>{{ facetTotal || total || 0 }}</strong>
          </button>

          <button
            v-for="option in methodFacets"
            :key="option.label"
            :class="['catalog-filter-item', { active: activeFacet === option.label }]"
            @click="selectFacet(option.label)"
          >
            <span v-if="activeFacet === option.label" class="catalog-filter-indicator"></span>
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </div>

        <div class="catalog-filter-block">
          <p class="catalog-label">Data Type</p>
          <button
            :class="['catalog-filter-item compact', { active: selectedDataType === 'all' }]"
            @click="selectDataType('all')"
          >
            <span v-if="selectedDataType === 'all'" class="catalog-filter-indicator"></span>
            <span>All types</span>
            <strong>{{ facetTotal || total || 0 }}</strong>
          </button>
          <button
            v-for="option in dataTypeFacets"
            :key="option.label"
            :class="['catalog-filter-item compact', { active: selectedDataType === option.label }]"
            @click="selectDataType(option.label)"
          >
            <span v-if="selectedDataType === option.label" class="catalog-filter-indicator"></span>
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </div>

        <div class="catalog-filter-block">
          <p class="catalog-label">Runtime Engine</p>
          <button
            :class="['catalog-filter-item compact', { active: selectedRuntime === 'all' }]"
            @click="selectRuntime('all')"
          >
            <span v-if="selectedRuntime === 'all'" class="catalog-filter-indicator"></span>
            <span>All engines</span>
            <strong>{{ facetTotal || total || 0 }}</strong>
          </button>
          <button
            v-for="option in runtimeFacets"
            :key="option.label"
            :class="['catalog-filter-item compact', { active: selectedRuntime === option.label }]"
            @click="selectRuntime(option.label)"
          >
            <span v-if="selectedRuntime === option.label" class="catalog-filter-indicator"></span>
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </div>

        <div class="catalog-filter-block">
          <p class="catalog-label">Execution Mode</p>
          <button
            :class="['catalog-filter-item compact', { active: selectedExecutionMode === 'all' }]"
            @click="selectExecutionMode('all')"
          >
            <span v-if="selectedExecutionMode === 'all'" class="catalog-filter-indicator"></span>
            <span>All modes</span>
            <strong>{{ facetTotal || total || 0 }}</strong>
          </button>
          <button
            v-for="option in executionModeFacets"
            :key="option.label"
            :class="['catalog-filter-item compact', { active: selectedExecutionMode === option.label }]"
            @click="selectExecutionMode(option.label)"
          >
            <span v-if="selectedExecutionMode === option.label" class="catalog-filter-indicator"></span>
            <span>{{ option.label }}</span>
            <strong>{{ option.count }}</strong>
          </button>
        </div>

      </aside>

      <section class="catalog-main">
        <header class="catalog-header">
          <div class="catalog-header-copy">
            <h1 class="font-headline">{{ $t('dataMethodView.title') }}</h1>
            <p>{{ $t('dataMethodView.subtitle') }}</p>
          </div>

          <StyledSearch
            v-model="searchQuery"
            class="catalog-search"
            :placeholder="$t('dataMethodView.searchPlaceholder')"
            :disabled="loading"
            @enter="handleSearch"
          />
        </header>

        <div v-if="searchNote && !loading" class="catalog-note">
          {{ searchNote }}
        </div>

        <div v-if="loading" class="catalog-loading">
          <div class="spinner"></div>
          <p>Loading data methods...</p>
        </div>

        <div v-else-if="loadError" class="catalog-empty catalog-error">
          <p>{{ loadError }}</p>
        </div>

        <div v-else class="catalog-list">
          <DataMethodCard
            v-for="method in dataMethods"
            :key="method.id"
            :method="method"
            @run="openRunModal"
          />

          <div v-if="!dataMethods.length" class="catalog-empty">
            <p>No methods match the current filters.</p>
          </div>
        </div>

        <PaginationControl
          v-if="totalPages > 1"
          class="catalog-pagination"
          :current-page="currentPage"
          :total-pages="totalPages"
          :disabled="loading"
          :previous-label="$t('dataMethodView.previous')"
          :next-label="$t('dataMethodView.next')"
          @change="changePage"
        />
      </section>
    </div>

    <RunModal
      :visible="showModal"
      :model="selectedMethod"
      :loading="executing"
      @close="closeModal"
      @execute="executeMethod"
    />

    <ResultModal
      :visible="showResultModal"
      :result="executionResult"
      :title="`${selectedMethod?.name || 'Data Method'} - Execution Result`"
      @close="closeResultModal"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import DataMethodCard from '../components/DataMethodCard.vue'
import PaginationControl from '../components/PaginationControl.vue'
import RunModal from '../components/RunModal.vue'
import ResultModal from '../components/ResultModal.vue'
import StyledSearch from '../components/StyledSearch.vue'
import { buildDataMethodRunRequest } from '../utils/dataMethodExecution.js'

const searchQuery = ref('')
const dataMethods = ref([])
const loading = ref(false)
const currentPage = ref(1)
const total = ref(0)
const searchNote = ref('')
const loadError = ref('')
const limit = 12
const facetTotal = ref(0)
const methodFacets = ref([])
const dataTypeFacets = ref([])
const runtimeFacets = ref([])
const executionModeFacets = ref([])

const activeFacet = ref('all')
const selectedDataType = ref('all')
const selectedRuntime = ref('all')
const selectedExecutionMode = ref('all')

const showModal = ref(false)
const selectedMethod = ref(null)
const executing = ref(false)
const showResultModal = ref(false)
const executionResult = ref(null)

const totalPages = computed(() => Math.ceil(total.value / limit))
const hasActiveFilters = computed(() => (
  activeFacet.value !== 'all' ||
  selectedDataType.value !== 'all' ||
  selectedRuntime.value !== 'all' ||
  selectedExecutionMode.value !== 'all' ||
  Boolean(searchQuery.value.trim())
))

const fetchDataMethods = async (page = 1) => {
  loading.value = true
  searchNote.value = ''
  loadError.value = ''
  try {
    const response = await axios.get('/api/datamethods', {
      params: {
        page,
        limit,
        q: searchQuery.value,
        facet: activeFacet.value,
        dataType: selectedDataType.value,
        runtime: selectedRuntime.value,
        executionMode: selectedExecutionMode.value
      }
    })
    dataMethods.value = Array.isArray(response.data.data) ? response.data.data : []
    total.value = response.data.total || 0
    currentPage.value = response.data.page || page
    searchNote.value = response.data.searchNote || ''
  } catch (error) {
    console.error('Failed to fetch data methods:', error)
    dataMethods.value = []
    total.value = 0
    loadError.value = error.response?.data?.message || error.response?.data?.error || 'Failed to load data methods.'
  } finally {
    loading.value = false
  }
}

const fetchMethodFacets = async () => {
  try {
    const response = await axios.get('/api/datamethods/facets', {
      params: {
        q: searchQuery.value
      }
    })
    const groups = response.data.groups || {}
    facetTotal.value = response.data.total || 0
    methodFacets.value = Array.isArray(groups.categories)
      ? groups.categories
      : (Array.isArray(response.data.facets) ? response.data.facets : [])
    dataTypeFacets.value = Array.isArray(groups.dataTypes) ? groups.dataTypes : []
    runtimeFacets.value = Array.isArray(groups.runtimes) ? groups.runtimes : []
    executionModeFacets.value = Array.isArray(groups.executionModes) ? groups.executionModes : []
  } catch (error) {
    console.error('Failed to fetch data method facets:', error)
    facetTotal.value = total.value
    methodFacets.value = []
    dataTypeFacets.value = []
    runtimeFacets.value = []
    executionModeFacets.value = []
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchMethodFacets()
  fetchDataMethods()
}

const selectFacet = (facet) => {
  activeFacet.value = facet
  currentPage.value = 1
  fetchDataMethods(1)
}

const selectDataType = (dataType) => {
  selectedDataType.value = dataType
  currentPage.value = 1
  fetchDataMethods(1)
}

const selectRuntime = (runtime) => {
  selectedRuntime.value = runtime
  currentPage.value = 1
  fetchDataMethods(1)
}

const selectExecutionMode = (executionMode) => {
  selectedExecutionMode.value = executionMode
  currentPage.value = 1
  fetchDataMethods(1)
}

const clearFilters = () => {
  searchQuery.value = ''
  activeFacet.value = 'all'
  selectedDataType.value = 'all'
  selectedRuntime.value = 'all'
  selectedExecutionMode.value = 'all'
  currentPage.value = 1
  fetchMethodFacets()
  fetchDataMethods(1)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    fetchDataMethods(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const openRunModal = (method) => {
  selectedMethod.value = method
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedMethod.value = null
}

const closeResultModal = () => {
  showResultModal.value = false
  executionResult.value = null
}

const executeMethod = async (payload) => {
  executing.value = true
  try {
    const response = await axios.post('/api/datamethods/run', buildDataMethodRunRequest(selectedMethod.value, payload))

    executionResult.value = response.data
    closeModal()
    showResultModal.value = true
  } catch (error) {
    console.error('Execution failed:', error)
    executionResult.value = {
      status: 'error',
      message: error.response?.data?.message || 'Execution failed. Please try again.'
    }
    showResultModal.value = true
  } finally {
    executing.value = false
  }
}

onMounted(() => {
  fetchMethodFacets()
  fetchDataMethods()
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
  font-size: 0.96rem;
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

.catalog-filter-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.85rem;
  padding: 0.48rem 0.5rem;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fafafa;
  color: #525252;
  font-size: 0.78rem;
  font-weight: 600;
}

.catalog-filter-summary button {
  border: none;
  background: transparent;
  color: #111111;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 650;
  cursor: pointer;
}

.catalog-filter-block {
  margin-top: 0.95rem;
}

.catalog-filter-block + .catalog-filter-block {
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
  text-align: right;
  font-weight: 600;
}

.catalog-filter-item.active strong {
  color: #111111;
}

.catalog-filter-item.compact {
  min-height: 32px;
  padding-top: 0.34rem;
  padding-bottom: 0.34rem;
  font-size: 0.84rem;
}

.catalog-label {
  margin: 0 0 0.55rem;
  color: #8a8a8a;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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

.catalog-note {
  margin-top: 0.75rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #ffffff;
  color: var(--text-secondary);
}

.catalog-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
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

.catalog-error {
  color: #9f1239;
  background: #fff5f7;
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
