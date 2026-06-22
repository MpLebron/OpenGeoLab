<template>
  <article class="case-card">
    <RouterLink class="case-main-link" :to="detailTo" :aria-label="caseItem.title">
      <div class="case-cover">
        <img
          v-if="caseCoverUrl && !imageFailed"
          class="case-cover-backdrop"
          :src="coverImageSrc"
          alt=""
          aria-hidden="true"
          loading="lazy"
        >
        <img
          v-if="caseCoverUrl && !imageFailed"
          class="case-cover-image"
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
          <span class="case-domain">{{ caseDomain }}</span>
          <time v-if="caseTimeLabel" :datetime="normalizedDate">{{ caseTimeLabel }}</time>
        </div>

        <h3 :title="caseItem.title">{{ caseItem.title }}</h3>
        <p class="case-summary">{{ caseItem.summary || fallbackSummary }}</p>

        <div class="case-footer">
          <div class="case-tags" v-if="visibleTags.length" :title="allTags.join(', ')">
            <span v-for="tag in visibleTags" :key="tag" :title="tag">{{ tag }}</span>
            <span v-if="hiddenTagCount" class="tag-overflow" :title="allTags.join(', ')">...</span>
          </div>

          <div class="case-owner" :title="ownerName">
            <img
              v-if="ownerAvatarSrc"
              :src="ownerAvatarSrc"
              :alt="ownerName"
              loading="lazy"
              @error="avatarFailed = true"
            >
            <span class="owner-name">{{ ownerName }}</span>
          </div>
        </div>
      </div>
    </RouterLink>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { resolvePublicResourceUrl } from '../utils/apiClient.js'
import { buildGithubStyleIdenticonDataUri } from '../utils/generatedAvatar.js'

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
const avatarFailed = ref(false)

const allTags = computed(() => {
  const tags = Array.isArray(props.caseItem.case?.tags)
    ? props.caseItem.case.tags
    : props.caseItem.tags
  return Array.isArray(tags)
    ? tags.filter(Boolean)
    : []
})

const visibleTags = computed(() => allTags.value.slice(0, 2))

const hiddenTagCount = computed(() => Math.max(0, allTags.value.length - visibleTags.value.length))

const caseCoverUrl = computed(() => (
  props.caseItem.coverImageUrl ||
  props.caseItem.thumbnail?.downloadPath ||
  ''
))

const coverImageSrc = computed(() => resolvePublicResourceUrl(caseCoverUrl.value))

const ownerProfile = computed(() => props.caseItem.ownerProfile || {})

const ownerName = computed(() => (
  ownerProfile.value.displayName ||
  ownerProfile.value.username ||
  props.caseItem.owner ||
  props.caseItem.authorLine ||
  'OpenGeoLab'
))

const ownerAvatarUrl = computed(() => ownerProfile.value.avatarUrl || '')

const ownerIdentity = computed(() => (
  ownerProfile.value.username ||
  props.caseItem.owner ||
  ownerName.value ||
  'OpenGeoLab'
))

const ownerAvatarSrc = computed(() => {
  if (ownerAvatarUrl.value && !avatarFailed.value) {
    return resolvePublicResourceUrl(ownerAvatarUrl.value)
  }

  return buildGithubStyleIdenticonDataUri(ownerIdentity.value)
})

const caseDomain = computed(() => (
  props.caseItem.domain ||
  props.caseItem.case?.scenario ||
  props.caseItem.runtime?.label ||
  props.fallbackDomain
))

const caseTimeLabel = computed(() => {
  if (props.caseItem.timeLabel) return props.caseItem.timeLabel
  const value = props.caseItem.modifiedAt || props.caseItem.updatedAt || props.caseItem.publishedAt
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US')
})

const detailTo = computed(() => ({
  name: 'CasesDetail',
  params: { projectId: props.caseItem.projectId || props.caseItem.id || props.caseItem.slug }
}))

const normalizedDate = computed(() => {
  return props.caseItem.modifiedAt || props.caseItem.updatedAt || props.caseItem.publishedAt || ''
})

watch(
  () => caseCoverUrl.value,
  () => {
    imageFailed.value = false
  }
)

watch(
  () => ownerAvatarUrl.value,
  () => {
    avatarFailed.value = false
  }
)
</script>

<style scoped>
.case-card {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dbe4ee;
  border-radius: 7px;
  background: var(--surface-card);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.035);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.case-card:hover {
  border-color: #b7c4d2;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.075);
  transform: translateY(-1px);
}

.case-main-link {
  flex: 1;
  height: 100%;
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
  aspect-ratio: 2 / 1;
  display: grid;
  place-items: center;
  padding: 0.6rem 0.72rem;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #f4f7fb;
}

.case-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(248, 251, 253, 0.78));
}

.case-cover::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  height: 1px;
  background: rgba(216, 226, 238, 0.82);
}

.case-cover-backdrop {
  position: absolute;
  inset: -12%;
  z-index: 0;
  width: 124%;
  height: 124%;
  display: block;
  object-fit: cover;
  opacity: 0.24;
  filter: blur(12px) saturate(0.9);
}

.case-cover-image {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  border-radius: 3px;
  filter: drop-shadow(0 8px 14px rgba(15, 23, 42, 0.06));
}

.case-cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: 4px;
  background: #eef3f8;
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
  padding: 0.95rem 1rem 0.98rem;
  background: #ffffff;
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
  margin: 0.55rem 0 0;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 1.12rem;
  line-height: 1.28;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-summary {
  margin: 0.62rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.52;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.case-footer {
  margin-top: auto;
  padding-top: 0.92rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.72rem;
  min-width: 0;
}

.case-tags {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.36rem;
  min-width: 0;
  overflow: hidden;
}

.case-tags span {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 6.9rem;
  padding: 0.22rem 0.42rem;
  border-radius: 3px;
  border: 1px solid #dae4ef;
  background: #fbfdff;
  color: #536276;
  font-size: 0.68rem;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.case-tags .tag-overflow {
  flex: 0 0 auto;
  width: 1.45rem;
  padding-inline: 0;
  text-align: center;
  color: #64748b;
}

.case-owner {
  min-width: 0;
  max-width: 7.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.38rem;
  color: #64748b;
  font-size: 0.7rem;
  line-height: 1.2;
}

.case-owner img {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border-radius: 50%;
  border: 1px solid #d7e1ec;
  background: #e8f0f6;
}

.case-owner img {
  display: block;
  object-fit: cover;
}

.owner-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
