<template>
  <div v-if="visible" class="run-modal-overlay" @click.self="$emit('close')">
    <div class="run-modal-content">
      <div class="run-modal-header">
        <h3>{{ $t('runModal.title', { name: model?.name }) }}</h3>
        <button class="close-btn" type="button" aria-label="Close" @click="$emit('close')">
          <AppIcon name="x" :size="17" :stroke-width="2" />
        </button>
      </div>

      <div class="run-modal-body">
        <div v-if="loadingDetails" class="loading-details">
          <div class="spinner"></div>
          <p>{{ $t('runModal.loadingParams') }}</p>
        </div>

        <div v-else-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-else>
          <p class="instruction">{{ modelDetails?.description || $t('runModal.configureParams') }}</p>

          <div v-for="(param, index) in params" :key="index" class="form-group">
            <label>
              {{ param.Name }}
              <span v-if="!param.Optional" class="required">*</span>
              <span v-if="param.default_value" class="default-hint">
                ({{ $t('runModal.default') }}: {{ param.default_value }})
              </span>
            </label>
            <div class="param-desc">
              {{ param.Description }}
              <span v-if="getTypeHint(param)" class="type-hint">• {{ getTypeHint(param) }}</span>
            </div>

            <!-- File Input (ExistingFile) -->
            <div v-if="param.parameter_type?.ExistingFile" class="file-input-wrapper">
              <div
                class="run-file-dropzone"
                :class="{
                  dragging: draggingFileIndex === index,
                  populated: selectedFiles[index],
                  uploaded: formValues[`val${index}`],
                  failed: fileUploadErrors[index]
                }"
                @click="openFilePicker(index)"
                @dragover.prevent="handleFileDragOver(index)"
                @dragleave.prevent="handleFileDragLeave"
                @drop.prevent="(event) => handleFileDrop(event, index)"
              >
                <input
                  :ref="(element) => setFileInputRef(element, index)"
                  type="file"
                  @change="(e) => handleFileUpload(e, index)"
                  class="file-input-real"
                >

                <div v-if="selectedFiles[index]" class="selected-run-file">
                  <span class="run-file-badge">
                    {{ getRunFileBadge(selectedFiles[index].name, getRunFileKindLabel(param)) }}
                  </span>
                  <div class="selected-run-file-copy">
                    <strong :title="selectedFiles[index].name">{{ selectedFiles[index].name }}</strong>
                    <span>
                      {{ formatUploadFileSize(selectedFiles[index].size) }}
                      <template v-if="getRunFileKindLabel(param)"> · {{ getRunFileKindLabel(param) }}</template>
                    </span>
                  </div>
                  <button
                    type="button"
                    class="replace-file-btn"
                    :disabled="uploading[index]"
                    @click.stop="replaceFileSelection(index)"
                  >
                    Replace
                  </button>
                </div>

                <div v-else class="run-file-empty">
                  <AppIcon class="run-upload-icon" name="upload" :size="30" :stroke-width="1.65" />
                  <strong>Select {{ getRunFileKindLabel(param) }} input</strong>
                  <span>Drop a file here or browse from your computer</span>
                  <em>{{ param.Optional ? $t('runModal.optional') : $t('runModal.required') }} · {{ getRunFileKindLabel(param) }}</em>
                </div>
              </div>

              <div class="file-status">
                <span v-if="uploading[index]" class="status-uploading">{{ $t('runModal.uploading') }}</span>
                <span v-else-if="formValues[`val${index}`]" class="status-success">
                  {{ $t('runModal.uploaded') }} · {{ $t('runModal.fileId') }} {{ formValues[`val${index}`].substring(0, 8) }}...
                </span>
                <span v-else-if="fileUploadErrors[index]" class="status-error">{{ fileUploadErrors[index] }}</span>
                <span v-else class="status-hint">Waiting for {{ getRunFileKindLabel(param) }} input</span>
              </div>
            </div>

            <!-- New File Output (NewFile) -->
            <div v-else-if="param.parameter_type?.NewFile">
               <input
                type="text"
                v-model="formValues[`val${index}`]"
                :placeholder="`${$t('runModal.outputFilename')} (.${param.parameter_type.NewFile})`"
                class="text-input"
              >
            </div>

            <!-- Boolean Input -->
            <div v-else-if="param.parameter_type === 'Boolean'" class="checkbox-wrapper">
              <label class="switch">
                <input type="checkbox" v-model="formValues[`val${index}`]">
                <span class="slider round"></span>
              </label>
              <span class="bool-label">{{ formValues[`val${index}`] ? $t('common.true') : $t('common.false') }}</span>
            </div>

            <!-- Integer Input -->
            <div v-else-if="param.parameter_type === 'Integer'">
              <input
                type="number"
                v-model.number="formValues[`val${index}`]"
                :placeholder="param.default_value ? `${$t('runModal.enterInteger')} (${$t('runModal.default')}: ${param.default_value})` : $t('runModal.enterInteger')"
                step="1"
                class="text-input"
              >
            </div>

            <!-- Float Input -->
            <div v-else-if="param.parameter_type === 'Float'">
              <input
                type="number"
                v-model.number="formValues[`val${index}`]"
                :placeholder="param.default_value ? `${$t('runModal.enterDecimal')} (${$t('runModal.default')}: ${param.default_value})` : $t('runModal.enterDecimal')"
                step="any"
                class="text-input"
              >
            </div>

            <!-- OptionList (Select Dropdown) -->
            <div v-else-if="param.parameter_type?.OptionList">
              <StyledSelect
                v-model="formValues[`val${index}`]"
                class="select-input"
                :options="optionListOptions(param)"
                :placeholder="$t('runModal.selectOption')"
                :aria-label="$t('runModal.selectOption')"
              />
            </div>

            <!-- Default Text Input (for String or unknown types) -->
            <div v-else>
              <input
                type="text"
                v-model="formValues[`val${index}`]"
                :placeholder="param.default_value ? `${$t('runModal.enterValue')} (${$t('runModal.default')}: ${param.default_value})` : $t('runModal.enterValue')"
                class="text-input"
              >
            </div>
          </div>
        </div>
      </div>

      <div class="run-modal-footer">
        <button class="cancel-btn" @click="$emit('close')">{{ $t('runModal.cancel') }}</button>
        <button class="execute-btn" @click="handleExecute" :disabled="loading || loadingDetails || error">
          <span v-if="loading" class="spinner-sm"></span>
          {{ loading ? $t('runModal.running') : $t('runModal.execute') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import {
  formatUploadFileSize,
  getRunFileBadge,
  getRunFileKindLabel
} from '../utils/runModalFileDisplay.js'
import StyledSelect from './StyledSelect.vue'
import AppIcon from './AppIcon.vue'
import { notify } from '../utils/systemFeedback.js'

const props = defineProps({
  visible: Boolean,
  model: Object,
  loading: Boolean
})

const emit = defineEmits(['close', 'execute'])

const modelDetails = ref(null)
const params = ref([])
const formValues = ref({})
const loadingDetails = ref(false)
const error = ref(null)
const uploading = ref({})
const selectedFiles = ref({})
const fileUploadErrors = ref({})
const fileInputRefs = ref({})
const draggingFileIndex = ref(null)

const getTypeHint = (param) => {
  const type = param.parameter_type

  if (typeof type === 'string') {
    return type
  }

  if (typeof type === 'object') {
    if (type.ExistingFile) return `File: ${type.ExistingFile}`
    if (type.NewFile) return `Output: ${type.NewFile}`
    if (type.OptionList) return `Options: ${type.OptionList.options?.join(', ')}`
  }

  return ''
}

const optionListOptions = (param) => (
  (param.parameter_type?.OptionList?.options || []).map(option => ({
    value: option,
    label: option
  }))
)

// Fetch model details when modal opens
watch(() => props.visible, async (newVal) => {
  if (newVal && props.model) {
    loadingDetails.value = true
    error.value = null
    modelDetails.value = null
    params.value = []
    formValues.value = {}
    uploading.value = {}
    selectedFiles.value = {}
    fileUploadErrors.value = {}
    fileInputRefs.value = {}
    draggingFileIndex.value = null

    try {
      const response = await axios.get(`/api/datamethods/${props.model.name}`)
      modelDetails.value = response.data
      params.value = response.data.params || []

      // Initialize form values
      params.value.forEach((param, index) => {
        if (param.default_value !== null && param.default_value !== undefined) {
           // Handle string boolean values
           if (param.default_value === 'true') {
             formValues.value[`val${index}`] = true
           } else if (param.default_value === 'false') {
             formValues.value[`val${index}`] = false
           } else {
             formValues.value[`val${index}`] = param.default_value
           }
        } else if (param.parameter_type === 'Boolean') {
           formValues.value[`val${index}`] = false
        } else {
           formValues.value[`val${index}`] = ''
        }
      })
    } catch (err) {
      console.error('Failed to fetch model details:', err)
      error.value = 'Failed to load model parameters.'
    } finally {
      loadingDetails.value = false
    }
  }
})

const handleFileUpload = async (event, index) => {
  const file = event.target.files?.[0]
  await uploadFileForParam(file, index, event.target)
}

const uploadFileForParam = async (file, index, inputElement = null) => {
  if (!file) return

  selectedFiles.value[index] = file
  fileUploadErrors.value[index] = ''
  formValues.value[`val${index}`] = ''
  uploading.value[index] = true
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.data.status === 'success') {
      formValues.value[`val${index}`] = response.data.id
    } else {
      const message = 'Upload failed: ' + (response.data.error || 'Unknown error')
      fileUploadErrors.value[index] = message
      notify(message, 'error', { duration: 6000 })
      if (inputElement) inputElement.value = ''
    }
  } catch (err) {
    console.error('Upload error:', err)
    fileUploadErrors.value[index] = 'Upload failed. Please try again.'
    notify(fileUploadErrors.value[index], 'error', { duration: 6000 })
    if (inputElement) inputElement.value = ''
  } finally {
    uploading.value[index] = false
  }
}

