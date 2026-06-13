<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="library-selector-layer"
      role="presentation"
      @click.self="requestClose"
    >
      <section
        ref="dialogPanel"
        class="library-selector-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown.esc.prevent="requestClose"
      >
        <header class="library-selector-header">
          <div>
            <p class="library-selector-eyebrow">Library</p>
            <h2 :id="titleId">{{ dialogTitle }}</h2>
            <p>{{ dialogSubtitle }}</p>
          </div>
          <button
            type="button"
            class="close-button"
            aria-label="Close"
            @click="requestClose"
          >
            &times;
          </button>
        </header>

        <div class="library-selector-body">
          <form class="library-selector-search" @submit.prevent="emitSearch">
            <label>
              <span>Search</span>
              <input
                :value="searchQuery"
                type="text"
                autocomplete="off"
                :placeholder="searchPlaceholder"
                @input="emit('update:searchQuery', $event.target.value)"
              >
            </label>
            <button type="submit" class="dialog-btn ghost" :disabled="loading">
              Search
            </button>
          </form>

          <div v-if="loading" class="selector-state">
            <span class="loading-spinner" aria-hidden="true"></span>
            <p>Loading library resources...</p>
          </div>

          <div v-else-if="items.length === 0" class="selector-state empty">
            <strong>{{ emptyTitle }}</strong>
            <p>Try another search term or return to the full library.</p>
          </div>

          <div v-else class="library-resource-list" role="list">
            <article
              v-for="item in items"
              :key="item.id || item.name"
              class="library-resource-item"
              :class="{ added: isItemAdded(item) }"
              role="listitem"
            >
              <div class="resource-mark" aria-hidden="true">
                {{ getLibraryItemTypeLabel(item, kind) }}
              </div>

              <div class="resource-summary">
                <div class="resource-title-row">
                  <h3 :title="item.name || 'Untitled'">{{ item.name || 'Untitled' }}</h3>
                  <div class="resource-chip-row">
                    <span
                      v-for="chip in getLibraryItemStatusChips(item, kind)"
                      :key="`${chip.className}-${chip.label}`"
                      :class="['resource-chip', chip.className]"
                    >
                      {{ chip.label }}
                    </span>
                  </div>
                </div>

                <p class="resource-description" :title="getLibraryItemSummary(item, kind)">
                  {{ getLibraryItemSummary(item, kind) }}
                </p>

                <div v-if="kind === 'dataMethod'" class="resource-io-row" aria-label="Input output summary">
                  <span
                    v-for="stat in getLibraryItemIoStats(item)"
                    :key="stat.label"
                  >
                    <strong>{{ stat.value }}</strong>
                    {{ stat.label }}
                  </span>
                </div>

                <div v-if="getLibraryItemTags(item, kind).length" class="resource-tag-row">
                  <span
                    v-for="tag in getLibraryItemTags(item, kind)"
                    :key="tag"
                    class="resource-tag"
                  >
                    {{ tag }}
                  </span>
                </div>

                <div class="resource-meta-row">
                  <span
                    v-for="metric in getLibraryItemMetrics(item, kind)"
                    :key="metric"
                  >
                    {{ metric }}
                  </span>
                </div>
              </div>

              <aside class="resource-actions">
                <button
                  v-if="isModelSelector"
                  type="button"
                  class="dialog-btn ghost compact"
                  :disabled="!getLibraryItemDetailUrl(item, kind)"
                  @click="emit('open-detail', item)"
                >
                  Metadata
                </button>
                <button
                  type="button"
                  class="dialog-btn primary compact"
                  :disabled="isItemAdded(item)"
                  @click="emit('add', item)"
                >
                  {{ isItemAdded(item) ? 'Added' : 'Add' }}
                </button>
              </aside>
            </article>
          </div>
        </div>

        <footer class="library-selector-footer">
          <span class="result-summary">{{ resultSummary }}</span>
          <div v-if="total > 0" class="selector-pagination">
            <button
              type="button"
              class="dialog-btn ghost compact"
              :disabled="page <= 1 || loading"
              @click="emit('page-change', page - 1)"
            >
              Previous
            </button>
            <span>{{ page }} / {{ totalPages }}</span>
            <button
              type="button"
              class="dialog-btn ghost compact"
              :disabled="page >= totalPages || loading"
              @click="emit('page-change', page + 1)"
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  getLibraryItemDetailUrl,
  getLibraryItemIoStats,
  getLibraryItemMetrics,
  getLibraryItemStatusChips,
  getLibraryItemSummary,
  getLibraryItemTags,
  getLibraryItemTypeLabel
} from '../utils/librarySelectorDisplay.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  kind: {
    type: String,
    default: 'model'
  },
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  searchQuery: {
    type: String,
    default: ''
  },
  page: {
    type: Number,
    default: 1
  },
  total: {
    type: Number,
    default: 0
  },
  pageSize: {
    type: Number,
    default: 12
  },
  isAdded: {
    type: Function,
    default: () => false
  }
})

const emit = defineEmits(['close', 'update:searchQuery', 'search', 'page-change', 'add', 'open-detail'])

