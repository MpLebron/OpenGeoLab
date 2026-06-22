<template>
  <div class="cases-page">
    <section class="cases-hero">
      <div class="cases-shell hero-grid">
        <div class="hero-copy">
          <h1 class="font-headline">{{ $t('casesView.title') }}</h1>
          <p class="hero-lede">{{ $t('casesView.subtitle') }}</p>
        </div>
      </div>
    </section>

    <section class="cases-shell cases-toolbar" aria-label="Case filters">
      <StyledSearch
        ref="searchInputRef"
        v-model="searchQuery"
        class="case-search-control toolbar-search"
        type="search"
        :placeholder="$t('casesView.searchPlaceholder')"
        shortcut-label="⌘ K"
      />

      <div class="toolbar-filters">
        <StyledSelect
          v-model="sortBy"
          :options="caseSortOptions"
          :aria-label="$t('casesView.sortLabel')"
        />
      </div>
    </section>

    <section class="cases-shell cases-section">
      <div v-if="loading" class="cases-state">
        <div class="spinner"></div>
        <p>{{ $t('casesView.loading') }}</p>
      </div>

      <div v-else-if="error" class="cases-state">
        <p>{{ error }}</p>
        <button type="button" @click="fetchCases">{{ $t('casesView.retry') }}</button>
      </div>

      <div v-else-if="!visibleCases.length" class="cases-state">
        <p>{{ $t('casesView.empty') }}</p>
        <button type="button" @click="fetchCases">{{ $t('casesView.retry') }}</button>
      </div>

      <div v-else class="cases-grid">
        <CaseCard
          v-for="item in pagedCases"
          :key="item.slug"
          :case-item="item"
          :fallback-summary="$t('casesView.noSummary')"
        />
      </div>

      <PaginationControl
        v-if="totalPages > 1"
        class="cases-pagination"
        :current-page="currentPage"
        :total-pages="totalPages"
        :previous-label="$t('casesView.previous')"
        :next-label="$t('casesView.next')"
        @change="changePage"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import CaseCard from '../components/CaseCard.vue'
import PaginationControl from '../components/PaginationControl.vue'
import StyledSearch from '../components/StyledSearch.vue'
import StyledSelect from '../components/StyledSelect.vue'
import { buildCaseListParams } from '../utils/caseListFetch.js'
import { CASE_SORT_OPTIONS } from '../utils/caseSortOptions.js'

const loading = ref(false)
const error = ref('')
const cases = ref([])
const searchQuery = ref('')
const searchInputRef = ref(null)
const sortBy = ref('updated')
const currentPage = ref(1)
const pageSize = 20
const caseFetchPageSize = 120
const caseSortOptions = CASE_SORT_OPTIONS

