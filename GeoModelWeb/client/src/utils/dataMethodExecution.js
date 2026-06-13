function cleanValue(value) {
  return String(value || '').trim()
}

export function getDataMethodExecutionId(method = {}) {
  return method.id ?? method.methodId ?? method.modelId ?? cleanValue(method.name)
}

export function buildDataMethodRunRequest(method = {}, inputs = {}) {
  return {
    modelId: getDataMethodExecutionId(method),
    inputs
  }
}
