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

    <div v-else class="workspace-project-list">
      <article
        v-for="(project, index) in items"
        :key="projectKey(project, index)"
        class="workspace-project-row"
        @dblclick="$emit('open', project)"
      >
        <button class="workspace-project-main" type="button" @click="$emit('open', project)">
          <div :class="['project-mark', 'large', `variant-${projectMark(project).variant}`]">
            <span class="project-mark-kicker">{{ projectMark(project).kicker }}</span>
            <strong>{{ projectMark(project).label }}</strong>
          </div>

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
            <div class="workspace-project-meta-line" :title="projectArtifacts(project)">
              <span>{{ projectFileLabel(project) }}</span>
              <span class="workspace-meta-separator">•</span>
              <span>{{ projectSizeLabel(project) }}</span>
              <template v-if="projectRuntimeImage(project)">
                <span class="workspace-meta-separator">•</span>
                <span class="workspace-meta-runtime">Based on {{ projectRuntimeImage(project) }}</span>
              </template>
            </div>
          </div>
        </button>

        <div class="workspace-project-metrics">
          <div v-if="showOwner" class="workspace-metric">
            <span>Owner</span>
            <strong>@{{ project.owner || 'unknown' }}</strong>
          </div>
          <div v-if="showCreated" class="workspace-metric">
            <span>Created</span>
            <strong>{{ formatDate(project.createdAt || project.createdTime) }}</strong>
          </div>
          <div class="workspace-metric">
            <span>Updated</span>
            <strong>{{ formatDate(project.modifiedAt || project.updatedAt) }}</strong>
          </div>
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
            <svg v-if="actionIcon(action) === 'open'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              <path d="M2.5 12C3.8 8 7.6 5 12 5s8.2 3 9.5 7c-1.3 4-5.1 7-9.5 7s-8.2-3-9.5-7z"/>
            </svg>
            <svg v-else-if="actionIcon(action) === 'edit'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M15.2 5.2l3.6 3.6"/>
              <path d="M4 20h3.6L19.8 7.8a2.5 2.5 0 0 0-3.6-3.6L4 16.4V20z"/>
            </svg>
            <svg v-else-if="actionIcon(action) === 'visibility'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M12 3a9 9 0 1 0 9 9"/>
              <path d="M3.6 9.5H8a2 2 0 0 1 2 2v1a2 2 0 0 0 2 2h1"/>
              <path d="M15 4.3V7a2 2 0 0 0 2 2h3.4"/>
            </svg>
            <svg v-else-if="actionIcon(action) === 'case'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M12 3l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 15l-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L12 3z"/>
            </svg>
            <svg v-else-if="actionIcon(action) === 'fork'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M7 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM17 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 9v3a4 4 0 0 0 4 4h4"/>
              <path d="M17 5v10"/>
            </svg>
            <svg v-else-if="actionIcon(action) === 'delete'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M4 7h16"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M6 7l1 13h10l1-13"/>
              <path d="M9 7V4h6v3"/>
            </svg>
            <span v-else class="workspace-action-label">{{ action.iconLabel || action.key }}</span>
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import {
  getWorkspaceProjectArtifacts,
  getWorkspaceProjectFileLabel,
  getWorkspaceProjectMark,
  getWorkspaceProjectRuntimeImage,
  getWorkspaceProjectSizeLabel,
  getWorkspaceProjectSummary,
  getWorkspaceProjectTitle,
  getWorkspaceProjectVisibility
} from '../utils/workspaceProjectDisplay.js'

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
const projectArtifacts = getWorkspaceProjectArtifacts
const projectMark = getWorkspaceProjectMark

const actionIcon = (action) => action.icon || action.key
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

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}
</script>

<style scoped>
.workspace-list-shell {
  width: 100%;
}

.workspace-project-list {
  display: grid;
  gap: 1rem;
}

.workspace-project-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.24fr) max-content;
  align-items: center;
  gap: 1.15rem;
  min-height: 116px;
  padding: 1.05rem 1.3rem;
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
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.project-mark {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.34rem;
  width: 72px;
  height: 72px;
  min-height: 72px;
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
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.project-mark strong {
  color: #171d31;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: 0;
}

.workspace-project-copy {
  min-width: 0;
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
  font-weight: 650;
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
  margin: 0.45rem 0 0;
  overflow: hidden;
  color: #4f5668;
  font-size: 0.92rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-project-meta-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.36rem;
  margin-top: 0.58rem;
  color: #172033;
  font-size: 0.86rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
}

.workspace-project-meta-line span {
  min-width: 0;
}

.workspace-meta-separator {
  color: #7f8aa3;
  font-weight: 700;
}

.workspace-meta-runtime {
  overflow: hidden;
  max-width: 100%;
  color: #29344d;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-project-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(96px, 1fr));
  gap: 0.4rem;
  align-items: center;
  min-width: 0;
  border-left: 1px solid #d9dce8;
  padding-left: 1.1rem;
}

.workspace-metric {
  min-width: 0;
  padding: 0 0.5rem;
}

.workspace-metric span {
  display: block;
  margin-bottom: 0.25rem;
  color: #8b95a8;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.workspace-metric strong {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: #171d31;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.34rem;
  padding-left: 0.45rem;
  border-left: none;
}

.action-icon-btn {
  position: relative;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #4f586d;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
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
  width: 17px;
  height: 17px;
}

.action-icon-btn:hover {
  background: #e6ebfb;
  color: #171d31;
}

.action-icon-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.action-icon-btn:disabled:hover {
  background: transparent;
  color: #4f586d;
}

.action-icon-btn.danger:hover {
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
  .workspace-project-row {
    grid-template-columns: 1fr;
  }

  .workspace-project-metrics {
    grid-auto-flow: row;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-left: none;
    padding-left: 0;
    padding-top: 0.9rem;
    border-top: 1px solid #d9dce8;
  }

  .workspace-actions {
    justify-content: flex-start;
    padding-left: 0;
    padding-top: 0.9rem;
    border-top: 1px solid #d9dce8;
  }
}

@media (max-width: 700px) {
  .workspace-project-main {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .project-mark {
    min-height: 64px;
    padding: 0.65rem;
  }

  .workspace-project-title-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace-project-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
