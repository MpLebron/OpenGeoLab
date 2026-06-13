import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cancelDialog,
  confirmDialog,
  dismissToast,
  feedbackState,
  notify,
  resolveDialog
} from '../src/utils/systemFeedback.js'

function resetFeedbackState() {
  feedbackState.toasts.splice(0)
  feedbackState.dialog = null
}

test('notify creates dismissible system toasts without requiring window', () => {
  resetFeedbackState()

  const toastId = notify('Saved', 'success', { duration: 1 })

  assert.equal(feedbackState.toasts.length, 1)
  assert.equal(feedbackState.toasts[0].id, toastId)
  assert.equal(feedbackState.toasts[0].message, 'Saved')
  assert.equal(feedbackState.toasts[0].type, 'success')

  dismissToast(toastId)
  assert.equal(feedbackState.toasts.length, 0)
})

test('confirm dialog resolves through the shared dialog state', async () => {
  resetFeedbackState()

  const confirmation = confirmDialog({
    title: 'Delete project',
    message: 'Delete this project?',
    confirmText: 'Delete'
  })

  assert.equal(feedbackState.dialog.kind, 'confirm')
  assert.equal(feedbackState.dialog.title, 'Delete project')

  resolveDialog(true)
  assert.equal(await confirmation, true)
  assert.equal(feedbackState.dialog, null)
})

test('canceling confirm dialog resolves false', async () => {
  resetFeedbackState()

  const confirmation = confirmDialog('Continue?')
  cancelDialog()

  assert.equal(await confirmation, false)
})
