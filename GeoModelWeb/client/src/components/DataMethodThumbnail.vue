<template>
  <div class="method-thumbnail" :class="`motif-${thumbnail.motif}`" aria-hidden="true">
    <svg viewBox="0 0 72 72" role="img" focusable="false">
      <defs>
        <clipPath :id="clipId">
          <rect x="0.75" y="0.75" width="70.5" height="70.5" rx="7" ry="7" />
        </clipPath>
      </defs>
      <rect class="thumb-bg" x="0.75" y="0.75" width="70.5" height="70.5" rx="7" ry="7" />
      <g :clip-path="`url(#${clipId})`">
        <ellipse
          v-for="blob in backgroundBlobs"
          :key="blob.key"
          class="color-field"
          :cx="blob.x"
          :cy="blob.y"
          :rx="blob.rx"
          :ry="blob.ry"
          :fill="blob.fill"
          :opacity="blob.opacity"
          :transform="`rotate(${blob.rotate} ${blob.x} ${blob.y})`"
        />
        <path class="soft-veil" :d="veilPath" />
        <path
          v-for="line in baseLines"
          :key="line"
          class="thumb-field-line"
          :d="line"
        />
        <rect class="symbol-plate" x="13.5" y="13.5" width="45" height="45" rx="13" />

        <g v-if="thumbnail.motif === 'raster'" class="motif-shape">
          <rect
            v-for="cell in rasterCells"
            :key="cell.key"
            :x="cell.x"
            :y="cell.y"
            :width="cell.size"
            :height="cell.size"
            rx="1.6"
            :fill="cell.fill"
            :opacity="cell.opacity"
          />
          <path class="thumb-stroke strong" :stroke="thumbnail.ink" d="M23 45.5h26" />
        </g>

        <g v-else-if="thumbnail.motif === 'flow'" class="motif-shape">
          <path
            v-for="flow in flowPaths"
            :key="flow.key"
            class="thumb-stroke"
            :class="{ strong: flow.strong }"
            :stroke="flow.strong ? thumbnail.ink : thumbnail.accent"
            :d="flow.d"
          />
          <circle
            v-for="node in flowNodes"
            :key="node.key"
            :cx="node.x"
            :cy="node.y"
            :r="node.r"
            :fill="node.fill"
          />
        </g>

        <g v-else-if="thumbnail.motif === 'points'" class="motif-shape">
          <path class="thumb-stroke strong" :stroke="thumbnail.ink" :d="pointCloudPath" />
          <circle
            v-for="point in pointCloud"
            :key="point.key"
            :cx="point.x"
            :cy="point.y"
            :r="point.r"
            :fill="point.fill"
            :opacity="point.opacity"
          />
        </g>

        <g v-else-if="thumbnail.motif === 'layers'" class="motif-shape">
          <path
            v-for="layer in layerShapes"
            :key="layer.key"
            :d="layer.d"
            :fill="layer.fill"
            :stroke="layer.stroke"
            stroke-width="1.4"
            stroke-linejoin="round"
            :opacity="layer.opacity"
          />
        </g>

        <g v-else-if="thumbnail.motif === 'stats'" class="motif-shape">
          <rect
            v-for="bar in statBars"
            :key="bar.key"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            rx="2"
            :fill="bar.fill"
          />
          <path class="thumb-stroke strong" :stroke="thumbnail.ink" :d="statCurve" />
          <circle :cx="52" :cy="22 + thumbnail.offset" r="3" :fill="thumbnail.warm" />
        </g>

        <g v-else-if="thumbnail.motif === 'mesh'" class="motif-shape">
          <path
            v-for="edge in meshEdges"
            :key="edge.key"
            class="thumb-stroke"
            :stroke="edge.strong ? thumbnail.ink : thumbnail.accent"
            :d="edge.d"
            :opacity="edge.strong ? 0.9 : 0.52"
          />
          <circle
            v-for="node in meshNodes"
            :key="node.key"
            :cx="node.x"
            :cy="node.y"
            :r="node.r"
            :fill="node.fill"
            :stroke="node.stroke"
            stroke-width="1.4"
          />
        </g>

        <g v-else class="motif-shape">
          <path class="thumb-stroke strong" :stroke="thumbnail.ink" :d="processLine" />
          <rect
            v-for="step in processSteps"
            :key="step.key"
            :x="step.x"
            :y="step.y"
            width="10"
            height="10"
            rx="3"
            :fill="step.fill"
            :stroke="step.stroke"
            stroke-width="1.3"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'