const dialogPanel = ref(null)

const isModelSelector = computed(() => props.kind === 'model')
const titleId = computed(() => `library-selector-${props.kind}-title`)
const dialogTitle = computed(() => (isModelSelector.value ? 'Add model' : 'Add data method'))
const dialogSubtitle = computed(() => (
  isModelSelector.value
    ? 'Select computational models from the OpenGMS model library.'
    : 'Select reusable processing methods for notebook workflows.'
))
const searchPlaceholder = computed(() => (
  isModelSelector.value ? 'Search models...' : 'Search data methods...'
))
const emptyTitle = computed(() => (
  isModelSelector.value ? 'No models found' : 'No data methods found'
))
const totalPages = computed(() => Math.max(1, Math.ceil(Number(props.total || 0) / props.pageSize)))
const resultSummary = computed(() => {
  if (!props.total) return 'No results'
  const start = ((props.page - 1) * props.pageSize) + 1
  const end = Math.min(props.total, start + props.items.length - 1)
  return `${start}-${end} of ${props.total}`
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    dialogPanel.value?.focus()
  }
)

function requestClose() {
  if (props.loading) return
  emit('close')
}

function emitSearch() {
  emit('search')
}

function isItemAdded(item) {
  return Boolean(props.isAdded(item))
}
</script>

<style scoped>
.library-selector-layer {
  position: fixed;
  inset: 0;
  z-index: 4990;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(10px);
}

.library-selector-dialog {
  width: min(760px, 100%);
  max-height: min(88vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #cfd8e8;
  border-radius: 8px;
  color: #0f172a;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  outline: none;
}

.library-selector-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px 18px;
  border-bottom: 1px solid #e3e9f4;
}

.library-selector-eyebrow {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.library-selector-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.18;
  font-weight: 800;
}

.library-selector-header p:last-child {
  margin: 8px 0 0;
  color: #516175;
  font-size: 14px;
  line-height: 1.55;
}

.close-button {
  width: 34px;
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.close-button:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.library-selector-body {
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  padding: 20px 28px;
  overflow: hidden;
}

.library-selector-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.library-selector-search label {
  display: grid;
  gap: 8px;
}

.library-selector-search label span {
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

.library-selector-search input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.library-selector-search input:focus {
  border-color: #0b5fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.library-resource-list {
  min-height: 0;
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
}

.library-resource-item {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding: 14px;
  border: 1px solid #d8e1ef;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.library-resource-item:hover {
  border-color: #b8c6dc;
  background: #fbfdff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.library-resource-item.added {
  background: #f8fafc;
}

.resource-mark {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.resource-summary {
  min-width: 0;
}

.resource-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.resource-title-row h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  line-height: 1.3;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-chip-row,
.resource-tag-row,
.resource-meta-row,
.resource-io-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.resource-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 7px;
  border-radius: 6px;
  background: #eef2f7;
  color: #475569;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.resource-chip.public,
.resource-chip.online,
.resource-chip.execution {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.resource-chip.deployed {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.resource-chip.engine {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.resource-chip.health {
  background: rgba(99, 102, 241, 0.1);
  color: #4338ca;
}

.resource-description {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: #516175;
  font-size: 13px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.resource-io-row {
  margin-top: 10px;
}

.resource-io-row span {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid #d8e1ef;
  border-radius: 6px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.resource-io-row strong {
  color: #0f172a;
  font-size: 12px;
}

.resource-tag-row {
  margin-top: 10px;
}

.resource-tag {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 0 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
}

.resource-meta-row {
  margin-top: 9px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.resource-actions {
  display: grid;
  gap: 8px;
  justify-items: stretch;
}

.dialog-btn {
  min-width: 96px;
  height: 38px;
  padding: 0 13px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.dialog-btn.compact {
  min-width: 88px;
  height: 34px;
  font-size: 13px;
}

.dialog-btn.ghost {
  background: #ffffff;
  color: #1e293b;
}

.dialog-btn.ghost:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f8fafc;
}

.dialog-btn.primary {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.dialog-btn.primary:hover:not(:disabled) {
  background: #111827;
}

.dialog-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.selector-state {
  min-height: 260px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  text-align: center;
}

.selector-state p,
.selector-state strong {
  margin: 0;
}

.selector-state strong {
  color: #0f172a;
  font-size: 15px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #d8e1ef;
  border-top-color: #0f172a;
  border-radius: 999px;
  animation: spin 0.85s linear infinite;
}

.library-selector-footer {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 16px 28px 18px;
  border-top: 1px solid #e3e9f4;
  background: #fbfdff;
}

.result-summary {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.selector-pagination {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selector-pagination span {
  min-width: 70px;
  color: #334155;
  font-size: 13px;
  font-weight: 850;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .library-selector-layer {
    padding: 14px;
  }

  .library-selector-header,
  .library-selector-body,
  .library-selector-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .library-selector-search,
  .library-resource-item {
    grid-template-columns: 1fr;
  }

  .resource-actions {
    grid-template-columns: 1fr 1fr;
  }

  .library-selector-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .selector-pagination {
    justify-content: space-between;
  }
}
</style>
