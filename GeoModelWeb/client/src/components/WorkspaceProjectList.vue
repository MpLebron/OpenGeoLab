<template>
  <div class="workspace-list-shell">
    <div v-if="loading" class="workspace-list-state">
      <span class="workspace-list-spinner"></span>
      <p>{{ loadingText }}</p>
    </div>

    <div v-else-if="error" class="workspace-list-state">
      <p>{{ error }}</p>
      <button v-if="showRetry" type="button" class="workspace-list-retry" @click="$emit('retry')">
        Retry
      </button>
    </div>

    <div v-else-if="!items.length" class="workspace-list-state">
      <p>{{ emptyTitle }}</p>
      <span v-if="emptyHint">{{ emptyHint }}</span>
    </div>

    <div
      v-else
      :class="[
        'workspace-project-list',
        { 'with-owner': showOwner, 'without-created': !showCreated }
      ]"
    >
      <div class="workspace-table-header" aria-hidden="true">
        <span>Project</span>
        <span>Files</span>
        <span>Size</span>
        <span>Based on</span>
        <span v-if="showOwner">Owner</span>
        <span v-if="showCreated">Created</span>
        <span>Updated</span>
        <span>Actions</span>
      </div>

      <article
        v-for="(project, index) in items"
        :key="projectKey(project, index)"
        :class="[
          'workspace-project-row',
          { 'with-owner': showOwner, 'without-created': !showCreated }
        ]"
        @dblclick="$emit('open', project)"
      >
        <button class="workspace-project-main" type="button" @click="$emit('open', project)">
          <span
            v-if="projectThumbnailSrc(project)"
            class="project-thumbnail"
            :title="projectThumbnailTitle(project)"
          >
            <img
              :src="projectThumbnailSrc(project)"
              :alt="projectThumbnailAlt(project)"
              loading="lazy"
            >
          </span>
          <span v-else :class="['project-mark', 'large', `variant-${projectMark(project).variant}`]">
            <span class="project-mark-kicker">{{ projectMark(project).kicker }}</span>
            <strong>{{ projectMark(project).label }}</strong>
          </span>

          <div class="workspace-project-copy">
            <div class="workspace-project-title-row">
              <h3>{{ projectTitle(project) }}</h3>
              <div class="project-chip-row">
                <span :class="['project-meaning-badge', projectVisibility(project).className]">
                  {{ projectVisibility(project).label }}
                </span>
                <span
                  v-if="project.forkedFrom"
                  class="project-meaning-badge fork"
                  :title="`Forked from ${project.forkedFrom.owner}/${project.forkedFrom.projectName}`"
                >
                  Fork
                </span>
                <span v-if="project.isCase" class="project-meaning-badge case" title="Published as case">
                  Case
                </span>
              </div>
            </div>
            <p class="workspace-project-summary">{{ projectSummary(project) }}</p>
          </div>
        </button>

        <div class="workspace-data-column files">
          <span>Files</span>
          <strong class="workspace-file-count">
            <AppIcon name="fileText" :size="15" :stroke-width="1.8" />
            <span>{{ projectFileLabel(project) }}</span>
          </strong>
        </div>

        <div class="workspace-data-column">
          <span>Size</span>
          <strong>{{ projectSizeLabel(project) }}</strong>
        </div>

        <div class="workspace-data-column runtime">
          <span>Based on</span>
          <strong :title="projectRuntimeBase(project)">{{ projectRuntimeBase(project) }}</strong>
        </div>

        <div v-if="showOwner" class="workspace-data-column">
          <span>Owner</span>
          <strong>@{{ project.owner || 'unknown' }}</strong>
        </div>

        <div v-if="showCreated" class="workspace-data-column">
          <span>Created</span>
          <strong>{{ formatDate(project.createdAt || project.createdTime) }}</strong>
        </div>

        <div class="workspace-data-column">
          <span>Updated</span>
          <strong>{{ formatDate(project.modifiedAt || project.updatedAt) }}</strong>
        </div>

        <div class="workspace-actions">
          <button
            v-for="action in visibleActions(project)"
            :key="action.key"
            type="button"
            :class="['action-icon-btn', action.danger ? 'danger' : '']"
            :aria-label="actionTitle(action, project)"
            :data-tooltip="actionTitle(action, project)"
            :disabled="actionDisabled(action, project)"
            @click.stop="$emit('action', { action: action.key, project })"
          >
            <AppIcon
              v-if="actionIconName(action)"
              :name="actionIconName(action)"
              :size="16"
              :stroke-width="1.8"
            />
            <span v-else class="workspace-action-label">{{ action.iconLabel || action.key }}</span>
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  getWorkspaceProjectFileLabel,
  getWorkspaceProjectMark,
  getWorkspaceProjectRuntimeImage,
  getWorkspaceProjectSizeLabel,
  getWorkspaceProjectSummary,
  getWorkspaceProjectThumbnailDownloadPath,
  getWorkspaceProjectTitle,
  getWorkspaceProjectVisibility
} from '../utils/workspaceProjectDisplay.js'
import { createApiClient } from '../utils/apiClient.js'
import AppIcon from './AppIcon.vue'