const props = defineProps({
  method: {
    type: Object,
    required: true
  }
})

const instance = getCurrentInstance()
const clipId = `method-thumb-clip-${instance?.uid ?? hashString(Math.random().toString())}`

const palettes = [
  {
    bg: '#f6fbf7',
    fieldA: '#86d68a',
    fieldB: '#b8eef2',
    fieldC: '#f5d26c',
    accent: '#128f86',
    secondary: '#75aec7',
    warm: '#d79a37',
    soft: '#f3fbf7',
    ink: '#111a1f'
  },
  {
    bg: '#f4fbff',
    fieldA: '#31b8f2',
    fieldB: '#7ad7e0',
    fieldC: '#8fc9ff',
    accent: '#287cad',
    secondary: '#8abbd0',
    warm: '#c6945d',
    soft: '#f2f9fc',
    ink: '#101820'
  },
  {
    bg: '#fff8cf',
    fieldA: '#f8df72',
    fieldB: '#98d8bd',
    fieldC: '#f3a76c',
    accent: '#6d8c63',
    secondary: '#b3c3a3',
    warm: '#d28a40',
    soft: '#fff8dc',
    ink: '#191915'
  },
  {
    bg: '#f7fbff',
    fieldA: '#9bc8ff',
    fieldB: '#cedcff',
    fieldC: '#ffb7a2',
    accent: '#4f75a7',
    secondary: '#aabfd2',
    warm: '#cc8666',
    soft: '#f4f8fe',
    ink: '#121822'
  },
  {
    bg: '#fff5fb',
    fieldA: '#ee9fd4',
    fieldB: '#a7d7ff',
    fieldC: '#f4b24d',
    accent: '#8b6aa5',
    secondary: '#b6a6ca',
    warm: '#de8e39',
    soft: '#fff6fb',
    ink: '#17151d'
  }
]

const keywordMotifs = [
  { motif: 'flow', words: ['hydro', 'flow', 'stream', 'watershed', 'basin', 'river', 'water', 'drainage'] },
  { motif: 'points', words: ['lidar', 'point', 'cloud', 'nearest', 'coordinate', 'sample'] },
  { motif: 'layers', words: ['overlay', 'clip', 'buffer', 'vector', 'polygon', 'line', 'boundary', 'feature'] },
  { motif: 'raster', words: ['raster', 'image', 'grid', 'cell', 'slope', 'elevation', 'dem', 'terrain'] },
  { motif: 'stats', words: ['math', 'stats', 'value', 'filter', 'index', 'ratio', 'mean', 'regression', 'classification'] },
  { motif: 'mesh', words: ['mesh', 'network', 'graph', 'connect', 'data', 'resource', 'relation'] }
]

const sourceText = computed(() => [
  props.method.id,
  props.method.name,
  props.method.description,
  props.method.longDescription,
  props.method.engine,
  props.method.methodType,
  ...(Array.isArray(props.method.tags) ? props.method.tags : []),
  ...(Array.isArray(props.method.inputKinds) ? props.method.inputKinds : []),
  ...(Array.isArray(props.method.outputKinds) ? props.method.outputKinds : [])
].filter(Boolean).join(' ').toLowerCase())

const seed = computed(() => hashString(sourceText.value || 'data-method'))

const thumbnail = computed(() => {
  const palette = palettes[seed.value % palettes.length]
  return {
    ...palette,
    motif: pickMotif(sourceText.value, seed.value),
    offset: (seed.value % 7) - 3
  }
})

const baseLines = computed(() => {
  const n = seed.value % 5
  return [
    `M13 ${22 + n}h46`,
    `M13 ${47 - n}h46`,
    `M${24 + n} 13v46`,
    `M${49 - n} 13v46`
  ]
})

