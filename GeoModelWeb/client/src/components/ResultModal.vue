<template>
  <div v-if="visible" class="result-modal-overlay" @click.self="$emit('close')">
    <div class="result-modal-content">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" type="button" aria-label="Close" @click="$emit('close')">
          <AppIcon name="x" :size="17" :stroke-width="2" />
        </button>
      </div>
      
      <div class="modal-body">
        <div v-if="result.status === 'success'" class="success-section">
          <div class="status-icon">
            <AppIcon name="circleCheck" :size="30" :stroke-width="1.8" />
          </div>
          <p class="status-message">{{ result.message }}</p>
          
          <div v-if="result.output" class="output-section">
            <h4>{{ $t('resultModal.outputData') }}</h4>
            <div class="output-list">
              <div v-for="(item, index) in formatOutput(result.output)" :key="index" class="output-item">
                <span class="output-label">{{ item.label }}:</span>
                <div v-if="item.isMultiple" class="output-links">
                  <a v-for="(url, idx) in item.urls" :key="idx" :href="url" target="_blank" class="output-link">
                    {{ $t('resultModal.downloadFile') }} {{ idx + 1 }}
                    <AppIcon class="download-icon" name="download" :size="15" :stroke-width="1.9" />
                  </a>
                </div>
                <a v-else-if="item.isUrl" :href="item.value" target="_blank" class="output-link">
                  {{ item.originalValue || item.value }}
                  <AppIcon class="download-icon" name="download" :size="15" :stroke-width="1.9" />
                </a>
                <span v-else class="output-value">{{ item.value }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="result.info" class="info-section">
            <h4>{{ $t('resultModal.executionInfo') }}</h4>
            <pre class="info-content">{{ result.info }}</pre>
          </div>
        </div>
        
        <div v-else class="error-section">
          <div class="status-icon error">
            <AppIcon name="circleX" :size="30" :stroke-width="1.8" />
          </div>
          <p class="status-message error">{{ result.message }}</p>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="close-footer-btn" @click="$emit('close')">{{ $t('resultModal.close') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'

const { t } = useI18n()

const props = defineProps({
  visible: Boolean,
  result: Object,
  title: {
    type: String,
    default: 'Execution Result'
  }
})

const emit = defineEmits(['close'])

const DATA_SERVER_URL = 'http://221.224.35.86:38083/data'

const isUUID = (str) => {
  if (typeof str !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

const formatOutput = (output) => {
  if (!output) return []
  
  if (typeof output === 'string') {
    const isUrl = output.startsWith('http')
    const isFileId = isUUID(output)
    return [{
      label: t('resultModal.result'),
      value: isFileId ? `${DATA_SERVER_URL}/${output}` : output,
      isUrl: isUrl || isFileId,
      originalValue: output
    }]
  }
  
  if (Array.isArray(output)) {
    return output.map((item, idx) => {
      if (typeof item === 'string') {
        const isUrl = item.startsWith('http')
        const isFileId = isUUID(item)
        return {
          label: `${t('resultModal.output')} ${idx + 1}`,
          value: isFileId ? `${DATA_SERVER_URL}/${item}` : item,
          isUrl: isUrl || isFileId,
          originalValue: item
        }
      }
      return {
        label: `${t('resultModal.output')} ${idx + 1}`,
        value: typeof item === 'object' ? JSON.stringify(item, null, 2) : item,
        isUrl: false
      }
    })
  }
  
  if (typeof output === 'object') {
    return Object.entries(output).map(([key, value]) => {
      if (typeof value === 'string') {
        const isUrl = value.startsWith('http')
        const isFileId = isUUID(value)
        return {
          label: key,
          value: isFileId ? `${DATA_SERVER_URL}/${value}` : value,
          isUrl: isUrl || isFileId,
          originalValue: value
        }
      }
      // Handle arrays of UUIDs
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && isUUID(value[0])) {
        return {
          label: key,
          value: value.map(id => `${DATA_SERVER_URL}/${id}`).join('\n'),
          isUrl: true,
          isMultiple: true,
          urls: value.map(id => `${DATA_SERVER_URL}/${id}`)
        }
      }
      return {
        label: key,
        value: typeof value === 'object' ? JSON.stringify(value, null, 2) : value,
        isUrl: typeof value === 'string' && value.startsWith('http')
      }
    })
  }
  
  return [{ label: 'Output', value: JSON.stringify(output, null, 2), isUrl: false }]
}
</script>

<style scoped>
.result-modal-overlay {
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

.result-modal-content {
  background: #ffffff;
  border: 1px solid #cfd8e8;
  border-radius: 8px;
  width: min(720px, 100%);
  max-height: min(88vh, 760px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.modal-header {
  padding: 22px 28px 18px;
  border-bottom: 1px solid #e3e9f4;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
}

.modal-header h3 {
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

.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
  background: #ffffff;
}

.success-section, .error-section {
  text-align: center;
}

.status-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 1rem;
  border-radius: 8px;
  background-color: #047857;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}

.status-icon.error {
  background-color: #b91c1c;
}

.status-message {
  font-size: 16px;
  color: #0f172a;
  margin-bottom: 1.5rem;
}

.status-message.error {
  color: #b91c1c;
}

.output-section, .info-section {
  margin-top: 1.5rem;
  text-align: left;
}

.output-section h4, .info-section h4 {
  color: #0f172a;
  margin-bottom: 0.75rem;
  font-size: 14px;
  font-weight: 800;
}

.output-list {
  background-color: #fbfdff;
  border: 1px solid #d8e1ef;
  border-radius: 8px;
  padding: 1rem;
}

.output-item {
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.5rem;
}

.output-item:last-child {
  margin-bottom: 0;
}

.output-label {
  color: #516175;
  font-weight: 800;
  min-width: 100px;
}

.output-value {
  color: #0f172a;
  word-break: break-all;
}

.output-link {
  color: #1d4ed8;
  text-decoration: none;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.output-link:hover {
  text-decoration: underline;
}

.output-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.output-links .output-link {
  padding: 0.5rem;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  transition: all 0.2s;
}

.output-links .output-link:hover {
  border-color: #0b5fff;
  background-color: rgba(37, 99, 235, 0.06);
}

.download-icon {
  font-size: 0.9rem;
}

.info-content {
  background-color: #fbfdff;
  border: 1px solid #d8e1ef;
  border-radius: 8px;
  padding: 1rem;
  color: #0f172a;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.modal-footer {
  padding: 14px 28px;
  border-top: 1px solid #e3e9f4;
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
}

.close-footer-btn {
  background-color: #111827;
  color: white;
  border: none;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 800;
  font-size: 14px;
  transition: all 0.2s;
}

.close-footer-btn:hover {
  background-color: #1f2937;
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
