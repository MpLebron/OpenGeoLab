<template>
  <div ref="rootRef" class="styled-select" :class="{ open, disabled }">
    <button
      :id="id || fallbackId"
      ref="buttonRef"
      class="styled-select-button"
      type="button"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listboxId"
      :disabled="disabled"
      @click="toggleOpen"
      @keydown="handleButtonKeydown"
    >
      <span class="styled-select-value">{{ selectedLabel }}</span>
      <AppIcon class="styled-select-chevron" name="chevronDown" :size="18" :stroke-width="1.9" />
    </button>

    <Transition name="styled-select-menu">
      <ul
        v-if="open"
        :id="listboxId"
        class="styled-select-menu"
        role="listbox"
        :aria-labelledby="id || fallbackId"
        :aria-label="ariaLabel"
      >
        <li v-for="option in normalizedOptions" :key="option.value" role="presentation">
          <button
            class="styled-select-option"
            :class="{ selected: option.value === modelValue }"
            type="button"
            role="option"
            :aria-selected="option.value === modelValue ? 'true' : 'false'"
            :disabled="option.disabled"
            @click="selectOption(option)"
            @keydown="handleOptionKeydown"
          >
            <span>{{ option.label }}</span>
            <AppIcon
              v-if="option.value === modelValue"
              class="styled-select-check"
              name="check"
              :size="17"
              :stroke-width="2.1"
            />
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  id: {
    type: String,
    default: ''
  },
  ariaLabel: {
    type: String,
    default: 'Select option'
  },
  placeholder: {
    type: String,
    default: 'Select'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const buttonRef = ref(null)
const open = ref(false)
const fallbackId = `styled-select-${Math.random().toString(36).slice(2, 9)}`
const listboxId = `${props.id || fallbackId}-listbox`

const normalizedOptions = computed(() => props.options.map(option => (
  typeof option === 'string'
    ? { value: option, label: option, disabled: false }
    : {
        value: option.value ?? '',
        label: option.label ?? String(option.value ?? ''),
        disabled: Boolean(option.disabled)
      }
)))

const selectedOption = computed(() => (
  normalizedOptions.value.find(option => option.value === props.modelValue)
))

const selectedLabel = computed(() => selectedOption.value?.label || props.placeholder)

const close = () => {
  open.value = false
}

const focusSelectedOption = async () => {
  await nextTick()
  const selected = rootRef.value?.querySelector('.styled-select-option.selected')
  const firstEnabled = rootRef.value?.querySelector('.styled-select-option:not(:disabled)')
  ;(selected || firstEnabled)?.focus()
}

const toggleOpen = () => {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    focusSelectedOption()
  }
}

const selectOption = option => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
  nextTick(() => buttonRef.value?.focus())
}

const moveOptionFocus = direction => {
  const options = Array.from(rootRef.value?.querySelectorAll('.styled-select-option:not(:disabled)') || [])
  if (!options.length) return
  const currentIndex = options.indexOf(document.activeElement)
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + direction + options.length) % options.length
  options[nextIndex]?.focus()
}

const handleButtonKeydown = event => {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      focusSelectedOption()
    }
  }
}

const handleOptionKeydown = event => {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    buttonRef.value?.focus()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveOptionFocus(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveOptionFocus(-1)
  }
}

const handleDocumentPointerDown = event => {
  if (!rootRef.value?.contains(event.target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<style scoped>
.styled-select {
  position: relative;
  width: 100%;
  min-width: 0;
  font-family: 'Manrope', sans-serif;
}

.styled-select-button {
  width: 100%;
  height: 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  gap: 0.78rem;
  padding: 0 1rem 0 1.15rem;
  border: 1px solid #dfe4ef;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  color: #202a3f;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 850;
  text-align: left;
  cursor: pointer;
  outline: none;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.03);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.styled-select-button:hover,
.styled-select.open .styled-select-button {
  border-color: #c9d4e5;
  background: #ffffff;
}

.styled-select-button:focus-visible {
  border-color: #b9c7dd;
  box-shadow: 0 0 0 3px rgba(83, 119, 179, 0.09), 0 8px 24px rgba(15, 23, 42, 0.04);
}

.styled-select-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.styled-select-chevron {
  width: 18px;
  height: 18px;
  color: #8b95a8;
  transition: transform 0.18s ease;
}

.styled-select.open .styled-select-chevron {
  transform: rotate(180deg);
}

.styled-select-menu {
  position: absolute;
  z-index: 80;
  top: calc(100% + 0.48rem);
  left: 0;
  right: 0;
  max-height: 248px;
  margin: 0;
  padding: 0.38rem;
  overflow: auto;
  list-style: none;
  border: 1px solid #dfe6f1;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.styled-select-option {
  width: 100%;
  min-height: 38px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.68rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #344054;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 760;
  text-align: left;
  cursor: pointer;
  outline: none;
}

.styled-select-option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.styled-select-option:hover,
.styled-select-option:focus-visible {
  background: #f3f7fc;
  color: #172033;
}

.styled-select-option.selected {
  background: #eef6f6;
  color: #0f766e;
}

.styled-select-check {
  width: 17px;
  height: 17px;
  color: #0f766e;
}

.styled-select-option:disabled {
  color: #a7b0bf;
  cursor: not-allowed;
}

.styled-select.disabled {
  opacity: 0.62;
}

.styled-select-menu-enter-active,
.styled-select-menu-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.styled-select-menu-enter-from,
.styled-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