const backgroundBlobs = computed(() => {
  const random = seededRandom(seed.value + 193)
  const palette = thumbnail.value
  const fields = [palette.fieldA, palette.fieldB, palette.fieldC]
  return fields.map((fill, index) => ({
    key: `field-${index}`,
    x: Number((18 + random() * 44).toFixed(1)),
    y: Number((14 + random() * 44).toFixed(1)),
    rx: Number((17 + random() * 18).toFixed(1)),
    ry: Number((12 + random() * 22).toFixed(1)),
    rotate: Math.round(-35 + random() * 70),
    fill,
    opacity: [0.8, 0.58, 0.5][index]
  }))
})

const veilPath = computed(() => {
  const shift = thumbnail.value.offset
  return `M-4 ${49 + shift}C12 ${35 - shift} 23 ${49 + shift} 39 ${31 - shift}C51 ${18 + shift} 64 ${20 - shift} 77 ${7}V76H-4Z`
})

const rasterCells = computed(() => {
  const cells = []
  const size = 8
  const baseX = 19
  const baseY = 18
  const activeA = seed.value % 9
  const activeB = Math.floor(seed.value / 7) % 9
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const index = row * 3 + col
      const active = index === activeA || index === activeB || index === 4
      cells.push({
        key: `${row}-${col}`,
        x: baseX + col * 10,
        y: baseY + row * 10,
        size,
        fill: active ? thumbnail.value.ink : 'rgba(255, 255, 255, 0.72)',
        opacity: active ? 0.82 : 0.72
      })
    }
  }
  return cells
})

const flowPaths = computed(() => {
  const shift = thumbnail.value.offset
  return [
    { key: 'main', strong: true, d: `M16 ${25 + shift}C28 ${18 - shift} 33 ${35 + shift} 46 ${29 - shift}C51 ${27 - shift} 55 ${24 + shift} 58 ${18}` },
    { key: 'lower', strong: false, d: `M14 ${44 - shift}C26 ${38 + shift} 34 ${49 - shift} 58 ${38 + shift}` },
    { key: 'branch', strong: false, d: `M26 ${25 + shift}C30 ${30} 34 ${32} 39 ${36}` }
  ]
})

const flowNodes = computed(() => [
  { key: 'a', x: 16, y: 25 + thumbnail.value.offset, r: 3, fill: thumbnail.value.ink },
  { key: 'b', x: 39, y: 36, r: 2.5, fill: thumbnail.value.warm },
  { key: 'c', x: 58, y: 38 + thumbnail.value.offset, r: 3, fill: '#fffdf7' }
])

const pointCloud = computed(() => {
  const random = seededRandom(seed.value)
  return Array.from({ length: 18 }, (_, index) => {
    const x = 18 + random() * 36
    const y = 18 + random() * 34
    const focus = index % 6 === seed.value % 6
    return {
      key: `p-${index}`,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      r: focus ? 2.2 : 1.35,
      fill: focus ? thumbnail.value.ink : thumbnail.value.accent,
      opacity: focus ? 0.9 : 0.56
    }
  })
})

const pointCloudPath = computed(() => {
  const shift = thumbnail.value.offset
  return `M15 ${48 + shift}C25 ${39 - shift} 32 ${42 + shift} 39 ${31}C45 ${22} 52 ${26 + shift} 58 ${19}`
})

const layerShapes = computed(() => {
  const shift = thumbnail.value.offset
  return [
    { key: 'back', fill: 'rgba(255, 255, 255, 0.42)', stroke: thumbnail.value.secondary, opacity: 0.82, d: `M18 ${25 + shift}l17 -7 19 8 -17 8z` },
    { key: 'mid', fill: 'rgba(255, 255, 255, 0.62)', stroke: thumbnail.value.secondary, opacity: 0.95, d: `M18 ${36 + shift}l17 -7 19 8 -17 8z` },
    { key: 'front', fill: 'rgba(255, 255, 255, 0.78)', stroke: thumbnail.value.ink, opacity: 1, d: `M18 ${47 + shift}l17 -7 19 8 -17 8z` }
  ]
})

