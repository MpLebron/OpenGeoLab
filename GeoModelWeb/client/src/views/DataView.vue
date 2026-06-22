<template>
  <div class="catalog-page">
    <div class="catalog-shell">
      <aside class="catalog-sidebar">
        <div class="catalog-sidebar-head">
          <span class="catalog-sidebar-kicker">Filters</span>
          <h2 class="catalog-sidebar-title font-headline">Data Repository</h2>
          <p>{{ total || dataList.length || 0 }} resources</p>
        </div>

        <div class="catalog-filter-block category-list">
          <p class="catalog-label">Data Category</p>
          <button
            v-for="cat in localizedCategories"
            :key="cat.value"
            :class="['catalog-filter-item', { active: selectedCategory === cat.value }]"
            @click="selectCategory(cat.value)"
          >
            <span v-if="selectedCategory === cat.value" class="catalog-filter-indicator"></span>
            <span>{{ cat.label }}</span>
          </button>
        </div>

        <div class="catalog-status-block">
          <p class="catalog-label">{{ $t('dataView.sortLabel') }}</p>

          <StyledSelect
            v-model="sortField"
            class="catalog-select"
            :options="sortOptions"
            :aria-label="$t('dataView.sortLabel')"
            @change="handleSortChange"
          />

          <button class="catalog-order-btn" @click="toggleSortOrder">
            {{ sortAsc ? 'Ascending' : 'Descending' }}
          </button>
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
            <h1 class="font-headline">{{ $t('dataView.title') }}</h1>
            <p>{{ $t('dataView.subtitle') }}</p>
          </div>

          <StyledSearch
            v-model="searchQuery"
            class="catalog-search"
            :placeholder="$t('dataView.searchPlaceholder')"
            @enter="handleSearch"
          />
        </header>

        <div v-if="loading && !dataList.length" class="catalog-loading">
          <div class="spinner"></div>
          <p>{{ $t('dataView.loading') }}</p>
        </div>

        <div v-else-if="!dataList.length" class="catalog-empty">
          <p>{{ $t('dataView.noData') }}</p>
          <span>{{ $t('dataView.noDataHint') }}</span>
        </div>

        <div v-else class="catalog-list">
          <DataCard
            v-for="item in dataList"
            :key="item.id"
            :data="item"
            @view-source="openDataSourcePrompt"
            @details="openDataDetails"
          />
        </div>

        <PaginationControl
          v-if="totalPages > 1"
          class="catalog-pagination"
          :current-page="currentPage"
          :total-pages="totalPages"
          :disabled="loading"
          :previous-label="$t('dataView.previous')"
          :next-label="$t('dataView.next')"
          @change="changePage"
        />
      </section>
    </div>

    <div
      v-if="selectedData"
      class="data-modal-backdrop"
      role="presentation"
      @click.self="closeDataDetails"
    >
      <section class="data-detail-dialog" role="dialog" aria-modal="true" :aria-label="$t('dataView.detailsTitle')">
        <button class="modal-close-btn" type="button" :aria-label="$t('dataView.close')" @click="closeDataDetails">
          <AppIcon name="x" :size="18" :stroke-width="2" />
        </button>

        <p class="modal-eyebrow">{{ $t('dataView.detailsEyebrow') }}</p>
        <h2 class="font-headline">{{ selectedData.name }}</h2>
        <p class="detail-description">{{ selectedDataDescription }}</p>

        <dl class="detail-meta-grid">
          <div v-for="item in selectedDataMeta" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>

        <div v-if="selectedDataTags.length" class="detail-tag-row">
          <span v-for="tag in selectedDataTags" :key="tag">{{ tag }}</span>
        </div>

        <div class="detail-source-block">
          <span>{{ $t('dataView.sourceHost') }}</span>
          <strong>{{ selectedDataSourceHost || $t('dataView.sourceUnavailableShort') }}</strong>
        </div>

        <div class="modal-actions">
          <button type="button" class="ghost-action" @click="closeDataDetails">
            {{ $t('dataView.close') }}
          </button>
          <button
            type="button"
            class="primary-action"
            :disabled="!selectedDataSourceUrl"
            @click="openDataSourcePrompt(selectedData)"
          >
            {{ $t('dataView.viewDataSource') }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="externalPrompt"
      class="data-modal-backdrop"
      role="presentation"
      @click.self="closeExternalPrompt"
    >
      <section class="external-source-dialog" role="dialog" aria-modal="true" :aria-label="$t('dataView.externalDataTitle')">
        <button class="modal-close-btn" type="button" :aria-label="$t('dataView.close')" @click="closeExternalPrompt">
          <AppIcon name="x" :size="18" :stroke-width="2" />
        </button>

        <h2 class="font-headline">{{ $t('dataView.externalDataTitle') }}</h2>
        <p>
          {{ $t('dataView.externalDataMessage', { host: externalPrompt.host }) }}
        </p>
        <p class="external-target">{{ externalPrompt.url }}</p>

        <div class="modal-actions">
          <button type="button" class="ghost-action" @click="closeExternalPrompt">
            {{ $t('dataView.cancel') }}
          </button>
          <button type="button" class="primary-action" @click="proceedToExternalSource">
            {{ $t('dataView.proceed') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import DataCard from '../components/DataCard.vue'
import PaginationControl from '../components/PaginationControl.vue'
import StyledSearch from '../components/StyledSearch.vue'
import StyledSelect from '../components/StyledSelect.vue'
import AppIcon from '../components/AppIcon.vue'
import { notify } from '../utils/systemFeedback.js'

const { t } = useI18n()

const DATA_CENTER_WEB_HOST = 'https://geomodeling.njnu.edu.cn'

const categoryKeys = [
  { key: 'all', value: '' },
  { key: 'basicGeo', value: '基础地理' },
  { key: 'landUse', value: '土地利用/覆盖' },
  { key: 'terrain', value: '地形' },
  { key: 'landform', value: '地貌' },
  { key: 'climate', value: '气候' },
  { key: 'hydrology', value: '水文' },
  { key: 'soil', value: '土壤' },
  { key: 'vegetation', value: '植被' },
  { key: 'ecosystem', value: '生态系统' },
  { key: 'population', value: '人口' },
  { key: 'socioeconomic', value: '社会经济' },
  { key: 'agriculture', value: '农业' },
  { key: 'disaster', value: '灾害' },
  { key: 'environment', value: '环境' },
  { key: 'lake', value: '湖泊' },
  { key: 'other', value: '其他数据' }
]

const localizedCategories = computed(() => {
  return categoryKeys.map(cat => ({
    label: t(`dataView.categories.${cat.key}`),
    value: cat.value
  }))
})

const searchQuery = ref('')
const selectedCategory = ref('')
const sortField = ref('createTime')
const sortAsc = ref(false)
const dataList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(0)
const pageSize = 18
const selectedData = ref(null)
const externalPrompt = ref(null)

const sortOptions = computed(() => [
  { value: 'createTime', label: t('dataView.sortLatest') },
  { value: 'fileSize', label: t('dataView.sortSize') },
  { value: 'pageviews', label: t('dataView.sortViews') }
])

const hasActiveFilters = computed(() => (
  Boolean(searchQuery.value.trim()) ||
  Boolean(selectedCategory.value) ||
  sortField.value !== 'createTime' ||
  sortAsc.value
))

const fetchData = async (page = 1) => {
  loading.value = true
  try {
    const params = {
      asc: sortAsc.value,
      page,
      pageSize,
      searchText: searchQuery.value,
      sortField: sortField.value,
      tagClass: 'problemTags',
      tagName: selectedCategory.value
    }

    const response = await axios.post('/api/datacenter/list', params)

    if (response.data.code === 0 && response.data.data) {
      dataList.value = response.data.data.content || []
      total.value = response.data.data.totalElements || 0
      totalPages.value = response.data.data.totalPages || 0
      currentPage.value = page
    } else {
      console.error('API Error:', response.data.msg)
      dataList.value = []
    }
  } catch (error) {
    console.error('Failed to fetch data:', error)
    dataList.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchData(1)
}

const selectCategory = (category) => {
  selectedCategory.value = category
  currentPage.value = 1
  fetchData(1)
}

const handleSortChange = () => {
  currentPage.value = 1
  fetchData(1)
}

const toggleSortOrder = () => {
  sortAsc.value = !sortAsc.value
  fetchData(currentPage.value)
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  sortField.value = 'createTime'
  sortAsc.value = false
  currentPage.value = 1
  fetchData(1)
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    fetchData(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const splitTags = value => {
  if (!value) return []
  return String(value)
    .split(/[，,]/)
    .map(item => item.trim())
    .filter(Boolean)
}

const isAbsoluteUrl = value => /^https?:\/\//i.test(String(value || '').trim())

const normalizeSourceUrl = value => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (isAbsoluteUrl(text)) return text

  if (text.startsWith('/')) {
    return `${DATA_CENTER_WEB_HOST}${text}`
  }

  return ''
}

const resolveDataSourceUrl = data => {
  const children = Array.isArray(data?.subDataItems) ? data.subDataItems : []
  const candidates = [
    data?.dataContainerUrl,
    data?.fileWebAddress,
    data?.sourceUrl,
    ...children.flatMap(item => [
      item?.dataContainerUrl,
      item?.fileWebAddress
    ])
  ]

  for (const candidate of candidates) {
    const url = normalizeSourceUrl(candidate)
    if (url) return url
  }

  return ''
}

const resolveSourceHost = url => {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

const getDataDescription = data => {
  const description = String(data?.description || '').trim()
  if (description) return description

  const childDescription = String(data?.subDataItems?.[0]?.description || '').trim()
  if (childDescription) return childDescription

  return t('dataCard.noDescription')
}

const getDataSize = data => {
  const rawSize = data?.fileSize || data?.subDataItems?.[0]?.size
  if (!rawSize) return t('dataCard.unknown')
  const numeric = Number.parseFloat(rawSize)
  if (!Number.isFinite(numeric) || numeric <= 0) return String(rawSize)
  if (String(rawSize).match(/[a-z]/i)) return String(rawSize).toUpperCase()
  if (numeric < 1024) return `${numeric} B`
  if (numeric < 1024 * 1024) return `${(numeric / 1024).toFixed(1)} KB`
  if (numeric < 1024 * 1024 * 1024) return `${(numeric / (1024 * 1024)).toFixed(1)} MB`
  return `${(numeric / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const getDataType = data => {
  const type = data?.subDataItems?.[0]?.type || data?.type || ''
  return String(type || t('dataCard.unknownType')).toUpperCase()
}

const getFileCount = data => {
  const count = data?.subDataItems?.length || 0
  return count > 0 ? count : 1
}

const selectedDataDescription = computed(() => getDataDescription(selectedData.value))
const selectedDataSourceUrl = computed(() => resolveDataSourceUrl(selectedData.value))
const selectedDataSourceHost = computed(() => resolveSourceHost(selectedDataSourceUrl.value))
const selectedDataTags = computed(() => {
  if (!selectedData.value) return []
  return [
    ...splitTags(selectedData.value.problemTags),
    ...splitTags(selectedData.value.normalTags)
  ].slice(0, 8)
})

const selectedDataMeta = computed(() => {
  if (!selectedData.value) return []

  const data = selectedData.value
  return [
    { label: t('dataView.detailType'), value: getDataType(data) },
    { label: t('dataView.detailSize'), value: getDataSize(data) },
    { label: t('dataView.detailFiles'), value: String(getFileCount(data)) },
    { label: t('dataView.detailAccess'), value: data.publicBoolean ? t('dataCard.public') : t('dataCard.restricted') },
    { label: t('dataView.detailCreated'), value: String(data.createTime || '--').split(' ')[0] },
    { label: t('dataView.detailProvider'), value: data.userEmail || '--' }
  ]
})

const openDataDetails = data => {
  selectedData.value = data
}

const closeDataDetails = () => {
  selectedData.value = null
}

const openDataSourcePrompt = data => {
  const url = resolveDataSourceUrl(data)
  if (!url) {
    notify(t('dataView.sourceUnavailable'), 'warning')
    return
  }

  externalPrompt.value = {
    title: data?.name || t('dataView.title'),
    url,
    host: resolveSourceHost(url) || t('dataView.sourceUnavailableShort')
  }
}

const closeExternalPrompt = () => {
  externalPrompt.value = null
}

const proceedToExternalSource = () => {
  if (!externalPrompt.value?.url) return
  window.open(externalPrompt.value.url, '_blank', 'noopener,noreferrer')
  closeExternalPrompt()
}

onMounted(() => {
  fetchData()
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
  font-size: 0.96rem;
  font-weight: 650;
  letter-spacing: 0;
  text-transform: none;
  color: #111111;
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

.category-list {
  max-height: 46vh;
  overflow: auto;
  padding-right: 0.25rem;
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

.catalog-label {
  margin: 0 0 0.55rem;
  color: #8a8a8a;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.catalog-order-btn {
  width: 100%;
  min-height: 36px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font: inherit;
}

.catalog-select {
  width: 100%;
}

.catalog-order-btn {
  margin-top: 0.55rem;
  background: #ffffff;
  color: #242424;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  cursor: pointer;
  box-shadow: none;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}

.catalog-order-btn:hover,
.catalog-reset-btn:hover {
  border-color: #d4d4d4;
  background: #f7f7f7;
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

.data-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.54);
}

.data-detail-dialog,
.external-source-dialog {
  position: relative;
  width: min(100%, 680px);
  max-height: min(86vh, 760px);
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22);
}

.data-detail-dialog {
  padding: 1.45rem;
}

.external-source-dialog {
  padding: 1.65rem;
}

.modal-close-btn {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.65rem;
  line-height: 1;
  cursor: pointer;
}

.modal-close-btn:hover {
  background: #f8fafc;
  color: var(--primary-strong);
}

.modal-eyebrow {
  margin: 0 0 0.55rem;
  color: var(--accent-color);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.data-detail-dialog h2,
.external-source-dialog h2 {
  margin: 0;
  padding-right: 2.4rem;
  color: var(--primary-strong);
  font-size: clamp(1.45rem, 2.5vw, 2rem);
  line-height: 1.16;
  letter-spacing: 0;
}

.detail-description,
.external-source-dialog p {
  margin: 0.85rem 0 0;
  color: var(--text-secondary);
  font-size: 0.98rem;
  line-height: 1.7;
}

.detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 1rem 0 0;
}

.detail-meta-grid div {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: #f8fafc;
}

.detail-meta-grid dt {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.detail-meta-grid dd {
  margin: 0.28rem 0 0;
  color: var(--primary-strong);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.detail-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1rem;
}

.detail-tag-row span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.55rem;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  background: #f8fafc;
  color: #354a53;
  font-size: 0.72rem;
  font-weight: 800;
}

.detail-source-block {
  display: grid;
  gap: 0.25rem;
  margin-top: 1rem;
  padding: 0.85rem;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
}

.detail-source-block span {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.detail-source-block strong {
  color: var(--primary-strong);
  overflow-wrap: anywhere;
}

.external-target {
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: #f8fafc;
  color: var(--primary-strong) !important;
  font-family: 'Manrope', sans-serif;
  font-size: 0.82rem !important;
  overflow-wrap: anywhere;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.35rem;
}

.primary-action,
.ghost-action {
  min-height: 42px;
  padding: 0 1rem;
  border-radius: 4px;
  font-family: 'Manrope', sans-serif;
  font-weight: 900;
  cursor: pointer;
}

.primary-action {
  border: 1px solid var(--primary-strong);
  background: var(--primary-strong);
  color: #ffffff;
}

.primary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost-action {
  border: 1px solid var(--border-color);
  background: #ffffff;
  color: var(--primary-strong);
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

  .detail-meta-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .primary-action,
  .ghost-action {
    width: 100%;
  }
}
</style>
