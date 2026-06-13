export function buildCaseListParams({ page = 1, limit = 120, now = Date.now } = {}) {
  return {
    page,
    limit,
    _: now()
  }
}
