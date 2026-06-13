<template>
  <article class="model-list-item">
    <div class="model-card-shell">
      <ModelThumbnail :model="model" />

      <div class="model-summary">
        <div class="title-row">
          <h3 :title="model.name">{{ model.name }}</h3>
          <div class="status-row">
            <span class="chip status-chip">{{ model.status || $t('modelCard.catalog') }}</span>
            <span v-if="model.deploy" class="chip deploy-chip">{{ $t('modelCard.deployed') }}</span>
            <span v-if="model.online" class="chip online-chip">{{ $t('modelCard.online') }}</span>
          </div>
        </div>

        <p class="description" :title="model.description">
          {{ truncate(model.description, 220) || $t('ogmsModelView.noDescription') }}
        </p>

        <div class="metric-row">
          <span class="metric-item">{{ formatCompactNumber(viewCount) }} {{ $t('modelCard.views') }}</span>
          <span class="metric-item">{{ formatCompactNumber(invokeCount) }} {{ $t('modelCard.runs') }}</span>
          <span class="metric-item">{{ $t('modelCard.updated') }} {{ formatDate(model.lastModifyTime || model.createTime) }}</span>
          <span v-if="visibleTags.length" class="tag-chip">{{ visibleTags[0] }}</span>
        </div>
      </div>

      <aside class="action-column">
        <button class="primary-btn" @click.stop="emit('run', model)">
          {{ $t('ogmsModelView.runModel') }}
        </button>
        <a
          v-if="metadataUrl"
          class="ghost-btn"
          :href="metadataUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          Metadata
        </a>
        <button v-else class="ghost-btn" type="button" disabled>
          Metadata
        </button>
      </aside>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ModelThumbnail from './ModelThumbnail.vue'
import { buildOpenGmsModelItemUrl } from '../utils/savedModelDisplay.js'

const { t } = useI18n()

const props = defineProps({
  model: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['run'])

const visibleTags = computed(() => (Array.isArray(props.model.tags) ? props.model.tags.slice(0, 5) : []))
const viewCount = computed(() => toNumber(props.model.viewCount))
const invokeCount = computed(() => toNumber(props.model.invokeCount))
const metadataUrl = computed(() => {
  const explicitUrl = normalizeModelItemUrl(
    props.model.modelItemUrl || props.model.metadataUrl || props.model.detailUrl || props.model.externalUrl
  )
  if (explicitUrl) return explicitUrl

  return buildOpenGmsModelItemUrl(
    props.model.modelItemId ||
      props.model.modelItemID ||
      props.model.modelItem?.id ||
      firstRelatedModelItem(props.model.relatedModelItems)
  )
})

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? `${text.slice(0, length)}...` : text
}

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

const formatCompactNumber = (value) => {
  const count = toNumber(value)
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(count)
}

const formatDate = (value) => {
  if (!value) return '--'
  return String(value).split(' ')[0]
}

const firstRelatedModelItem = (value) => {
  if (Array.isArray(value)) return String(value[0] || '').trim()
  return String(value || '').trim()
}

const normalizeModelItemUrl = (value) => {
  const url = String(value || '').trim()
  return url.includes('/modelItem/') ? url : ''
}
</script>

<style scoped>
.model-list-item {
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: none;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.model-list-item:hover {
  background: #fbfcfe;
  border-color: #a8b3c2;
}

.model-card-shell {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 128px;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
}

.title-row,
.status-row,
.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.title-row {
  align-items: center;
  gap: 0.7rem;
}

.model-summary {
  min-width: 0;
}

.model-summary h3 {
  margin: 0;
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  font-size: 1.18rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.status-row {
  margin-left: 0.25rem;
}

.chip,
.tag-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  border: 1px solid transparent;
  padding: 0.2rem 0.48rem;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 800;
}

.status-chip {
  background: rgba(0, 104, 118, 0.1);
  color: var(--accent-color);
}

.deploy-chip {
  background: rgba(245, 158, 11, 0.14);
  color: #b36a00;
}

.online-chip {
  background: rgba(47, 125, 78, 0.12);
  color: var(--success-color);
}

.description {
  margin: 0.55rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.metric-row {
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.6rem;
}

.metric-item {
  color: var(--text-muted);
  font-size: 0.76rem;
  white-space: nowrap;
}

.tag-chip {
  border: 1px solid var(--border-light);
  background: #f8fafc;
  color: #354a53;
  border-radius: 3px;
  padding: 0.26rem 0.58rem;
  font-size: 0.58rem;
}

.action-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.primary-btn {
  border: 1px solid var(--primary-strong);
  border-radius: 4px;
  background: var(--primary-strong);
  color: #ffffff;
  font-family: 'Manrope', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.primary-btn:hover {
  background: var(--primary-soft);
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #ffffff;
  color: var(--primary-strong);
  font-family: 'Manrope', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
  text-decoration: none;
}

.ghost-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .model-card-shell {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .action-column {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-start;
  }

  .primary-btn,
  .ghost-btn {
    min-width: 160px;
  }
}

@media (max-width: 720px) {
  .model-card-shell {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .title-row,
  .action-column {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-column,
  .primary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
