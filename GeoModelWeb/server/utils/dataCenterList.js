const DEFAULT_DATA_CENTER_WEB_HOST = 'https://geomodeling.njnu.edu.cn'

function normalizeDataCenterSourceUrl(value, webHost = DEFAULT_DATA_CENTER_WEB_HOST) {
  const source = String(value || '').trim()
  if (!source) {
    return ''
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source
  }

  if (source.startsWith('/')) {
    return `${webHost}${source}`
  }

  return ''
}

function resolveDataCenterSourceUrl(item = {}, options = {}) {
  const webHost = options.webHost || DEFAULT_DATA_CENTER_WEB_HOST
  const subItems = Array.isArray(item.subDataItems) ? item.subDataItems : []
  const candidates = [
    item.dataContainerUrl,
    item.fileWebAddress,
    item.sourceUrl,
    ...subItems.flatMap(subItem => [
      subItem.dataContainerUrl,
      subItem.fileWebAddress,
      subItem.sourceUrl
    ])
  ]

  for (const candidate of candidates) {
    const sourceUrl = normalizeDataCenterSourceUrl(candidate, webHost)
    if (sourceUrl) {
      return sourceUrl
    }
  }

  return ''
}

function hasDataCenterSourceLink(item = {}, options = {}) {
  return Boolean(resolveDataCenterSourceUrl(item, options))
}

function buildDataCenterListCacheKey(params = {}) {
  return JSON.stringify({
    asc: Boolean(params.asc),
    searchText: params.searchText || '',
    sortField: params.sortField || 'createTime',
    tagClass: params.tagClass || 'problemTags',
    tagName: params.tagName || ''
  })
}

function paginateDataCenterContent(content, page, pageSize, options = {}) {
  const requestedPageSize = Math.max(1, Number.parseInt(pageSize, 10) || 18)
  const filteredContent = Array.isArray(content)
    ? content.filter(item => hasDataCenterSourceLink(item, options))
    : []
  const totalElements = filteredContent.length
  const totalPages = Math.max(1, Math.ceil(totalElements / requestedPageSize))
  const safePage = Math.min(Math.max(1, Number.parseInt(page, 10) || 1), totalPages)
  const start = (safePage - 1) * requestedPageSize
  const pageContent = filteredContent.slice(start, start + requestedPageSize)

  return {
    content: pageContent,
    page: safePage,
    pageSize: requestedPageSize,
    totalElements,
    totalPages,
    number: safePage - 1,
    size: requestedPageSize,
    numberOfElements: pageContent.length,
    first: safePage === 1,
    last: safePage === totalPages,
    empty: pageContent.length === 0
  }
}

module.exports = {
  buildDataCenterListCacheKey,
  hasDataCenterSourceLink,
  normalizeDataCenterSourceUrl,
  paginateDataCenterContent,
  resolveDataCenterSourceUrl
}