const setFileInputRef = (element, index) => {
  if (element) {
    fileInputRefs.value[index] = element
  }
}

const clearFileSelection = (index) => {
  selectedFiles.value[index] = null
  fileUploadErrors.value[index] = ''
  formValues.value[`val${index}`] = ''
  const input = fileInputRefs.value[index]
  if (input) {
    input.value = ''
  }
}

const replaceFileSelection = (index) => {
  clearFileSelection(index)
  requestAnimationFrame(() => openFilePicker(index))
}

const openFilePicker = (index) => {
  if (uploading.value[index]) return
  fileInputRefs.value[index]?.click()
}

const handleFileDragOver = (index) => {
  draggingFileIndex.value = index
}

const handleFileDragLeave = () => {
  draggingFileIndex.value = null
}

const handleFileDrop = async (event, index) => {
  draggingFileIndex.value = null
  const file = event.dataTransfer?.files?.[0]
  await uploadFileForParam(file, index, fileInputRefs.value[index])
}

const handleExecute = () => {
  for (let i = 0; i < params.value.length; i++) {
    const param = params.value[i]
    const key = `val${i}`
    const val = formValues.value[key]

    if (!param.Optional && (val === '' || val === null || val === undefined)) {
      notify(`Parameter "${param.Name}" is required.`, 'warning')
      return
    }
  }
  emit('execute', formValues.value)
}
</script>

