<template>
  <div class="application-detail-page">
    <section class="detail-shell detail-page-top">
      <RouterLink class="back-link" :to="{ name: 'Application' }">
        <span aria-hidden="true">&larr;</span>
        {{ $t('applicationDetail.back') }}
      </RouterLink>

      <div v-if="loading" class="detail-state">
        <div class="spinner"></div>
        <p>{{ $t('applicationDetail.loading') }}</p>
      </div>

      <div v-else-if="error" class="detail-state">
        <p>{{ error }}</p>
        <button type="button" @click="fetchApplication">
          {{ $t('applicationView.retry') }}
        </button>
      </div>

      <template v-else-if="application">
        <section class="overview-panel">
          <div class="detail-cover">
            <img
              v-if="application.coverImageUrl && !imageFailed"
              :src="coverImageSrc"
              :alt="application.title"
              @error="imageFailed = true"
            >
            <div v-else class="detail-cover-fallback" aria-hidden="true">
              <span></span>
            </div>
          </div>

          <div class="detail-heading">
            <p class="detail-eyebrow">{{ application.category || 'AIXES Application' }}</p>
            <h1>{{ application.title }}</h1>
            <p class="detail-description">
              {{ application.description || $t('applicationView.noDescription') }}
            </p>

            <div class="detail-tags" v-if="visibleTags.length">
              <span v-for="tag in visibleTags" :key="tag">{{ tag }}</span>
            </div>
          </div>

          <aside class="overview-side" aria-label="Application summary">
            <div class="overview-stat" v-if="application.time">
              <span>{{ $t('applicationDetail.updated') }}</span>
              <strong>{{ application.time }}</strong>
            </div>

            <div class="overview-stat" v-if="application.author">
              <span>{{ $t('applicationDetail.author') }}</span>
              <strong>{{ compactAuthor }}</strong>
            </div>

            <div class="detail-actions" v-if="activeLinks.length">
              <a
                v-for="link in activeLinks"
                :key="link.key"
                :href="link.href"
                target="_blank"
                rel="noreferrer"
                class="detail-action"
              >
                <span class="action-icon" :class="`icon-${link.key}`" aria-hidden="true"></span>
                {{ link.label }}
              </a>
            </div>
          </aside>
        </section>
      </template>
    </section>

    <section v-if="application" class="detail-shell detail-board">
      <article class="content-panel detail-main-panel">
        <div class="panel-heading">
          <span class="panel-menu-icon" aria-hidden="true"></span>
          <h2>{{ $t('applicationDetail.details') }}</h2>
        </div>

        <div v-if="application.content" class="application-markdown" v-html="renderedContent"></div>
        <div v-else class="detail-content-empty">
          {{ $t('applicationDetail.noContent') }}
        </div>
      </article>

      <aside class="detail-sidebar">
        <section class="content-panel next-panel">
          <p class="side-kicker">{{ $t('applicationDetail.nextApplication') }}</p>

          <RouterLink
            v-if="nextApplication"
            class="next-application-link"
            :to="applicationRoute(nextApplication)"
          >
            <span>{{ nextApplication.category || 'Application' }}</span>
            <h3>{{ nextApplication.title }}</h3>
            <p>{{ nextApplication.description || $t('applicationView.noDescription') }}</p>
            <strong>{{ $t('applicationDetail.openNext') }} &rarr;</strong>
          </RouterLink>

          <RouterLink v-else class="next-application-link empty-next" :to="{ name: 'Application' }">
            <h3>{{ $t('applicationDetail.noNext') }}</h3>
            <strong>{{ $t('applicationDetail.back') }} &rarr;</strong>
          </RouterLink>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { resolvePublicResourceUrl } from '../utils/apiClient.js'

const route = useRoute()
const { t } = useI18n()

const application = ref(null)
const applicationList = ref([])
const loading = ref(false)
const error = ref('')
const imageFailed = ref(false)

const visibleTags = computed(() => {
  return Array.isArray(application.value?.tags)
    ? application.value.tags.filter(Boolean).slice(0, 8)
    : []
})

