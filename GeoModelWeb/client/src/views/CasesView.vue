<template>
  <div class="cases-page">
    <section class="cases-hero">
      <div class="cases-shell hero-grid">
        <div class="hero-copy">
          <p class="cases-eyebrow">{{ $t('casesView.eyebrow') }}</p>
          <h1 class="font-headline">{{ $t('casesView.title') }}</h1>
          <p class="hero-lede">{{ $t('casesView.subtitle') }}</p>
        </div>
      </div>
    </section>

    <section class="cases-shell cases-toolbar" aria-label="Case filters">
      <div class="toolbar-search">
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="$t('casesView.searchPlaceholder')"
        >
      </div>

      <div class="toolbar-filters">
        <select v-model="selectedDomain" :aria-label="$t('casesView.domainAll')">
          <option value="">{{ $t('casesView.domainAll') }}</option>
          <option v-for="domain in domains" :key="domain" :value="domain">
            {{ domain }}
          </option>
        </select>
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
import { buildCaseListParams } from '../utils/caseListFetch.js'

const loading = ref(false)
const error = ref('')
const cases = ref([])
const searchQuery = ref('')
const selectedDomain = ref('')
const currentPage = ref(1)
const pageSize = 12

const fetchCases = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await axios.get('/api/cases', {
      params: buildCaseListParams({ page: 1, limit: 120 }),
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    cases.value = Array.isArray(response.data.data) ? response.data.data : []
  } catch (err) {
    console.error('Failed to fetch cases:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to load cases.'
    cases.value = []
  } finally {
    loading.value = false
  }
}

const domains = computed(() => {
  return Array.from(new Set(cases.value.map(item => item.domain).filter(Boolean))).sort((a, b) => a.localeCompare(b))
})

const visibleCases = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return cases.value.filter(item => {
    const matchesDomain = !selectedDomain.value || item.domain === selectedDomain.value
    if (!matchesDomain) {
      return false
    }

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

watch([searchQuery, selectedDomain], () => {
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

onMounted(() => {
  fetchCases()
  window.addEventListener('focus', refreshCasesIfEmpty)
  window.addEventListener('pageshow', refreshCasesIfEmpty)
})

onBeforeUnmount(() => {
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
  padding: 3rem 0 2.35rem;
  border-bottom: 1px solid var(--border-light);
}

.hero-grid {
  display: block;
}

.hero-copy {
  max-width: 100%;
}

.cases-eyebrow {
  margin: 0 0 0.7rem;
  color: var(--accent-color);
  font-size: 0.88rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
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
  margin: 0.9rem 0 0;
  color: var(--text-secondary);
  font-size: 1.02rem;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cases-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 1rem;
  align-items: center;
  padding-top: 2rem;
  padding-bottom: 1.25rem;
}

.toolbar-search input,
.toolbar-filters select {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0 1rem;
  background: var(--surface-card);
  color: var(--text-primary);
  font: inherit;
  box-shadow: none;
}

.toolbar-search input:focus,
.toolbar-filters select:focus {
  outline: 2px solid rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.55);
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
    padding-top: 3.3rem;
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
