<template>
  <label class="styled-search" :class="{ disabled }">
    <AppIcon class="styled-search-icon" name="search" :size="21" :stroke-width="1.8" />
    <input
      ref="inputRef"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      @input="emit('update:modelValue', $event.target.value)"
      @keyup.enter="emit('enter')"
    >
    <span v-if="shortcutLabel" class="styled-search-shortcut" aria-hidden="true">{{ shortcutLabel }}</span>
  </label>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Search'
  },
  type: {
    type: String,
    default: 'text'
  },
  autocomplete: {
    type: String,
    default: 'off'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  shortcutLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'enter'])
const inputRef = ref(null)

const focus = () => {
  inputRef.value?.focus()
}

const select = () => {
  inputRef.value?.select?.()
}

defineExpose({ focus, select })
</script>

<style scoped>
.styled-search {
  width: 100%;
  height: 48px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.72rem;
  padding: 0 0.9rem 0 1.05rem;
  border: 1px solid #dfe4ef;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.03);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.styled-search:focus-within {
  border-color: #b9c7dd;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(83, 119, 179, 0.09), 0 8px 24px rgba(15, 23, 42, 0.04);
}

.styled-search-icon {
  width: 21px;
  height: 21px;
  color: #94a0b4;
}

.styled-search input {
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #172033;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  outline: none;
}

.styled-search input::placeholder {
  color: #8f98aa;
  font-weight: 700;
}

.styled-search-shortcut {
  min-width: 46px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e7f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #9aa3b5;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: inset 0 -1px 0 rgba(15, 23, 42, 0.04);
}

.styled-search.disabled {
  opacity: 0.66;
}

@media (max-width: 620px) {
  .styled-search {
    grid-template-columns: 22px minmax(0, 1fr);
  }

  .styled-search-shortcut {
    display: none;
  }
}
</style>
