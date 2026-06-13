<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="data-upload-layer"
      role="presentation"
      @click.self="requestClose"
    >
      <section
        ref="dialogPanel"
        class="data-upload-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-upload-title"
        tabindex="-1"
        @keydown.esc.prevent="requestClose"
      >
        <header class="data-upload-header">
          <p class="data-upload-eyebrow">Input</p>
          <h2 id="data-upload-title">Upload data</h2>
          <p>Add a local file to your My Data library.</p>
        </header>

        <div class="data-upload-body">
          <label class="upload-field">
            <span>Destination</span>
            <select v-model="selectedPath" :disabled="uploading">
              <option
                v-for="option in destinationOptions"
                :key="option.path"
                :value="option.path"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <div class="upload-field">
            <span>File</span>
            <div
              class="upload-dropzone"
              :class="{ dragging: isDragging, populated: selectedFile }"
              @click="triggerFileInput"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @drop.prevent="handleDrop"
            >
              <input
                ref="fileInput"
                class="file-input"
                type="file"
                :disabled="uploading"
                @change="handleFileSelect"
              >

              <div v-if="selectedFile" class="selected-file">
                <span class="file-badge">{{ selectedFileBadge }}</span>
                <div class="selected-file-copy">
                  <strong>{{ selectedFile.name }}</strong>
                  <span>{{ formatDataSize(selectedFile.size) }}</span>
                </div>
                <button
                  type="button"
                  class="remove-file"
                  :disabled="uploading"
                  @click.stop="clearFile"
                >
                  Remove
                </button>
              </div>

              <div v-else class="dropzone-empty">
                <span class="upload-icon" aria-hidden="true"></span>
                <strong>Drop a file here</strong>
                <span>or click to choose from your computer</span>
              </div>
            </div>
          </div>

          <div v-if="uploading || progress > 0" class="upload-progress-row">
            <div class="upload-progress-bar" aria-hidden="true">
              <span :style="{ width: `${safeProgress}%` }"></span>
            </div>
            <span>{{ safeProgress }}%</span>
          </div>
        </div>

        <footer class="data-upload-footer">
          <button
            type="button"
            class="dialog-btn ghost"
            :disabled="uploading"
            @click="requestClose"
          >
            Cancel
          </button>
          <button
            type="button"
            class="dialog-btn primary"
            :disabled="!selectedFile || uploading"
            @click="submitUpload"
          >
            {{ uploading ? 'Uploading...' : 'Upload' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { formatDataSize, getDataKind } from '../utils/dataLibraryDisplay.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  currentPath: {
    type: String,
    default: '/'
  },
  folders: {
    type: Array,
    default: () => []
  },
  uploading: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close', 'submit'])

const dialogPanel = ref(null)
const fileInput = ref(null)
const selectedFile = ref(null)
const selectedPath = ref('/')
const isDragging = ref(false)

const destinationOptions = computed(() => {
  const byPath = new Map()
  byPath.set('/', { id: '', path: '/', label: '/' })

  props.folders
    .filter(folder => getDataKind(folder) === 'folder' && folder.path)
    .sort((a, b) => String(a.path).localeCompare(String(b.path)))
    .forEach(folder => {
      byPath.set(folder.path, {
        id: folder.id || '',
        path: folder.path,
        label: folder.path
      })
    })

  return Array.from(byPath.values())
})

const selectedDestination = computed(() => (
  destinationOptions.value.find(option => option.path === selectedPath.value) ||
  destinationOptions.value[0]
))

const selectedFileBadge = computed(() => {
  if (!selectedFile.value?.name) return 'FILE'
  const parts = selectedFile.value.name.split('.')
  const ext = parts.length > 1 ? parts.pop().toUpperCase() : ''
  return ext ? ext.slice(0, 4) : 'FILE'
})

const safeProgress = computed(() => {
  const value = Number(props.progress || 0)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    selectedFile.value = null
    isDragging.value = false
    selectedPath.value = resolveInitialPath(props.currentPath)
    await nextTick()
    dialogPanel.value?.focus()
  }
)

function resolveInitialPath(pathValue) {
  const cleanPath = String(pathValue || '/')
  return destinationOptions.value.some(option => option.path === cleanPath)
    ? cleanPath
    : '/'
}

function requestClose() {
  if (props.uploading) return
  emit('close')
}

function triggerFileInput() {
  if (props.uploading) return
  fileInput.value?.click()
}

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

function handleDragOver() {
  if (props.uploading) return
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(event) {
  if (props.uploading) return
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

function clearFile() {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function submitUpload() {
  if (!selectedFile.value || props.uploading) return

  emit('submit', {
    file: selectedFile.value,
    dataName: selectedFile.value.name,
    path: selectedDestination.value?.path || '/',
    parentId: selectedDestination.value?.id || ''
  })
}
</script>

<style scoped>
.data-upload-layer {
  position: fixed;
  inset: 0;
  z-index: 4990;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(3px);
}

.data-upload-dialog {
  width: min(520px, 100%);
  border: 1px solid #d8dee9;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.data-upload-dialog:focus {
  outline: none;
}

.data-upload-header {
  padding: 20px 22px 0;
}

.data-upload-eyebrow {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.data-upload-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 900;
}

.data-upload-header p:last-child {
  margin: 14px 0 0;
  color: #334155;
  font-size: 0.92rem;
  font-weight: 760;
  line-height: 1.5;
}

.data-upload-body {
  display: grid;
  gap: 16px;
  padding: 20px 22px 8px;
}

.upload-field {
  display: grid;
  gap: 8px;
}

.upload-field > span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 900;
}

.upload-field select {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 800;
}

.upload-field select:focus {
  border-color: #0f172a;
  outline: none;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.upload-dropzone {
  min-height: 132px;
  display: grid;
  place-items: center;
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.upload-dropzone:hover,
.upload-dropzone.dragging {
  border-color: #94a3b8;
  background: #f3f6fb;
}

.upload-dropzone.populated {
  border-style: solid;
  background: #ffffff;
}

.file-input {
  display: none;
}

.dropzone-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  color: #475569;
  text-align: center;
}

.dropzone-empty strong {
  color: #0f172a;
  font-size: 0.93rem;
  font-weight: 900;
}

.dropzone-empty span:last-child {
  font-size: 0.82rem;
  font-weight: 740;
}

.upload-icon {
  position: relative;
  width: 38px;
  height: 30px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
}

.upload-icon::before,
.upload-icon::after {
  content: '';
  position: absolute;
  left: 50%;
  background: #0f172a;
  transform: translateX(-50%);
}

.upload-icon::before {
  top: 8px;
  width: 2px;
  height: 13px;
}

.upload-icon::after {
  top: 8px;
  width: 10px;
  height: 10px;
  border-top: 2px solid #0f172a;
  border-left: 2px solid #0f172a;
  background: transparent;
  transform: translateX(-50%) rotate(45deg);
}

.selected-file {
  width: 100%;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.file-badge {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.selected-file-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.selected-file-copy strong,
.selected-file-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-file-copy strong {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 900;
}

.selected-file-copy span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 780;
}

.remove-file,
.dialog-btn {
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 0.84rem;
  font-weight: 850;
  cursor: pointer;
}

.remove-file:hover,
.dialog-btn.ghost:hover {
  border-color: #94a3b8;
  color: #0f172a;
  background: #f8fafc;
}

.upload-progress-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 850;
}

.upload-progress-bar {
  height: 8px;
  overflow: hidden;
  border: 1px solid #d8dee9;
  border-radius: 999px;
  background: #f8fafc;
}

.upload-progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0f172a;
}

.data-upload-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 22px 22px;
}

.dialog-btn.primary {
  border-color: #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.dialog-btn.primary:hover:not(:disabled) {
  background: #111827;
}

.dialog-btn:disabled,
.remove-file:disabled,
.upload-field select:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 560px) {
  .data-upload-layer {
    padding: 16px;
  }

  .selected-file {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .remove-file {
    grid-column: 1 / -1;
    justify-self: start;
  }
}
</style>
