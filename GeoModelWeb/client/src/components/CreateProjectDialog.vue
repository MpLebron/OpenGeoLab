<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="create-project-layer"
      role="presentation"
      @click.self="requestClose"
    >
      <section
        ref="dialogPanel"
        class="create-project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        tabindex="-1"
        @keydown.esc.prevent="requestClose"
      >
        <header class="create-project-header">
          <p class="create-project-eyebrow">Workspace</p>
          <h2 id="create-project-title">Create project</h2>
          <p>Initialize a reproducible Jupyter workspace for geospatial modeling.</p>
        </header>

        <div class="create-project-body">
          <label class="project-field">
            <span>Project name</span>
            <input
              v-model="projectName"
              type="text"
              autocomplete="off"
              placeholder="e.g. Changsha flood mapping"
              :disabled="creating"
              @keyup.enter="submitProject"
            >
          </label>

          <label class="project-field">
            <span>Purpose</span>
            <textarea
              v-model="purpose"
              rows="3"
              placeholder="Short research goal or modeling objective"
              :disabled="creating"
            ></textarea>
          </label>

          <div class="project-field">
            <span>Runtime environment</span>
            <StyledSelect
              v-model="runtimeId"
              :options="runtimeSelectOptions"
              :disabled="creating"
              aria-label="Runtime environment"
            />
          </div>

          <div v-if="selectedRuntime" class="runtime-summary">
            <span>Runtime</span>
            <strong>{{ selectedRuntime.runtimeName || selectedRuntime.imageName || selectedRuntime.name }}</strong>
            <small>{{ selectedRuntime.stack || selectedRuntime.description }}</small>
          </div>

          <fieldset class="starter-field">
            <legend>Starter template</legend>
            <div class="starter-options">
              <label
                v-for="template in starterTemplates"
                :key="template.id"
                class="starter-option"
                :class="{ selected: starterTemplate === template.id }"
              >
                <input
                  v-model="starterTemplate"
                  type="radio"
                  name="starter-template"
                  :value="template.id"
                  :disabled="creating"
                >
                <span>
                  <strong>{{ template.name }}</strong>
                  <small>{{ template.description }}</small>
                </span>
              </label>
            </div>
          </fieldset>

          <div class="project-data-note">
            <span>Project data</span>
            <p>Attach data after creation from Project Data.</p>
          </div>
        </div>

        <footer class="create-project-footer">
          <button
            type="button"
            class="dialog-btn ghost"
            :disabled="creating"
            @click="requestClose"
          >
            Cancel
          </button>
          <button
            type="button"
            class="dialog-btn primary"
            :disabled="!canSubmit"
            @click="submitProject"
          >
            {{ creating ? 'Creating and launching...' : 'Create and Open JupyterLab' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import StyledSelect from './StyledSelect.vue'
import { getDefaultStarterTemplateId, normalizeStarterTemplateId } from '../utils/projectCreateFlow.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  creating: {
    type: Boolean,
    default: false
  },
  runtimeOptions: {
    type: Array,
    default: () => []
  },
  selectedRuntimeId: {
    type: String,
    default: ''
  },
  starterTemplates: {
    type: Array,
    default: () => []
  },
  initialPurpose: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'submit'])

const dialogPanel = ref(null)
const projectName = ref('')
const purpose = ref('')
const runtimeId = ref('')
const starterTemplate = ref(getDefaultStarterTemplateId())

const selectedRuntime = computed(() => (
  props.runtimeOptions.find(runtime => runtime.id === runtimeId.value) ||
  props.runtimeOptions[0] ||
  null
))

const runtimeSelectOptions = computed(() => (
  props.runtimeOptions.map(runtime => ({
    value: runtime.id,
    label: runtime.name || runtime.title || runtime.label || runtime.id
  }))
))

const canSubmit = computed(() => (
  Boolean(projectName.value.trim()) &&
  Boolean(runtimeId.value) &&
  !props.creating
))

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    projectName.value = ''
    purpose.value = props.initialPurpose || ''
    runtimeId.value = resolveInitialRuntimeId()
    starterTemplate.value = getDefaultStarterTemplateId()
    await nextTick()
    dialogPanel.value?.focus()
  }
)

watch(
  () => props.selectedRuntimeId,
  () => {
    if (!props.visible) return
    runtimeId.value = resolveInitialRuntimeId()
  }
)

function resolveInitialRuntimeId() {
  const selected = props.runtimeOptions.find(runtime => runtime.id === props.selectedRuntimeId)
  return selected?.id || props.runtimeOptions[0]?.id || ''
}

function requestClose() {
  if (props.creating) return
  emit('close')
}

function submitProject() {
  if (!canSubmit.value) return
  emit('submit', {
    name: projectName.value.trim(),
    description: purpose.value.trim(),
    runtimeImageId: runtimeId.value,
    starterTemplate: normalizeStarterTemplateId(starterTemplate.value)
  })
}
</script>

<style scoped>
.create-project-layer {
  position: fixed;
  inset: 0;
  z-index: 4990;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(14px);
}

.create-project-dialog {
  width: min(620px, 100%);
  max-height: min(88vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #cfd8e8;
  border-radius: 8px;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  outline: none;
}

.create-project-header {
  padding: 24px 28px 18px;
  border-bottom: 1px solid #e3e9f4;
}

.create-project-eyebrow {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.create-project-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.18;
  font-weight: 800;
}

.create-project-header p:last-child {
  margin: 8px 0 0;
  color: #516175;
  font-size: 14px;
  line-height: 1.55;
}

.create-project-body {
  padding: 24px 28px;
  overflow: auto;
}

.project-field {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.project-field span,
.starter-field legend,
.project-data-note span {
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

.project-field input,
.project-field textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.project-field input {
  height: 44px;
  padding: 0 12px;
}

.project-field textarea {
  resize: vertical;
  min-height: 92px;
  padding: 11px 12px;
}

.project-field input:focus,
.project-field textarea:focus {
  border-color: #0b5fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.runtime-summary,
.project-data-note {
  display: grid;
  gap: 6px;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #d8e1ef;
  border-radius: 8px;
  background: #f8fafc;
}

.runtime-summary strong {
  color: #0f172a;
  font-size: 14px;
}

.runtime-summary small,
.project-data-note p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.starter-field {
  margin: 0 0 18px;
  padding: 0;
  border: 0;
}

.starter-options {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.starter-option {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 12px;
  align-items: start;
  padding: 13px 14px;
  border: 1px solid #d8e1ef;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.starter-option.selected {
  border-color: #8fb3ff;
  background: #f4f7ff;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.starter-option input {
  margin-top: 3px;
  accent-color: #0b5fff;
}

.starter-option strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.35;
}

.starter-option small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.create-project-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 28px;
  border-top: 1px solid #e3e9f4;
  background: #fbfdff;
}

.dialog-btn {
  min-width: 96px;
  height: 38px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.dialog-btn.ghost {
  background: #ffffff;
  color: #1e293b;
}

.dialog-btn.primary {
  min-width: 190px;
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.dialog-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 640px) {
  .create-project-layer {
    padding: 14px;
  }

  .create-project-header,
  .create-project-body,
  .create-project-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .create-project-footer {
    flex-direction: column-reverse;
  }

  .dialog-btn,
  .dialog-btn.primary {
    width: 100%;
  }
}
</style>