<style scoped>
.run-modal-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5200;
  padding: 24px;
  animation: fadeIn 0.2s ease;
}

.run-modal-content {
  background: #ffffff;
  border: 1px solid #cfd8e8;
  border-radius: 8px;
  width: min(720px, 100%);
  max-height: min(88vh, 760px);
  display: flex;
  flex-direction: column;
  color: #0f172a;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.run-modal-header {
  padding: 22px 28px 18px;
  border-bottom: 1px solid #e3e9f4;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
}

.run-modal-header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 800;
}

.close-btn {
  width: 34px;
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.close-btn:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.run-modal-body {
  padding: 22px 28px;
  overflow-y: auto;
  flex: 1;
  background: #ffffff;
}

.loading-details, .error-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.error-message {
  color: var(--danger-color);
}

.instruction {
  color: #516175;
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #d8e1ef;
  border-radius: 8px;
  background: #fbfdff;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
}

.required {
  color: var(--danger-color);
  margin-left: 4px;
}

.default-hint {
  color: #64748b;
  font-size: 12px;
  font-weight: normal;
  margin-left: 0.5rem;
}

.param-desc {
  font-size: 13px;
  color: #516175;
  margin-bottom: 10px;
  line-height: 1.4;
}

.type-hint {
  color: #0f766e;
  font-weight: 700;
  margin-left: 0.5rem;
}

.file-input-wrapper {
  display: grid;
  gap: 8px;
}

.file-input-real {
  display: none;
}

.run-file-dropzone {
  min-height: 118px;
  display: grid;
  place-items: center;
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.run-file-dropzone:hover,
.run-file-dropzone.dragging {
  border-color: #94a3b8;
  background: #f3f6fb;
}

.run-file-dropzone:focus-within {
  border-color: #0b5fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.run-file-dropzone.populated {
  border-style: solid;
  background: #ffffff;
}

.run-file-dropzone.uploaded {
  border-color: rgba(16, 185, 129, 0.45);
  background: rgba(16, 185, 129, 0.04);
}

.run-file-dropzone.failed {
  border-color: rgba(185, 28, 28, 0.45);
  background: rgba(185, 28, 28, 0.04);
}

.run-file-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  color: #475569;
  text-align: center;
}

.run-file-empty strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 900;
}

.run-file-empty span {
  font-size: 13px;
  font-weight: 740;
}

.run-file-empty em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.run-upload-icon {
  color: #0f172a;
}

.selected-run-file {
  width: 100%;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.run-file-badge {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.selected-run-file-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.selected-run-file-copy strong,
.selected-run-file-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-run-file-copy strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 900;
}

.selected-run-file-copy span {
  color: #64748b;
  font-size: 12px;
  font-weight: 780;
}

.replace-file-btn {
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.replace-file-btn:hover:not(:disabled) {
  border-color: #94a3b8;
  color: #0f172a;
  background: #f8fafc;
}

.replace-file-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.file-status {
  font-size: 12px;
  font-weight: 800;
}

.status-uploading {
  color: #1d4ed8;
}

.status-success {
  color: #047857;
}

.status-error {
  color: #b91c1c;
}

.status-hint {
  color: #64748b;
  font-style: italic;
}

.text-input {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  background-color: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #0f172a;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: #0b5fff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.select-input {
  width: 100%;
}

/* Toggle Switch for Boolean */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #555;
  transition: .3s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent-color);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.bool-label {
  color: var(--text-primary);
  font-weight: 500;
}

.run-modal-footer {
  padding: 14px 28px;
  border-top: 1px solid #e3e9f4;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: #f8fafc;
}

.cancel-btn {
  background: white;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 800;
}

.cancel-btn:hover {
  border-color: #94a3b8;
  background-color: #f8fafc;
}

.execute-btn {
  background-color: #111827;
  color: white;
  border: none;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 800;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.execute-btn:hover {
  background-color: #1f2937;
}

.execute-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
