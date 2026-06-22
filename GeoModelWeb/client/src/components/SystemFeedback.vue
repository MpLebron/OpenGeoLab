<template>
  <Teleport to="body">
    <div class="system-toast-region" aria-live="polite" aria-relevant="additions">
      <TransitionGroup name="system-toast">
        <article
          v-for="toast in feedbackState.toasts"
          :key="toast.id"
          class="system-toast"
          :class="toast.type"
        >
          <span class="toast-rail" aria-hidden="true"></span>
          <div class="toast-copy">
            <strong v-if="toast.title">{{ toast.title }}</strong>
            <p>{{ toast.message }}</p>
          </div>
          <button type="button" class="toast-close" aria-label="Dismiss message" @click="dismissToast(toast.id)">
            <AppIcon name="x" :size="15" :stroke-width="2" />
          </button>
        </article>
      </TransitionGroup>
    </div>

    <Transition name="system-dialog">
      <div
        v-if="feedbackState.dialog"
        class="system-dialog-layer"
        role="presentation"
        @click.self="cancelDialog"
      >
        <section
          ref="dialogPanel"
          class="system-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="dialogTitleId"
          tabindex="-1"
          @keydown.esc.prevent="cancelDialog"
        >
          <header class="dialog-header">
            <p class="dialog-eyebrow">{{ dialogEyebrow }}</p>
            <h2 :id="dialogTitleId">{{ feedbackState.dialog.title }}</h2>
          </header>

          <p v-if="feedbackState.dialog.message" class="dialog-message">
            {{ feedbackState.dialog.message }}
          </p>

          <label v-if="feedbackState.dialog.kind === 'prompt'" class="dialog-input-row">
            <span>{{ feedbackState.dialog.inputLabel || 'Value' }}</span>
            <input
              ref="dialogInput"
              v-model="feedbackState.dialog.inputValue"
              type="text"
              :placeholder="feedbackState.dialog.placeholder"
              @keyup.enter="confirmActiveDialog"
            >
          </label>

          <footer class="dialog-footer">
            <button
              v-if="feedbackState.dialog.kind !== 'alert'"
              type="button"
              class="dialog-btn ghost"
              @click="cancelDialog"
            >
              {{ feedbackState.dialog.cancelText }}
            </button>
            <button
              type="button"
              class="dialog-btn primary"
              :class="{ dangerous: feedbackState.dialog.dangerous }"
              @click="confirmActiveDialog"
            >
              {{ feedbackState.dialog.confirmText }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  cancelDialog,
  dismissToast,
  feedbackState,
  resolveDialog
} from '../utils/systemFeedback.js'
import AppIcon from './AppIcon.vue'

const dialogInput = ref(null)
const dialogPanel = ref(null)

const dialogTitleId = computed(() => (
  feedbackState.dialog ? `system-dialog-title-${feedbackState.dialog.id}` : 'system-dialog-title'
))

const dialogEyebrow = computed(() => {
  if (!feedbackState.dialog) return ''
  if (feedbackState.dialog.kind === 'prompt') return 'Input'
  if (feedbackState.dialog.kind === 'alert') return 'Message'
  return feedbackState.dialog.dangerous ? 'Destructive action' : 'Confirmation'
})

watch(
  () => feedbackState.dialog?.id,
  async () => {
    await nextTick()
    if (dialogInput.value) {
      dialogInput.value.focus()
      return
    }
    dialogPanel.value?.focus()
  }
)

function confirmActiveDialog() {
  const dialog = feedbackState.dialog
  if (!dialog) return

  if (dialog.kind === 'prompt') {
    resolveDialog(dialog.inputValue)
    return
  }

  resolveDialog(true)
}
</script>

<style scoped>
.system-toast-region {
  position: fixed;
  top: 22px;
  right: 22px;
  z-index: 5000;
  display: grid;
  gap: 10px;
  width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}

.system-toast {
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 58px;
  padding: 12px 12px 12px 0;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
  pointer-events: auto;
}

.toast-rail {
  align-self: stretch;
  width: 4px;
  height: 100%;
  min-height: 34px;
  border-radius: 0 999px 999px 0;
  background: #0f172a;
}

.system-toast.success .toast-rail,
.system-toast.info .toast-rail,
.system-toast.warning .toast-rail,
.system-toast.error .toast-rail {
  background: #0f172a;
}

.toast-copy {
  min-width: 0;
}

.toast-copy strong {
  display: block;
  margin-bottom: 2px;
  font-size: 0.84rem;
  font-weight: 900;
}

.toast-copy p {
  margin: 0;
  color: #475569;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.45;
}

.toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border: 1px solid #d8dee9;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  font-family: inherit;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  box-shadow: none;
  appearance: none;
}

.toast-close svg {
  display: block;
  width: 15px;
  height: 15px;
}

.toast-close path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
}

.toast-close:hover {
  border-color: #94a3b8;
  color: #0f172a;
  background: #f8fafc;
}

.system-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 4990;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(3px);
}

.system-dialog {
  width: min(460px, 100%);
  border: 1px solid #d8dee9;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.dialog-header {
  padding: 20px 22px 0;
}

.dialog-eyebrow {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dialog-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.12rem;
  font-weight: 900;
}

.dialog-message {
  margin: 12px 22px 0;
  color: #475569;
  font-size: 0.94rem;
  font-weight: 700;
  line-height: 1.55;
  white-space: pre-line;
}

.dialog-input-row {
  display: grid;
  gap: 8px;
  margin: 18px 22px 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.dialog-input-row input {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 0.92rem;
  outline: none;
}

.dialog-input-row input:focus {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 22px 22px;
}

.dialog-btn {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 7px;
  font-size: 0.84rem;
  font-weight: 900;
  cursor: pointer;
}

.dialog-btn.ghost {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.dialog-btn.primary {
  border: 1px solid #0f172a;
  background: #0f172a;
  color: #ffffff;
}

.dialog-btn.ghost:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}

.dialog-btn.primary:hover {
  background: #111827;
}

.system-toast-enter-active,
.system-toast-leave-active,
.system-dialog-enter-active,
.system-dialog-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.system-toast-enter-from,
.system-toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.system-dialog-enter-from,
.system-dialog-leave-to {
  opacity: 0;
}

.system-dialog-enter-from .system-dialog,
.system-dialog-leave-to .system-dialog {
  transform: translateY(8px);
}
</style>