const activeLinks = computed(() => {
  const links = application.value?.links || {}
  return [
    { key: 'code', label: t('applicationDetail.links.code'), href: links.code },
    { key: 'demo', label: t('applicationDetail.links.demo'), href: links.demo },
    { key: 'paper', label: t('applicationDetail.links.paper'), href: links.paper },
    { key: 'video', label: t('applicationDetail.links.video'), href: links.video }
  ].filter(link => Boolean(link.href))
})

const coverImageSrc = computed(() => resolvePublicResourceUrl(application.value?.coverImageUrl))

const renderedContent = computed(() => {
  return renderMarkdown(application.value?.content || '')
})

const compactAuthor = computed(() => {
  const author = String(application.value?.author || '').trim()
  if (!author) {
    return ''
  }
  return author.length > 32 ? `${author.slice(0, 29)}...` : author
})

const nextApplication = computed(() => {
  const current = application.value
  const list = applicationList.value
  if (!current || list.length < 2) {
    return null
  }

  const currentIds = new Set([current.id, current.sourceId].filter(Boolean).map(String))
  const currentIndex = list.findIndex(item => currentIds.has(String(item.id)) || currentIds.has(String(item.sourceId)))

  if (currentIndex === -1) {
    return list.find(item => !currentIds.has(String(item.id)) && !currentIds.has(String(item.sourceId))) || null
  }

  return list[(currentIndex + 1) % list.length] || null
})

const applicationRoute = item => ({
  name: 'ApplicationDetail',
  params: {
    id: item.sourceId || item.id
  }
})