defineEmits(['open', 'action', 'retry'])

const props = defineProps({
  items: { type: Array, default: () => [] },
  actions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  emptyTitle: { type: String, default: 'No projects yet' },
  emptyHint: { type: String, default: '' },
  loadingText: { type: String, default: 'Loading projects...' },
  showRetry: { type: Boolean, default: true },
  showOwner: { type: Boolean, default: false },
  showCreated: { type: Boolean, default: true }
})

const projectKey = (project, index) => project.id || `${project.owner || 'local'}/${project.projectName || project.name || index}`
const projectTitle = getWorkspaceProjectTitle
const projectSummary = getWorkspaceProjectSummary
const projectVisibility = getWorkspaceProjectVisibility
const projectFileLabel = getWorkspaceProjectFileLabel
const projectSizeLabel = getWorkspaceProjectSizeLabel
const projectRuntimeImage = getWorkspaceProjectRuntimeImage
const projectMark = getWorkspaceProjectMark
const projectRuntimeBase = project => projectRuntimeImage(project) || '-'
const thumbnailUrls = ref({})
const thumbnailRequests = new Set()

const actionIcon = (action) => action.icon || action.key
const actionIconName = (action) => ({
  open: 'eye',
  edit: 'pencil',
  visibility: 'eye',
  case: 'fileCheck',
  fork: 'fork',
  delete: 'trash'
}[actionIcon(action)] || '')
const visibleActions = (project) => props.actions.filter(action => {
  if (typeof action.visible === 'function') return action.visible(project)
  return action.visible !== false
})
const actionDisabled = (action, project) => {
  if (typeof action.disabled === 'function') return action.disabled(project)
  return Boolean(action.disabled)
}
const actionTitle = (action, project) => {
  if (typeof action.title === 'function') return action.title(project)
  return action.title || action.key
}

const getToken = () => {
  try {
    return window.localStorage?.getItem('jupyter_token') || ''
  } catch (error) {
    return ''
  }
}

