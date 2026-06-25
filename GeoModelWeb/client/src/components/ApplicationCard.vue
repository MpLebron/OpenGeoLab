<template>
  <article class="application-card">
    <RouterLink class="application-main-link" :to="detailTo" :aria-label="application.title">
      <div class="application-cover">
        <img
          v-if="application.coverImageUrl && !imageFailed"
          :src="coverImageSrc"
          :alt="application.title"
          loading="lazy"
          @error="imageFailed = true"
        >
        <div v-else class="application-cover-fallback" aria-hidden="true">
          <span></span>
        </div>
      </div>

      <div class="application-body">
        <div class="application-title-line">
          <AppIcon class="document-icon" name="bookMarked" :size="15" :stroke-width="1.9" />
          <h3 :title="application.title">{{ application.title }}</h3>
        </div>

        <p class="application-description">
          {{ application.description || fallbackDescription }}
        </p>

        <div v-if="visibleTags.length || application.time" class="application-meta-row">
          <div class="application-tags" v-if="visibleTags.length" :title="tagTooltip">
            <span v-for="tag in visibleTags" :key="tag" :title="tag">{{ tag }}</span>
          </div>
          <time v-if="application.time" :datetime="application.time" class="application-date">
            {{ application.time }}
          </time>
        </div>
      </div>
    </RouterLink>

    <div class="application-actions" aria-label="Application links">
      <component
        v-for="action in actions"
        :key="action.key"
        :is="action.href ? 'a' : 'span'"
        class="application-action"
        :class="{ disabled: !action.href }"
        :href="action.href || undefined"
        :target="action.href ? '_blank' : undefined"
        :rel="action.href ? 'noreferrer' : undefined"
        :title="action.label"
        :aria-label="action.label"
        :data-tooltip="action.label"
      >
        <AppIcon class="action-icon" :name="actionIconName(action.key)" :size="15" :stroke-width="1.9" />
      </component>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { resolvePublicResourceUrl } from '../utils/apiClient.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  application: {
    type: Object,
    required: true
  },
  fallbackDescription: {
    type: String,
    default: 'No description available.'
  }
})

const imageFailed = ref(false)

watch(
  () => props.application.coverImageUrl,
  () => {
    imageFailed.value = false
  }
)

const visibleTags = computed(() => {
  return Array.isArray(props.application.tags)
    ? props.application.tags.filter(Boolean).slice(0, 4)
    : []
})

const tagTooltip = computed(() => {
  return Array.isArray(props.application.tags)
    ? props.application.tags.filter(Boolean).join(', ')
    : ''
})

const coverImageSrc = computed(() => resolvePublicResourceUrl(props.application.coverImageUrl))

const actions = computed(() => {
  const links = props.application.links || {}
  return [
    { key: 'code', label: 'Code', href: links.code },
    { key: 'demo', label: 'Demo', href: links.demo },
    { key: 'paper', label: 'Paper', href: links.paper },
    { key: 'video', label: 'Video', href: links.video }
  ]
})

const actionIconName = (key) => ({
  code: 'code',
  demo: 'external',
  paper: 'fileText',
  video: 'play'
}[key] || 'external')

const detailTo = computed(() => ({
  name: 'ApplicationDetail',
  params: {
    id: props.application.sourceId || props.application.id
  }
}))
</script>

<style scoped>
.application-card {
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

.application-card:hover {
  border-color: #a8b3c2;
  background: #fbfcfe;
}

.application-main-link {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
}

.application-main-link:focus-visible {
  outline: 3px solid rgba(0, 104, 118, 0.28);
  outline-offset: -3px;
}

.application-main-link:hover .application-title-line h3 {
  color: var(--accent-color);
}

.application-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #e8eef1;
}

.application-cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.application-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #eef2f7;
}

.application-cover-fallback span {
  width: 44px;
  height: 44px;
  border: 2px solid rgba(0, 30, 64, 0.35);
  border-radius: 4px;
  position: relative;
}

.application-cover-fallback span::before,
.application-cover-fallback span::after {
  content: '';
  position: absolute;
  background: rgba(0, 30, 64, 0.35);
}

.application-cover-fallback span::before {
  width: 18px;
  height: 2px;
  left: 12px;
  top: 14px;
}

.application-cover-fallback span::after {
  width: 22px;
  height: 2px;
  left: 10px;
  top: 24px;
}

.application-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.95rem 1rem 0.9rem;
}

.application-date {
  color: var(--text-muted);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.3;
  margin-left: auto;
  padding-top: 0.28rem;
  white-space: nowrap;
}

.application-title-line {
  min-height: 1.45rem;
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
}

.document-icon {
  flex: 0 0 18px;
  margin-top: 0.12rem;
  color: rgba(0, 104, 118, 0.82);
}

.application-title-line h3 {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.35;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.application-description {
  margin: 0.58rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.58;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.application-meta-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 0.72rem;
  min-width: 0;
}

.application-tags {
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
  min-width: 0;
}

.application-tags span {
  max-width: min(100%, 9.5rem);
  flex: 0 0 auto;
  min-width: 0;
  padding: 0.28rem 0.55rem;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  color: var(--text-muted);
  background: rgba(0, 30, 64, 0.035);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.application-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--border-light);
}

.application-action {
  min-height: 52px;
  display: grid;
  place-items: center;
  position: relative;
  color: var(--accent-color);
  text-decoration: none;
  border-right: 1px solid var(--border-light);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.application-action::before,
.application-action::after {
  position: absolute;
  left: 50%;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  transform: translate(-50%, 6px);
  transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;
  z-index: 5;
}

.application-action::before {
  content: attr(data-tooltip);
  bottom: calc(100% + 8px);
  max-width: 120px;
  padding: 0.34rem 0.55rem;
  border-radius: 4px;
  background: rgba(0, 30, 64, 0.94);
  color: #ffffff;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  box-shadow: var(--shadow-md);
}

.application-action::after {
  content: '';
  bottom: calc(100% + 3px);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid rgba(0, 30, 64, 0.94);
}

.application-action:last-child {
  border-right: 0;
}

.application-action:not(.disabled):hover {
  color: var(--primary-strong);
  background: #f1f5f9;
}

.application-action:hover::before,
.application-action:hover::after,
.application-action:focus-visible::before,
.application-action:focus-visible::after {
  visibility: visible;
  opacity: 1;
  transform: translate(-50%, 0);
}

.application-action:focus-visible {
  outline: 3px solid rgba(0, 104, 118, 0.22);
  outline-offset: -3px;
}

.application-action.disabled {
  color: rgba(115, 119, 128, 0.28);
  cursor: not-allowed;
}

.action-icon {
  flex: 0 0 auto;
}

@media (max-width: 640px) {
  .application-card {
    min-height: 0;
  }

  .application-body {
    padding: 0.92rem;
  }

  .application-action {
    min-height: 48px;
  }
}
</style>