const fetchApplication = async () => {
  const id = route.params.id
  if (!id) {
    return
  }

  loading.value = true
  error.value = ''
  imageFailed.value = false

  try {
    const response = await axios.get(`/api/applications/schemes/${encodeURIComponent(id)}`)
    application.value = response.data

    try {
      const listResponse = await axios.get('/api/applications/schemes', {
        params: { page: 1, limit: 50 }
      })
      applicationList.value = Array.isArray(listResponse.data.data) ? listResponse.data.data : []
    } catch (listError) {
      console.warn('Failed to fetch related applications:', listError)
      applicationList.value = []
    }
  } catch (err) {
    console.error('Failed to fetch application detail:', err)
    application.value = null
    error.value = err.response?.data?.message || err.message || t('applicationDetail.notFound')
  } finally {
    loading.value = false
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;')
}

function safeUrl(value) {
  const source = String(value || '').trim().replace(/^<|>$/g, '')
  if (/^(https?:|mailto:|\/|#)/i.test(source)) {
    return resolvePublicResourceUrl(source)
  }
  return '#'
}

function renderInlineMarkdown(value) {
  return String(value || '')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => {
      const href = escapeAttribute(safeUrl(src))
      return `<img src="${href}" alt="${escapeAttribute(alt)}" loading="lazy">`
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const url = escapeAttribute(safeUrl(href))
      return `<a href="${url}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
    })
    .replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function renderBlock(block) {
  const trimmed = block.trim()
  if (!trimmed) {
    return ''
  }

  if (/^<(h[1-6]|div|p|ul|ol|li|pre|blockquote|table|img|figure|center|font)\b/i.test(trimmed)) {
    return trimmed
  }

  const lines = trimmed.split('\n')
  if (lines.every(line => /^-\s+/.test(line.trim()))) {
    const items = lines
      .map(line => `<li>${renderInlineMarkdown(line.trim().replace(/^-\s+/, ''))}</li>`)
      .join('')
    return `<ul>${items}</ul>`
  }

  return `<p>${renderInlineMarkdown(trimmed).replace(/\n/g, '<br>')}</p>`
}

function sanitizeRenderedHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
}

function renderMarkdown(value) {
  if (!value) {
    return ''
  }

  let content = String(value).replace(/\r\n/g, '\n')

  content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_, language, code) => {
    const className = language ? ` class="language-${escapeAttribute(language)}"` : ''
    return `\n\n<pre><code${className}>${escapeHtml(code.trim())}</code></pre>\n\n`
  })

  content = content
    .replace(/^######\s+(.+)$/gm, (_, text) => `<h6>${renderInlineMarkdown(text)}</h6>`)
    .replace(/^#####\s+(.+)$/gm, (_, text) => `<h5>${renderInlineMarkdown(text)}</h5>`)
    .replace(/^####\s+(.+)$/gm, (_, text) => `<h4>${renderInlineMarkdown(text)}</h4>`)
    .replace(/^###\s+(.+)$/gm, (_, text) => `<h3>${renderInlineMarkdown(text)}</h3>`)
    .replace(/^##\s+(.+)$/gm, (_, text) => `<h2>${renderInlineMarkdown(text)}</h2>`)
    .replace(/^#\s+(.+)$/gm, (_, text) => `<h1>${renderInlineMarkdown(text)}</h1>`)

  return sanitizeRenderedHtml(content.split(/\n{2,}/).map(renderBlock).join('\n'))
}

watch(
  () => route.params.id,
  () => {
    fetchApplication()
  }
)

onMounted(() => {
  fetchApplication()
})
</script>

<style scoped>
.application-detail-page {
  min-height: 100vh;
  background: var(--bg-color);
  color: var(--primary-strong);
}

.detail-shell {
  width: min(100% - 3rem, 1360px);
  margin: 0 auto;
}

.detail-page-top {
  padding: 1.35rem 0 1.25rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 38px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 800;
}

.back-link:hover {
  color: var(--accent-color);
}

.overview-panel {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr) minmax(220px, 280px);
  gap: 1.75rem;
  align-items: center;
  min-height: 210px;
  margin-top: 0.75rem;
  padding: 1.65rem 2rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
  box-shadow: none;
}

.detail-cover {
  width: 100%;
  aspect-ratio: 1.45 / 1;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #e8eef1;
  box-shadow: none;
}

.detail-cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.detail-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #edf2f4;
}

.detail-cover-fallback span {
  width: 54px;
  height: 54px;
  border: 2px solid rgba(0, 30, 64, 0.35);
  border-radius: 4px;
  position: relative;
}

.detail-cover-fallback span::before,
.detail-cover-fallback span::after {
  content: '';
  position: absolute;
  left: 13px;
  right: 13px;
  height: 2px;
  background: rgba(0, 30, 64, 0.35);
}

.detail-cover-fallback span::before {
  top: 18px;
}

.detail-cover-fallback span::after {
  top: 31px;
}

.detail-heading {
  min-width: 0;
}

.detail-eyebrow {
  margin: 0 0 0.6rem;
  color: var(--accent-color);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.detail-heading h1 {
  margin: 0;
  color: var(--text-primary);
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: clamp(1.55rem, 2.35vw, 2.55rem);
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0;
}

.detail-description {
  max-width: 820px;
  margin: 0.95rem 0 0;
  color: var(--text-secondary);
  font-size: 0.96rem;
  line-height: 1.72;
}

.overview-side {
  display: grid;
  gap: 0.85rem;
  align-content: center;
}

.overview-stat {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.overview-stat span {
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
}

.overview-stat strong {
  min-width: 0;
  color: var(--primary-strong);
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 1.05rem;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  margin-top: 1rem;
}

.detail-tags span {
  max-width: 100%;
  padding: 0.32rem 0.62rem;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  color: var(--primary-strong);
  background: #f8fafc;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.detail-action {
  min-height: 40px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.72rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--primary-strong);
  background: #ffffff;
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 900;
  box-shadow: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.detail-action:hover {
  background: #f8fafc;
  border-color: #a8b3c2;
  color: var(--primary-strong);
}

.action-icon {
  width: 20px;
  height: 20px;
  position: relative;
  display: inline-block;
  flex: 0 0 20px;
}

.icon-code::before {
  content: '</>';
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
}

.icon-demo,
.icon-paper,
.icon-video {
  border: 2px solid currentColor;
  border-radius: 4px;
}

.icon-paper::before,
.icon-paper::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  background: currentColor;
}

.icon-paper::before {
  top: 6px;
}

.icon-paper::after {
  top: 12px;
}

.icon-video {
  border-radius: 6px;
}

.icon-video::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 4px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid currentColor;
}

.detail-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  gap: 1.25rem;
  align-items: start;
  padding: 0 0 4.2rem;
}

.content-panel {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-card);
  box-shadow: none;
}

.detail-main-panel {
  min-height: 640px;
  padding: 1.8rem 2rem 2.3rem;
}

.panel-heading {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.panel-heading h2 {
  margin: 0;
  color: var(--primary-strong);
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.25;
}

.panel-menu-icon {
  width: 18px;
  height: 14px;
  display: inline-block;
  position: relative;
  color: var(--accent-color);
}

.panel-menu-icon::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 6px 0 currentColor, 0 12px 0 currentColor;
}

.detail-sidebar {
  display: grid;
  gap: 1.05rem;
  position: sticky;
  top: 96px;
}

.next-panel {
  padding: 1.55rem 1.65rem;
}

.side-kicker {
  margin: 0 0 0.55rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.next-application-link {
  display: grid;
  gap: 0.65rem;
  color: inherit;
  text-decoration: none;
}

.next-application-link span {
  color: var(--accent-color);
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.next-application-link h3 {
  margin: 0;
  color: var(--text-primary);
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: 0;
}

.next-application-link p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.next-application-link strong {
  color: var(--accent-color);
  font-size: 0.9rem;
  font-weight: 900;
}

.empty-next {
  min-height: 140px;
  align-content: center;
}

.application-markdown {
  max-width: none;
  color: var(--text-secondary);
  font-size: 0.96rem;
  line-height: 1.82;
}

.application-markdown :deep(h1),
.application-markdown :deep(h2),
.application-markdown :deep(h3),
.application-markdown :deep(h4),
.application-markdown :deep(h5),
.application-markdown :deep(h6) {
  margin: 2rem 0 0.8rem;
  color: var(--text-primary);
  font-family: 'Manrope', 'Inter', sans-serif;
  font-weight: 900;
  line-height: 1.22;
  letter-spacing: 0;
}

.application-markdown :deep(h1) {
  font-size: 2rem;
}

.application-markdown :deep(h2) {
  font-size: 1.55rem;
}

.application-markdown :deep(h3) {
  font-size: 1.2rem;
}

.application-markdown :deep(h4),
.application-markdown :deep(h5),
.application-markdown :deep(h6) {
  font-size: 1.03rem;
}

.application-markdown :deep(p) {
  margin: 0 0 1.05rem;
}

.application-markdown :deep(a) {
  color: var(--accent-color);
  font-weight: 800;
  text-decoration: none;
}

.application-markdown :deep(a:hover) {
  text-decoration: underline;
}

.application-markdown :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.25rem 0;
  border-radius: 8px;
  border: 1px solid rgba(210, 215, 224, 0.76);
}

.application-markdown :deep(pre) {
  overflow-x: auto;
  padding: 1rem;
  border-radius: 8px;
  background: #102330;
  color: #f6fbff;
}

.application-markdown :deep(code) {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.9em;
}

.application-markdown :deep(p code),
.application-markdown :deep(li code) {
  padding: 0.1rem 0.28rem;
  border-radius: 4px;
  background: rgba(0, 30, 64, 0.08);
  color: var(--primary-strong);
}

.application-markdown :deep(ul),
.application-markdown :deep(ol) {
  margin: 0 0 1.1rem;
  padding-left: 1.35rem;
}

.detail-state,
.detail-content-empty {
  min-height: 280px;
  display: grid;
  place-items: center;
  justify-items: center;
  gap: 1rem;
  color: var(--text-secondary);
  font-weight: 800;
}

.detail-state button {
  min-height: 42px;
  padding: 0 1rem;
  border: 1px solid rgba(0, 104, 118, 0.18);
  border-radius: 8px;
  color: #ffffff;
  background: var(--accent-color);
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

@media (max-width: 1080px) {
  .detail-shell {
    width: min(100% - 2rem, 760px);
  }

  .overview-panel,
  .detail-board {
    grid-template-columns: 1fr;
  }

  .overview-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-sidebar {
    position: static;
    grid-template-columns: 1fr;
  }

  .detail-heading h1 {
    font-size: 2.15rem;
  }

}

@media (max-width: 560px) {
  .detail-page-top {
    padding: 1rem 0 1.1rem;
  }

  .overview-panel,
  .detail-main-panel,
  .next-panel {
    padding: 1.15rem;
  }

  .overview-side {
    grid-template-columns: 1fr;
  }

  .detail-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-heading h1 {
    font-size: 1.75rem;
  }

  .detail-cover {
    aspect-ratio: 16 / 10;
  }
}
</style>
