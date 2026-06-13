<template>
  <article class="method-list-item">
    <div class="method-card-shell">
      <DataMethodThumbnail :method="method" />

      <div class="summary-column">
        <div class="title-row">
          <h3 :title="method.name">{{ method.name }}</h3>
          <div class="status-row">
            <span v-if="method.engine" class="chip engine-chip">{{ method.engine.toUpperCase() }}</span>
            <span v-if="method.execution" class="chip exec-chip">{{ method.execution.toUpperCase() }}</span>
            <span v-if="method.methodType" class="chip neutral-chip">{{ formatLabel(method.methodType) }}</span>
          </div>
        </div>

        <p class="description" :title="method.longDescription || method.description">
          {{ truncate(method.longDescription || method.description, 220) }}
        </p>

        <div v-if="visibleSummaryTags.length" class="tag-row">
          <span v-for="tag in visibleSummaryTags" :key="tag" class="tag-chip">
            {{ tag }}
          </span>
        </div>
      </div>

      <aside class="action-column">
        <button class="primary-btn" @click.stop="emit('run', method)">
          {{ $t('modelCard.run') }}
        </button>
      </aside>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import DataMethodThumbnail from './DataMethodThumbnail.vue'

const { t } = useI18n()

const props = defineProps({
  method: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['run'])

const visibleTags = computed(() => (Array.isArray(props.method.tags) ? props.method.tags.slice(0, 5) : []))
const visibleInputKinds = computed(() => normalizeKinds(props.method.inputKinds).slice(0, 4))
const visibleOutputKinds = computed(() => normalizeKinds(props.method.outputKinds).slice(0, 4))
const visibleSummaryTags = computed(() => [
  ...visibleInputKinds.value.slice(0, 1),
  ...visibleOutputKinds.value.slice(0, 1),
  ...visibleTags.value.slice(0, 2)
])

const truncate = (text, length) => {
  if (!text) return t('dataCard.noDescription')
  return text.length > length ? `${text.slice(0, length)}...` : text
}

const normalizeKinds = (value) => {
  if (!Array.isArray(value)) return []
  return value.map(item => formatLabel(item)).filter(Boolean)
}

const formatLabel = (value) => {
  if (!value) return ''
  return String(value)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

</script>

<style scoped>
.method-list-item {
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: none;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.method-list-item:hover {
  background: #fbfcfe;
  border-color: #a8b3c2;
}

.method-card-shell {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 128px;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
}

.summary-column {
  min-width: 0;
}

.title-row,
.status-row,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.title-row {
  align-items: center;
  gap: 0.7rem;
}

.summary-column h3 {
  margin: 0;
  color: var(--text-primary);
  font-family: 'Manrope', sans-serif;
  font-size: 1.18rem;
  line-height: 1.2;
  letter-spacing: -0.02em;
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

.engine-chip {
  background: var(--accent-light);
  color: var(--accent-color);
}

.exec-chip,
.output-tag {
  background: rgba(47, 125, 78, 0.12);
  color: var(--success-color);
}

.neutral-chip {
  background: rgba(15, 23, 42, 0.05);
  color: var(--text-secondary);
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

.tag-row {
  margin-top: 0.6rem;
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

@media (max-width: 980px) {
  .method-card-shell {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .action-column {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    min-width: 180px;
  }
}

@media (max-width: 720px) {
  .method-card-shell {
    grid-template-columns: 1fr;
  }

  .action-column,
  .primary-btn {
    width: 100%;
  }
}
</style>
