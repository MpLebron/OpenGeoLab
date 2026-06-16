<template>
  <article class="case-card">
    <RouterLink class="case-main-link" :to="detailTo" :aria-label="caseItem.title">
      <div class="case-cover">
        <img
          v-if="caseItem.coverImageUrl && !imageFailed"
          :src="coverImageSrc"
          :alt="caseItem.title"
          loading="lazy"
          @error="imageFailed = true"
        >
        <div v-else class="case-cover-fallback" aria-hidden="true">
          <span></span>
        </div>
      </div>

      <div class="case-body">
        <div class="case-meta-line">
          <span class="case-domain">{{ caseItem.domain || fallbackDomain }}</span>
          <time v-if="caseItem.timeLabel" :datetime="normalizedDate">{{ caseItem.timeLabel }}</time>
        </div>

        <h3 :title="caseItem.title">{{ caseItem.title }}</h3>
        <p class="case-summary">{{ caseItem.summary || fallbackSummary }}</p>

        <div class="case-tags" v-if="visibleTags.length">
          <span v-for="tag in visibleTags" :key="tag" :title="tag">{{ tag }}</span>
        </div>
      </div>
    </RouterLink>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { resolvePublicResourceUrl } from '../utils/apiClient.js'

const props = defineProps({
  caseItem: {
    type: Object,
    required: true
  },
  fallbackDomain: {
    type: String,
    default: 'GeoAI'
  },
  fallbackSummary: {
    type: String,
    default: 'No summary available.'
  }
})

const imageFailed = ref(false)

watch(
  () => props.caseItem.coverImageUrl,
  () => {
    imageFailed.value = false
  }
)

const visibleTags = computed(() => {
  return Array.isArray(props.caseItem.tags)
    ? props.caseItem.tags.filter(Boolean).slice(0, 4)
    : []
})

const coverImageSrc = computed(() => resolvePublicResourceUrl(props.caseItem.coverImageUrl))

const detailTo = computed(() => ({
  name: 'CasesDetail',
  params: { slug: props.caseItem.slug || props.caseItem.id }
}))

const normalizedDate = computed(() => {
  return props.caseItem.publishedAt || props.caseItem.updatedAt || ''
})
</script>

<style scoped>
.case-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
  box-shadow: none;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.case-card:hover {
  border-color: #a8b3c2;
  background: #fbfcfe;
}

.case-main-link {
  flex: 1;
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
}

.case-main-link:focus-visible {
  outline: 3px solid rgba(0, 104, 118, 0.22);
  outline-offset: -3px;
}

.case-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #eef2f7;
}

.case-cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.case-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #eef2f7;
}

.case-cover-fallback span {
  width: 58px;
  height: 58px;
  border-radius: 4px;
  border: 2px solid #9aa7ba;
  position: relative;
}

.case-cover-fallback span::before,
.case-cover-fallback span::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  height: 2px;
  background: #9aa7ba;
}

.case-cover-fallback span::before {
  top: 18px;
}

.case-cover-fallback span::after {
  top: 30px;
}

.case-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.case-meta-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  min-width: 0;
}

.case-domain {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--accent-color);
  font-weight: 800;
}

.case-meta-line time {
  flex: 0 0 auto;
  white-space: nowrap;
}

.case-body h3 {
  margin: 0.65rem 0 0;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 1.2rem;
  line-height: 1.28;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-summary {
  margin: 0.75rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.58;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.case-tags {
  margin-top: 0.8rem;
  display: flex;
  flex-wrap: nowrap;
  gap: 0.45rem;
  min-width: 0;
  overflow: hidden;
}

.case-tags span {
  min-width: 0;
  max-width: 8.5rem;
  padding: 0.34rem 0.58rem;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  background: #f8fafc;
  color: var(--text-secondary);
  font-size: 0.76rem;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
