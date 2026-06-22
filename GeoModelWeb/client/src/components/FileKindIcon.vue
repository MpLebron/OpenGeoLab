<template>
  <JupyterIcon
    v-if="normalizedFile.previewKind === 'notebook'"
    class="file-kind-icon jupyter"
    :style="iconStyle"
  />
  <AppIcon
    v-else
    class="file-kind-icon"
    :name="filePreviewIconName(normalizedFile)"
    :size="numericSize"
    :stroke-width="numericStrokeWidth"
  />
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import JupyterIcon from './JupyterIcon.vue'
import { filePreviewIconName, normalizeFile } from '../utils/filePreview.js'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.8
  }
})

const normalizedFile = computed(() => normalizeFile(props.file))
const numericSize = computed(() => Number(props.size) || 16)
const numericStrokeWidth = computed(() => Number(props.strokeWidth) || 1.8)
const iconStyle = computed(() => ({
  fontSize: `${numericSize.value}px`
}))
</script>

<style scoped>
.file-kind-icon {
  display: block;
  flex: 0 0 auto;
  color: currentColor;
}
</style>
