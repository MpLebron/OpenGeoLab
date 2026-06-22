const IDENTICON_PALETTE = [
  '#0969da',
  '#1f883d',
  '#bf8700',
  '#cf222e',
  '#8250df',
  '#0a7ea4',
  '#9a6700',
  '#57606a'
]

function hashString(value = '') {
  let hash = 2166136261
  const source = String(value || 'opengeolab-user')

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function nextValue(seed) {
  return Math.imul(seed, 1664525) + 1013904223 >>> 0
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildGithubStyleIdenticonDataUri(seed = 'OpenGeoLab') {
  const label = String(seed || 'OpenGeoLab').trim() || 'OpenGeoLab'
  let state = hashString(label.toLowerCase())
  const color = IDENTICON_PALETTE[state % IDENTICON_PALETTE.length]
  const cells = []
  const cellSize = 11
  const gap = 3
  const offset = 9

  for (let row = 0; row < 5; row += 1) {
    const rowCells = []
    for (let col = 0; col < 3; col += 1) {
      state = nextValue(state)
      rowCells[col] = (state & 1) === 1
    }

    const mirrored = [rowCells[0], rowCells[1], rowCells[2], rowCells[1], rowCells[0]]
    mirrored.forEach((active, col) => {
      if (!active) return
      cells.push(
        `<rect x="${offset + col * (cellSize + gap)}" y="${offset + row * (cellSize + gap)}" width="${cellSize}" height="${cellSize}" rx="2" />`
      )
    })
  }

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" role="img" aria-label="${escapeXml(label)} identicon">`,
    '<rect width="80" height="80" rx="16" fill="#f6f8fa" />',
    `<g fill="${color}">`,
    cells.join(''),
    '</g>',
    '</svg>'
  ].join('')

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
