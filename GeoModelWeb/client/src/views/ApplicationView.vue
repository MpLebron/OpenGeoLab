<template>
  <div class="application-page">
    <section class="application-hero">
      <div class="application-shell hero-grid">
        <div class="hero-copy">
          <h1 class="font-headline">{{ $t('applicationView.title') }}</h1>
          <p class="hero-lede">{{ $t('applicationView.subtitle') }}</p>
        </div>
      </div>
    </section>

    <section class="application-shell application-section">
      <div v-if="loading && !applications.length" class="application-loading">
        <div class="spinner"></div>
        <p>{{ $t('applicationView.loading') }}</p>
      </div>

      <div v-else-if="error" class="application-empty">
        <p>{{ error }}</p>
        <button type="button" @click="fetchApplications(currentPage)">
          {{ $t('applicationView.retry') }}
        </button>
      </div>

      <div v-else-if="!applications.length" class="application-empty">
        <p>{{ $t('applicationView.empty') }}</p>
      </div>

      <div v-else class="application-grid">
        <ApplicationCard v-for="application in applications" :key="application.id" :application="application"
          :fallback-description="$t('applicationView.noDescription')" />
      </div>

      <PaginationControl
        v-if="totalPages > 1"
        class="application-pagination"
        :current-page="currentPage"
        :total-pages="totalPages"
        :disabled="loading"
        :previous-label="$t('applicationView.previous')"
        :next-label="$t('applicationView.next')"
        @change="changePage"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import ApplicationCard from '../components/ApplicationCard.vue'
import PaginationControl from '../components/PaginationControl.vue'

const applications = ref([])
const loading = ref(false)
const error = ref('')
const currentPage = ref(1)
const total = ref(0)
const limit = 20

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

const fetchApplications = async (page = 1) => {
  loading.value = true
  error.value = ''

  try {
    const response = await axios.get('/api/applications/schemes', {
      params: { page, limit }
    })

    applications.value = Array.isArray(response.data.data) ? response.data.data : []
    total.value = Number(response.data.total) || applications.value.length
    currentPage.value = Number(response.data.page) || page
  } catch (err) {
    console.error('Failed to fetch applications:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to load applications.'
    applications.value = []
  } finally {
    loading.value = false
  }
}

const changePage = (page) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) {
    return
  }

  fetchApplications(page)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchApplications()
})
</script>

<style scoped>
.application-page {
  min-height: 100vh;
  background: var(--bg-color);
  color: var(--primary-strong);
}

.application-shell {
  width: min(100% - 3rem, 1360px);
  margin: 0 auto;
}

.application-hero {
  position: relative;
  overflow: hidden;
  padding: 1.15rem 0 0.95rem;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-light);
}

.hero-grid {
  display: block;
}

.hero-copy {
  max-width: 100%;
}

.hero-copy h1 {
  max-width: 100%;
  margin: 0;
  color: var(--primary-strong);
  font-size: clamp(2.45rem, 3vw, 3.15rem);
  line-height: 1.06;
  letter-spacing: 0;
  white-space: nowrap;
}

.hero-lede {
  max-width: 100%;
  margin: 0.42rem 0 0;
  color: var(--text-secondary);
  font-size: 0.98rem;
  line-height: 1.45;
}

.application-section {
  padding: 1rem 0 4rem;
}

.application-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.25rem;
}

.application-loading,
.application-empty {
  min-height: 300px;
  display: grid;
  place-items: center;
  justify-items: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.application-empty p,
.application-loading p {
  margin: 0;
  font-weight: 700;
}

.application-empty button {
  min-height: 42px;
  padding: 0 1rem;
  border: 1px solid var(--primary-strong);
  border-radius: 4px;
  color: #ffffff;
  background: var(--primary-strong);
  font-weight: 800;
  cursor: pointer;
}

.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(0, 104, 118, 0.14);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .hero-copy h1 {
    max-width: 820px;
    white-space: normal;
  }

  .hero-lede {
    max-width: 720px;
  }

  .application-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .application-shell {
    width: min(100% - 2rem, 760px);
  }

  .application-hero {
    padding: 1.05rem 0 0.9rem;
  }

  .application-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .application-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy h1 {
    font-size: 2.1rem;
  }

  .hero-lede {
    font-size: 0.96rem;
  }
}
</style>