const authAxios = () => {
  const token = getToken()
  return createApiClient({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const projectThumbnailSrc = (project = {}) => thumbnailUrls.value[projectKey(project, 0)] || ''
const projectThumbnailTitle = (project = {}) => project.thumbnail?.name ? `Result thumbnail: ${project.thumbnail.name}` : 'No result thumbnail'
const projectThumbnailAlt = (project = {}) => `${projectTitle(project)} result thumbnail`

const loadThumbnailForProject = async (project, index = 0) => {
  const downloadPath = getWorkspaceProjectThumbnailDownloadPath(project)
  const key = projectKey(project, index)
  if (!downloadPath || thumbnailUrls.value[key] || thumbnailRequests.has(key)) return

  thumbnailRequests.add(key)
  try {
    const response = await authAxios().get(downloadPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    thumbnailUrls.value = {
      ...thumbnailUrls.value,
      [key]: objectUrl
    }
  } catch (error) {
    console.warn('Failed to load workspace project thumbnail:', key, error?.message || error)
  } finally {
    thumbnailRequests.delete(key)
  }
}

const loadVisibleThumbnails = () => {
  props.items.forEach((project, index) => {
    loadThumbnailForProject(project, index)
  })
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}

watch(() => props.items, loadVisibleThumbnails, { deep: true })

onMounted(loadVisibleThumbnails)

onBeforeUnmount(() => {
  for (const objectUrl of Object.values(thumbnailUrls.value)) {
    URL.revokeObjectURL(objectUrl)
  }
})
</script>

<style scoped>
.workspace-list-shell {
  width: 100%;
}

.workspace-project-list {
  --workspace-grid-columns:
    minmax(520px, 1fr)
    96px
    112px
    minmax(170px, 0.24fr)
    108px
    108px
    218px;

  display: grid;
  gap: 0.48rem;
}

.workspace-project-list.with-owner {
  --workspace-grid-columns:
    minmax(480px, 1fr)
    96px
    112px
    minmax(160px, 0.22fr)
    128px
    108px
    108px
    218px;
}

.workspace-project-list.without-created {
  --workspace-grid-columns:
    minmax(560px, 1fr)
    96px
    112px
    minmax(180px, 0.24fr)
    108px
    218px;
}

.workspace-table-header,
.workspace-project-row {
  display: grid;
  grid-template-columns: var(--workspace-grid-columns);
  align-items: center;
  column-gap: 1.25rem;
}

.workspace-table-header {
  min-height: 58px;
  padding: 0 1.35rem;
  border-bottom: 1px solid #dfe4ef;
  color: #707b91;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.085em;
  text-transform: uppercase;
}

.workspace-project-row {
  min-height: 124px;
  padding: 0.92rem 1.35rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.workspace-project-row:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: none;
}

.workspace-project-main {
  min-width: 0;
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  align-items: center;
  gap: 0.95rem;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.project-thumbnail {
  position: relative;
  width: 128px;
  height: 82px;
  overflow: hidden;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: #eef2f7;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.project-mark {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.34rem;
  width: 128px;
  height: 82px;
  min-height: 82px;
  padding: 0.55rem 0.45rem;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: transparent;
  text-align: center;
  box-shadow: none;
}

.project-mark.variant-private {
  background: rgba(232, 239, 255, 0.4);
}

.project-mark.variant-shared {
  background: rgba(224, 248, 242, 0.42);
}

.project-mark.variant-case {
  background: rgba(255, 244, 226, 0.55);
}

.project-mark-kicker {
  color: #8b95a8;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.project-mark strong {
  color: #171d31;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0;
}

.workspace-project-copy {
  min-width: 0;
  display: grid;
  gap: 0.44rem;
}

.workspace-project-title-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
  flex-wrap: wrap;
}

.workspace-project-title-row h3 {
  margin: 0;
  overflow: hidden;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
  max-width: 100%;
}

.project-meaning-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 22px;
  padding: 0 0.5rem;
  border: 1px solid #cbd2e5;
  border-radius: 3px;
  background: transparent;
  color: #2f6cf6;
  font-family: var(--font-sans);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.055em;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.project-meaning-badge.public {
  border-color: #bddbcf;
  background: rgba(222, 245, 236, 0.72);
  color: #24634b;
}

.project-meaning-badge.private {
  border-color: #c9d4f1;
  background: #dfe8ff;
  color: #193070;
}

.project-meaning-badge.case {
  border-color: #f0d7ae;
  background: #fff0d6;
  color: #815100;
}

.project-meaning-badge.fork {
  border-color: #cfd5e6;
  background: #e5e9f4;
  color: #626b7c;
}

.workspace-project-summary {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #4f5668;
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.38;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.workspace-data-column {
  min-width: 0;
  display: grid;
  gap: 0.26rem;
  align-content: center;
}

.workspace-data-column > span {
  display: none;
  color: #8b95a8;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.workspace-data-column strong {
  min-width: 0;
  overflow: hidden;
  color: #171d31;
  font-size: 0.82rem;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-file-count {
  display: inline-flex;
  align-items: center;
  gap: 0.48rem;
}

.workspace-file-count svg {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  color: #3f4658;
}

.workspace-data-column.runtime strong {
  color: #29344d;
  line-height: 1.4;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
}

.workspace-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.action-icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dfe5ee;
  border-radius: 10px;
  background: #ffffff;
  color: #3f4658;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.035);
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.action-icon-btn::before,
.action-icon-btn::after {
  position: absolute;
  left: 50%;
  z-index: 25;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 4px);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.action-icon-btn::before {
  content: attr(data-tooltip);
  bottom: calc(100% + 9px);
  max-width: 180px;
  width: max-content;
  padding: 5px 8px;
  border: 1px solid #0f172a;
  border-radius: 4px;
  background: #0f172a;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 760;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
}

.action-icon-btn::after {
  content: '';
  bottom: calc(100% + 4px);
  width: 8px;
  height: 8px;
  background: #0f172a;
  transform: translate(-50%, 4px) rotate(45deg);
}

.action-icon-btn:hover::before,
.action-icon-btn:focus-visible::before,
.action-icon-btn:hover::after,
.action-icon-btn:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.action-icon-btn:hover::after,
.action-icon-btn:focus-visible::after {
  transform: translate(-50%, 0) rotate(45deg);
}

.action-icon-btn svg {
  width: 18px;
  height: 18px;
}

.action-icon-btn:hover {
  border-color: #c6d0e1;
  background: #f8fafc;
  color: #171d31;
}

.action-icon-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.action-icon-btn:disabled:hover {
  border-color: #dfe5ee;
  background: #ffffff;
  color: #4f586d;
}

.action-icon-btn.danger:hover {
  border-color: #fecaca;
  background: #fee2e2;
  color: #b91c1c;
}

.workspace-action-label {
  font-size: 0.68rem;
  font-weight: 900;
}

.workspace-list-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  gap: 0.7rem;
  border: 1px dashed #cfd4e5;
  border-radius: 5px;
  background: transparent;
  color: #64748b;
  text-align: center;
}

.workspace-list-state p {
  margin: 0;
  color: #26364f;
  font-weight: 700;
}

.workspace-list-state span {
  color: #64748b;
  font-size: 0.85rem;
}

.workspace-list-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #d7dce5;
  border-top-color: #2f6cf6;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.workspace-list-retry {
  border: none;
  border-radius: 5px;
  background: #2f6cf6;
  color: #fff;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  font-weight: 700;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .workspace-table-header {
    display: none;
  }

  .workspace-project-row {
    grid-template-columns: 1fr;
    row-gap: 0.8rem;
  }

  .workspace-data-column {
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
    min-height: 28px;
    padding-top: 0.25rem;
    border-top: 1px solid #d9dce8;
  }

  .workspace-data-column > span {
    display: block;
  }

  .workspace-actions {
    justify-content: flex-start;
    padding-top: 0.9rem;
    border-top: 1px solid #d9dce8;
  }
}

@media (max-width: 700px) {
  .workspace-project-main {
    grid-template-columns: 116px minmax(0, 1fr);
  }

  .project-thumbnail,
  .project-mark {
    width: 116px;
    height: 76px;
    min-height: 76px;
  }

  .workspace-project-title-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-data-column {
    grid-template-columns: 88px minmax(0, 1fr);
  }
}
</style>