const fetchCases = async () => {
  loading.value = true
  error.value = ''

  try {
    const firstResponse = await axios.get('/api/cases', {
      params: buildCaseListParams({ page: 1, limit: caseFetchPageSize }),
      headers: {
        'Cache-Control': 'no-cache'
      }
    })

    const allCases = Array.isArray(firstResponse.data.data) ? [...firstResponse.data.data] : []
    const total = Number(firstResponse.data.total || allCases.length)
    const totalFetchPages = Math.max(1, Math.ceil(total / caseFetchPageSize))

    for (let page = 2; page <= totalFetchPages; page += 1) {
      const response = await axios.get('/api/cases', {
        params: buildCaseListParams({ page, limit: caseFetchPageSize }),
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      allCases.push(...(Array.isArray(response.data.data) ? response.data.data : []))
    }

    cases.value = allCases
  } catch (err) {
    console.error('Failed to fetch cases:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to load cases.'
    cases.value = []
  } finally {
    loading.value = false
  }
}

const getCaseTitle = item => String(item?.title || '').trim()

const getCaseUpdatedTime = item => {
  const value = item?.modifiedAt || item?.updatedAt || item?.publishedAt || item?.createdAt || ''
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

const getCaseSize = item => Number(item?.sizeBytes || item?.size || 0)

const getCaseFileCount = item => Number(item?.fileCount || item?.filesCount || item?.files?.length || 0)

const visibleCases = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = cases.value.filter(item => {
    if (!query) {
      return true
    }

    const haystack = [
      item.title,
      item.summary,
      item.domain,
      item.authorLine,
      ...(Array.isArray(item.tags) ? item.tags : [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(query)
  })

  const sorted = [...filtered]

  if (sortBy.value === 'files') {
    sorted.sort((a, b) => getCaseFileCount(b) - getCaseFileCount(a) || getCaseTitle(a).localeCompare(getCaseTitle(b)))
  } else if (sortBy.value === 'size') {
    sorted.sort((a, b) => getCaseSize(b) - getCaseSize(a) || getCaseTitle(a).localeCompare(getCaseTitle(b)))
  } else if (sortBy.value === 'title') {
    sorted.sort((a, b) => getCaseTitle(a).localeCompare(getCaseTitle(b)))
  } else {
    sorted.sort((a, b) => getCaseUpdatedTime(b) - getCaseUpdatedTime(a) || getCaseTitle(a).localeCompare(getCaseTitle(b)))
  }

  return sorted
})

const totalPages = computed(() => Math.max(1, Math.ceil(visibleCases.value.length / pageSize)))

const pagedCases = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return visibleCases.value.slice(start, start + pageSize)
})

const changePage = page => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) {
    return
  }

  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch([searchQuery, sortBy], () => {
  currentPage.value = 1
})

watch(totalPages, value => {
  if (currentPage.value > value) {
    currentPage.value = value
  }
})

const refreshCasesIfEmpty = () => {
  if (!loading.value && (error.value || cases.value.length === 0)) {
    fetchCases()
  }
}

const focusCaseSearch = () => {
  searchInputRef.value?.focus()
  searchInputRef.value?.select?.()
}

const handleSearchShortcut = event => {
  const isSearchShortcut = (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key?.toLowerCase() === 'k'

  if (!isSearchShortcut) return
  event.preventDefault()
  focusCaseSearch()
}

onMounted(() => {
  fetchCases()
  window.addEventListener('keydown', handleSearchShortcut)
  window.addEventListener('focus', refreshCasesIfEmpty)
  window.addEventListener('pageshow', refreshCasesIfEmpty)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSearchShortcut)
  window.removeEventListener('focus', refreshCasesIfEmpty)
  window.removeEventListener('pageshow', refreshCasesIfEmpty)
})
</script>

<style scoped>
.cases-page {
  min-height: 100vh;
  background: var(--bg-color);
}

.cases-shell {
  width: min(100%, var(--max-shell-width));
  margin: 0 auto;
  padding: 0 1.5rem;
}

.cases-hero {
  padding: 1.15rem 0 0.95rem;
  border-bottom: 1px solid var(--border-light);
}

.hero-grid {
  display: block;
}

.hero-copy {
  max-width: 100%;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(2.45rem, 3vw, 3.15rem);
  line-height: 1.06;
  color: var(--text-primary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-lede {
  max-width: 100%;
  margin: 0.42rem 0 0;
  color: var(--text-secondary);
  font-size: 0.98rem;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 1.15rem;
  align-items: center;
  padding-top: 0.85rem;
  padding-bottom: 0.95rem;
}

.case-search-control {
  width: 100%;
}

.toolbar-filters {
  min-width: 0;
}

.cases-section {
  padding-bottom: 4rem;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;
}

.cases-state {
  min-height: 260px;
  display: grid;
  place-items: center;
  gap: 0.8rem;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
  text-align: center;
  color: var(--text-secondary);
}

.cases-state button {
  min-height: 42px;
  padding: 0 1rem;
  border: 1px solid var(--primary-strong);
  border-radius: 4px;
  background: var(--primary-strong);
  color: #fff;
  cursor: pointer;
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
  .cases-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .cases-toolbar {
    grid-template-columns: 1fr;
  }

  .hero-copy h1 {
    max-width: 820px;
    white-space: normal;
  }

  .hero-lede {
    max-width: 720px;
    white-space: normal;
  }
}

@media (max-width: 760px) {
  .cases-hero {
    padding: 1.05rem 0 0.9rem;
  }

  .cases-shell {
    padding: 0 1rem;
  }

  .cases-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 620px) {
  .cases-grid {
    grid-template-columns: 1fr;
  }
}
</style>
