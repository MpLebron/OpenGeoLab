import { reactive } from 'vue'

let toastId = 0
let dialogId = 0

export const feedbackState = reactive({
  toasts: [],
  dialog: null
})

export function normalizeFeedbackType(type = 'info') {
  return ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info'
}

export function makeFeedbackMessage(message, fallback = 'Something happened.') {
  return String(message || fallback).trim()
}

export function notify(message, type = 'info', options = {}) {
  const duration = Number.isFinite(options.duration) ? options.duration : 3600
  const toast = {
    id: ++toastId,
    message: makeFeedbackMessage(message),
    type: normalizeFeedbackType(type),
    title: options.title || ''
  }

  feedbackState.toasts.push(toast)

  if (duration > 0) {
    globalThis.setTimeout?.(() => dismissToast(toast.id), duration)
  }

  return toast.id
}

export function dismissToast(id) {
  const index = feedbackState.toasts.findIndex(toast => toast.id === id)
  if (index >= 0) {
    feedbackState.toasts.splice(index, 1)
  }
}

function openDialog(config) {
  if (feedbackState.dialog?.resolve) {
    feedbackState.dialog.resolve(config.kind === 'prompt' ? null : false)
  }

  return new Promise(resolve => {
    feedbackState.dialog = {
      id: ++dialogId,
      kind: config.kind,
      title: config.title || defaultDialogTitle(config.kind),
      message: makeFeedbackMessage(config.message, ''),
      confirmText: config.confirmText || (config.kind === 'prompt' ? 'Save' : 'Confirm'),
      cancelText: config.cancelText || 'Cancel',
      inputLabel: config.inputLabel || '',
      inputValue: config.defaultValue || '',
      placeholder: config.placeholder || '',
      dangerous: Boolean(config.dangerous),
      resolve
    }
  })
}

function defaultDialogTitle(kind) {
  if (kind === 'prompt') return 'Input Required'
  if (kind === 'alert') return 'Notice'
  return 'Confirm Action'
}

export function confirmDialog(messageOrConfig, maybeConfig = {}) {
  const config = typeof messageOrConfig === 'string'
    ? { ...maybeConfig, message: messageOrConfig }
    : { ...(messageOrConfig || {}) }

  return openDialog({ ...config, kind: 'confirm' })
}

export function promptDialog(messageOrConfig, maybeConfig = {}) {
  const config = typeof messageOrConfig === 'string'
    ? { ...maybeConfig, message: messageOrConfig }
    : { ...(messageOrConfig || {}) }

  return openDialog({ ...config, kind: 'prompt' })
}

export function alertDialog(messageOrConfig, maybeConfig = {}) {
  const config = typeof messageOrConfig === 'string'
    ? { ...maybeConfig, message: messageOrConfig }
    : { ...(messageOrConfig || {}) }

  return openDialog({ ...config, kind: 'alert', cancelText: '' })
}

export function resolveDialog(value) {
  const dialog = feedbackState.dialog
  if (!dialog) return

  feedbackState.dialog = null
  dialog.resolve(value)
}

export function cancelDialog() {
  const dialog = feedbackState.dialog
  if (!dialog) return

  feedbackState.dialog = null
  dialog.resolve(dialog.kind === 'prompt' ? null : false)
}