const statBars = computed(() => {
  const values = [18, 27, 13, 31].map((value, index) => value + ((seed.value >> index) % 6) - 3)
  return values.map((height, index) => ({
    key: `bar-${index}`,
    x: 18 + index * 8,
    y: 48 - height,
    width: 4.8,
    height,
    fill: index === 2 ? thumbnail.value.ink : thumbnail.value.accent
  }))
})

const statCurve = computed(() => {
  const shift = thumbnail.value.offset
  return `M16 ${43 - shift}C26 ${31 + shift} 34 ${37 - shift} 42 ${26 + shift}C47 ${19} 53 ${22 + shift} 58 ${16}`
})

const meshNodes = computed(() => {
  const random = seededRandom(seed.value + 31)
  const positions = [
    [18, 22],
    [33, 18],
    [51, 24],
    [24, 44],
    [43, 42],
    [56, 52]
  ]
  return positions.map(([x, y], index) => {
    const dx = Math.round((random() - 0.5) * 5)
    const dy = Math.round((random() - 0.5) * 5)
    const primary = index === seed.value % positions.length
    return {
      key: `node-${index}`,
      x: x + dx,
      y: y + dy,
      r: primary ? 4.4 : 3.3,
      fill: primary ? thumbnail.value.ink : 'rgba(255, 255, 255, 0.8)',
      stroke: primary ? thumbnail.value.ink : thumbnail.value.accent
    }
  })
})

const meshEdges = computed(() => {
  const nodes = meshNodes.value
  const pairs = [[0, 1], [1, 2], [0, 3], [3, 4], [2, 4], [4, 5]]
  return pairs.map(([a, b], index) => ({
    key: `edge-${index}`,
    strong: index === seed.value % pairs.length,
    d: `M${nodes[a].x} ${nodes[a].y}L${nodes[b].x} ${nodes[b].y}`
  }))
})

const processSteps = computed(() => {
  const colors = ['rgba(255, 255, 255, 0.82)', 'rgba(255, 255, 255, 0.54)', 'rgba(255, 255, 255, 0.82)']
  return [
    { key: 'input', x: 17, y: 30 + thumbnail.value.offset, fill: colors[0], stroke: thumbnail.value.secondary },
    { key: 'run', x: 31, y: 30 - thumbnail.value.offset, fill: colors[1], stroke: thumbnail.value.accent },
    { key: 'output', x: 45, y: 30 + thumbnail.value.offset, fill: colors[2], stroke: thumbnail.value.secondary }
  ]
})

const processLine = computed(() => {
  const shift = thumbnail.value.offset
  return `M22 ${35 + shift}H34M40 ${35 - shift}H50`
})

function pickMotif(text, value) {
  const found = keywordMotifs.find(group => group.words.some(word => text.includes(word)))
  if (found) return found.motif
  const fallback = ['raster', 'layers', 'stats', 'mesh', 'flow', 'process']
  return fallback[value % fallback.length]
}

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(initialSeed) {
  let state = initialSeed >>> 0
  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return ((state >>> 0) / 4294967296)
  }
}
</script>

<style scoped>
.method-thumbnail {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #f7fafb;
  flex: 0 0 auto;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}

.method-thumbnail svg {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.thumb-bg {
  fill: v-bind('thumbnail.bg');
  stroke: rgba(181, 196, 207, 0.62);
  stroke-width: 1.1;
}

.color-field {
  filter: blur(8px);
  transform-origin: center;
}

.soft-veil {
  fill: rgba(255, 255, 255, 0.34);
  filter: blur(4px);
}

.symbol-plate {
  fill: rgba(255, 255, 255, 0.34);
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 0.8;
}

.thumb-field-line {
  fill: none;
  stroke: rgba(255, 255, 255, 0.42);
  stroke-width: 0.7;
  opacity: 0.5;
}

.motif-shape {
  transform-origin: center;
}

.thumb-stroke {
  fill: none;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.9;
}

.thumb-stroke.strong {
  stroke-width: 2;
}

.method-thumbnail:hover .motif-shape {
  transform: translateY(-0.8px);
}

.method-thumbnail:hover .color-field {
  opacity: 0.86;
}
</style>
