<template>
  <nav class="pagination-control" aria-label="Pagination">
    <button
      type="button"
      class="pagination-nav"
      :disabled="disabled || normalizedCurrentPage === 1"
      :aria-label="previousLabel"
      @click="goToPage(normalizedCurrentPage - 1)"
    >
      ‹
    </button>

    <template v-for="item in pageItems" :key="item.key">
      <button
        v-if="item.type === 'page'"
        type="button"
        :class="['pagination-page', { 'is-active': item.value === normalizedCurrentPage }]"
        :disabled="disabled || item.value === normalizedCurrentPage"
        :aria-label="item.value === normalizedCurrentPage ? `Current page, page ${item.value}` : `Go to page ${item.value}`"
        :aria-current="item.value === normalizedCurrentPage ? 'page' : undefined"
        @click="goToPage(item.value)"
      >
        {{ item.value }}
      </button>

      <span v-else class="pagination-ellipsis" aria-hidden="true">…</span>
    </template>

    <button
      type="button"
      class="pagination-nav"
      :disabled="disabled || normalizedCurrentPage === normalizedTotalPages"
      :aria-label="nextLabel"
      @click="goToPage(normalizedCurrentPage + 1)"
    >
      ›
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  previousLabel: {
    type: String,
    default: 'Previous page'
  },
  nextLabel: {
    type: String,
    default: 'Next page'
  }
})

const emit = defineEmits(['change'])

const normalizedTotalPages = computed(() => {
  return Math.max(1, Math.floor(Number(props.totalPages) || 1))
})

const normalizedCurrentPage = computed(() => {
  const page = Math.floor(Number(props.currentPage) || 1)
  return Math.min(Math.max(page, 1), normalizedTotalPages.value)
})

const makePage = value => ({
  type: 'page',
  value,
  key: `page-${value}`
})

const makeEllipsis = key => ({
  type: 'ellipsis',
  key
})

const pageItems = computed(() => {
  const total = normalizedTotalPages.value
  const current = normalizedCurrentPage.value

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => makePage(index + 1))
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5].map(makePage).concat(makeEllipsis('ellipsis-end'), makePage(total))
  }

  if (current >= total - 3) {
    return [makePage(1), makeEllipsis('ellipsis-start')].concat(
      [total - 4, total - 3, total - 2, total - 1, total].map(makePage)
    )
  }

  return [
    makePage(1),
    makeEllipsis('ellipsis-start'),
    makePage(current - 1),
    makePage(current),
    makePage(current + 1),
    makeEllipsis('ellipsis-end'),
    makePage(total)
  ]
})

const goToPage = page => {
  if (
    props.disabled ||
    page < 1 ||
    page > normalizedTotalPages.value ||
    page === normalizedCurrentPage.value
  ) {
    return
  }

  emit('change', page)
}
</script>

<style scoped>
.pagination-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 2rem;
}

.pagination-nav,
.pagination-page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 42px;
  padding: 0 0.65rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--surface-card);
  color: var(--primary-strong);
  font-family: 'Manrope', sans-serif;
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.pagination-nav {
  font-size: 1.55rem;
  font-weight: 700;
}

.pagination-nav:not(:disabled):hover,
.pagination-page:not(:disabled):hover {
  border-color: #a8b3c2;
  background: #f8fafc;
}

.pagination-page.is-active {
  border-color: var(--primary-strong);
  background: var(--primary-strong);
  color: #ffffff;
  cursor: default;
}

.pagination-nav:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.pagination-page:disabled:not(.is-active) {
  opacity: 0.55;
  cursor: not-allowed;
}

.pagination-page.is-active:disabled {
  opacity: 1;
}

.pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 42px;
  color: var(--text-muted);
  font-family: 'Manrope', sans-serif;
  font-size: 0.9rem;
  font-weight: 900;
}

@media (max-width: 560px) {
  .pagination-control {
    gap: 0.35rem;
  }

  .pagination-nav,
  .pagination-page {
    min-width: 36px;
    height: 36px;
    padding: 0 0.5rem;
    font-size: 0.8rem;
  }

  .pagination-nav {
    font-size: 1.35rem;
  }

  .pagination-ellipsis {
    min-width: 18px;
    height: 36px;
  }
}
</style>
